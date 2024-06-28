import { API_BASE_URL } from "@/config";

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
  const formData = new FormData();
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");

  console.log("inside getEmbeddingsFromAPI()");
  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }
  ctx.putImageData(imageData, 0, 0);
  console.log("ImageData put on canvas");

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to create Blob from ImageData"));
      }
    }, "image/jpeg");
  });

  if (!blob) {
    throw new Error("Failed to create Blob from ImageData");
  }

  formData.append("file", blob, "image.jpg");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/process-image/`);
    xhr.setRequestHeader("Content-Type", "multipart/form-data");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded * 100) / event.total);
        setProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        resolve({
          recognitionResults: response.recognition,
          recognitionSimilarities: response.similarities,
        });
      } else {
        reject(new Error(`HTTP error! status: ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error occurred"));
    };

    xhr.send(formData);
  });
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
