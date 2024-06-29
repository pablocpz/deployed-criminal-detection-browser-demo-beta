import { API_BASE_URL } from "@/config";
import axios from 'axios';

// const THRESHOLD_1 = 0.8; // Threshold for similarity acceptance

/**
 * Fetches embeddings for a given image from a remote API.
 */
export async function getRecognitionsFromAPI(
  imageData: ImageData,
  setProgress: (progress: number) => void,
  confidence_threshold: number,
): Promise<{
  recognitionResults: string[];
  recognitionSimilarities: number[];
}> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }
  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to create Blob from ImageData"));
      }
    }, "image/jpeg");
  });

  const formData = new FormData();
  formData.append("file", blob, "image.jpg");
  formData.append("confidence_threshold", confidence_threshold.toString());

  try {
    const response = await axios.post(`${API_BASE_URL}/process-image/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(progress);
        }
      },
      timeout: 300000, // 5 minutes timeout
    });

    return {
      recognitionResults: response.data.recognition,
      recognitionSimilarities: response.data.similarities,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error:', error.response?.data || error.message);
      if (error.response?.status === 502) {
        throw new Error("The server is currently busy. Please try again in a few moments.");
      } else {
        throw new Error(`Server error: ${error.response?.status}. Please try again later.`);
      }
    } else {
      console.error('Unexpected error:', error);
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }
}

// /**
//  * Computes the cosine similarity between two embeddings.
//  */
// function computeSimilarity(
//   embedding1: tf.Tensor,
//   embedding2: tf.Tensor,
// ): number {
//   return tf.losses.cosineDistance(embedding1, embedding2, 0).dataSync()[0];
// }

// export { getRecognitionsFromAPI as getEmbeddingsFromAPI, computeSimilarity, THRESHOLD_1 };
