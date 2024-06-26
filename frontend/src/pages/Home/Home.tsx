import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DetectedCriminal from "@/types/detectedCriminal";
import Criminal from "@/types/criminal";
import ProgressBar from "@/components/ProgressBar";
import "./Home.css";
import { API_BASE_URL } from "@/config";
import axios from "axios";
import { detect } from "@/lib/detection";
import { urlToImageData } from "@/utils/imageConversion";

const Home = () => {
  const [detectedObjects, setDetectedObjects] = useState<DetectedCriminal[]>(
    [],
  );
  const [uploadedImageData, setUploadedImageData] = useState<ImageData | null>(
    null,
  );
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [criminals, setCriminals] = useState<Criminal[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [mode, setMode] = useState<"image" | "video">("image");
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imagesLoadingProgress, setImagesLoadingProgress] = useState(0);
  const [localImageLoadingProgress, setLocalImageLoadingProgress] = useState(0);

  useEffect(() => {
    console.log("Fetching images...");
    setImagesLoadingProgress(0);
    fetch(`${API_BASE_URL}/get-images/`, { credentials: 'include' })
      .then(response => {
        console.log("Images response received:", response.status);
        setImagesLoadingProgress(50);
        return response.json();
      })
      .then(data => {
        console.log("Images data received:", data);
        if (data.images) {
          setImages(data.images);
          setImagesLoadingProgress(100);
        } else {
          setError('Failed to load images');
        }
      })
      .catch(error => {
        console.error('Error fetching images:', error);
        setError(`Error fetching images: ${error instanceof Error ? error.message : String(error)}`);
        setImagesLoadingProgress(0);
      });
  }, []);

  useEffect(() => {
    console.log("Fetching criminals...");
    fetch(`${API_BASE_URL}/list-criminals/`, { credentials: 'include' })
      .then(response => {
        console.log("Criminals response received:", response.status);
        return response.json();
      })
      .then(data => {
        console.log("Criminals data received:", data);
        setCriminals(data);
      })
      .catch(error => {
        console.error("Error loading criminals:", error);
        setError(`Error loading criminals: ${error instanceof Error ? error.message : String(error)}`);
      });
  }, []);

  useEffect(() => {
    const loadAndDetect = async () => {
      if (criminals.length > 0 && uploadedImageData) {
        setLoading(true);
        setProgress(0);

        try {
          console.log("loading and detecting");
          const detected_criminals: DetectedCriminal[] = await detect(
            uploadedImageData,
            setProgress,
            confidenceThreshold,
          );
          console.log("detected criminals", detected_criminals);

          setDetectedObjects(detected_criminals);
          setProgress(100);
          navigate("/results", {
            state: { detected_criminals, progress: 100, uploadedImageUrl },
          });
        } catch (error) {
          console.error("Error in loadAndDetect:", error);
          setError(`Error detecting criminals: ${error instanceof Error ? error.message : String(error)}`);
          setProgress(0);
        } finally {
          setLoading(false);
        }
      }
    };

    loadAndDetect();
  }, [uploadedImageData, criminals, navigate, confidenceThreshold]);

  const handleImageSelect = async (imageBase64: string) => {
    setLoading(true);
    setProgress(0);

    try {
      const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "selected_image.jpg", {
        type: "image/jpeg",
      });

      const url = URL.createObjectURL(file);
      setUploadedImageUrl(url);

      console.log("inside!");
      const img = new Image();
      img.src = url;

      img.onload = async () => {
        try {
          const imageData = await urlToImageData(url);
          setUploadedImageData(imageData);

          // Call detect function here
          const detected_criminals = await detect(
            imageData,
            setProgress,
            confidenceThreshold,
          );
          setDetectedObjects(detected_criminals);
          navigate("/results", {
            state: { detected_criminals, progress: 100, uploadedImageUrl: url },
          });
        } catch (error) {
          console.error(
            "Error converting image to ImageData or detecting criminals:",
            error
          );
          setError(`Error processing image: ${error instanceof Error ? error.message : String(error)}`);
          setLoading(false);
        }
      };

      img.onerror = (error) => {
        console.error("Error loading image:", error);
        setError("Error loading image");
      };
    } catch (error) {
      console.error("Error selecting image:", error);
      setError(`Error selecting image: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setLoading(true);
      setProgress(0);
      setError(null);
      setLocalImageLoadingProgress(0);

      try {
        setLocalImageLoadingProgress(25);
        const imageData = await urlToImageData(URL.createObjectURL(file));
        setUploadedImageData(imageData);
        setUploadedImageUrl(URL.createObjectURL(file));
        setLocalImageLoadingProgress(50);

        const detected_criminals = await detect(
          imageData,
          setProgress,
          confidenceThreshold,
        );
        setDetectedObjects(detected_criminals);
        setLocalImageLoadingProgress(100);
        navigate("/results", {
          state: {
            detected_criminals,
            progress: 100,
            uploadedImageUrl: URL.createObjectURL(file),
          },
        });
      } catch (error) {
        console.error("Error uploading and processing image:", error);
        setError(`Error processing image: ${error instanceof Error ? error.message : String(error)}`);
        setLocalImageLoadingProgress(0);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-8">
        <p className="text-lg text-center">
          <em>Note: This is a BETA</em> 🚀
          <span>Reach me out on <a href="https://twitter.com/pablocpz_ai" target="_blank" rel="noopener noreferrer">Twitter</a> or <a href="https://www.linkedin.com/in/pablo-cobo-b46a8128b/" target="_blank" rel="noopener noreferrer">LinkedIn</a></span>
        </p>
        <p className="text-lg text-center">
          Select an image to detect criminals.
        </p>
        {localImageLoadingProgress > 0 && localImageLoadingProgress < 100 && (
          <div className="w-full max-w-md h-1 bg-gray-200 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${localImageLoadingProgress}%` }}
            ></div>
          </div>
        )}
        <div className="container mx-auto px-4 max-w-6xl">
          {imagesLoadingProgress < 100 && (
            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${imagesLoadingProgress}%` }}
              ></div>
            </div>
          )}
          {error ? (
            <p className="text-red-500 text-center">{error}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  className="aspect-square overflow-hidden rounded-lg relative"
                >
                  <img
                    src={`data:image/jpeg;base64,${image}`}
                    alt={`Sample ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity duration-300">
                    {loading ? (
                      <div className="w-full px-4">
                        <p className="text-white text-center mb-2">
                          Processing...
                        </p>
                        <ProgressBar progress={progress} />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleImageSelect(image)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300"
                      >
                        Run Prediction
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="aspect-square overflow-hidden rounded-lg relative border-2 border-dashed border-gray-400 flex items-center justify-center">
                <label className="flex flex-col items-center justify-center cursor-pointer">
                  <span className="text-gray-400">Upload Image</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <button
                onClick={() => navigate("/criminals-grid")}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-300"
              >
                View Criminals Database
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-center space-x-3">
            <label className="flex items-center justify-center space-x-3 cursor-pointer">
              <span className="text-sm font-medium text-gray-300">Image</span>
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={mode === "video"}
                  onChange={() => setMode(mode === "image" ? "video" : "image")}
                />
                <div
                  className={`block w-14 h-8 rounded-full transition ${mode === "video" ? "bg-green-400" : "bg-gray-600"}`}
                ></div>
                <div
                  className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${mode === "video" ? "transform translate-x-6" : ""}`}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-300">Video</span>
            </label>
            {mode === "video" && (
              <span className="text-xs italic text-red-500 ml-2">
                Coming soon on the local version... 🚀
              </span>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <label
            htmlFor="confidenceSlider"
            className="block mb-2 font-semibold"
          >
            Confidence Threshold: {confidenceThreshold}
          </label>
          <input
            id="confidenceSlider"
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
            className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-4">
          {detectedObjects.map((obj, index) => (
            <div key={index} className="bg-gray-800 rounded-xl p-6 shadow-lg">
              <p>
                Detected {obj.criminal.name} with similarity {obj.similarity}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
