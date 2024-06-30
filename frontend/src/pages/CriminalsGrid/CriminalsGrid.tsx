import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Criminal from "@/types/criminal";
import "./CriminalsGrid.css";
import { API_BASE_URL } from "@/config";

const CriminalsGrid = () => {
  const [criminals, setCriminals] = useState<Criminal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCriminals = async () => {
      try {
        console.log("Fetching criminals...");
        const response = await fetch(`${API_BASE_URL}/list-criminals/`, {
          credentials: 'include'
        });
        const data = await response.json();
        console.log("Fetched criminals:", data);
        setCriminals(data);
      } catch (error) {
        console.error("Error fetching criminals:", error);
        setError("Error fetching criminals");
      }
    };

    fetchCriminals();
  }, []);

  return (
    <div className="criminals-grid-container">
      <h1 className="text-3xl font-bold text-white text-center mb-6">
        Criminals
      </h1>
      {error ? (
        <p className="text-red-500 text-center">{error}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {criminals.map((criminal, index) => (
            <div key={index} className="criminal-card">
              <h2 className="text-xl font-semibold text-center mb-2">
                {criminal.name}
              </h2>
              <div className="image-grid">
                {criminal.images.map((image, imgIndex) => (
                  <div key={imgIndex} className="image-container">
                    <img
                      src={`${API_BASE_URL}${image}`}
                      alt={`Criminal ${criminal.name}`}
                      className="criminal-image"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => navigate("/")}
        className="mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out"
      >
        Back to Home
      </button>
    </div>
  );
};

export default CriminalsGrid;
