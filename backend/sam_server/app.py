"""
This is the main file for the SAM model hosting server.
"""

import os
import sys
import logging
import ssl


# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Add the project root to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
sys.path.append(backend_dir)

logger.debug("Current directory: %s", current_dir)
logger.debug("Backend directory: %s", backend_dir)
logger.debug("Python path: %s", sys.path)

# Suppress TensorFlow INFO and WARNING messages
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

# Set environment variable to allow duplicate OpenMP runtime
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # Import StaticFiles
# from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware


# import torch
from PIL import Image
import io
import shutil

# import warnings
import numpy as np
import base64

from deepface import DeepFace
import pandas as pd

# try:
#     from mobile_sam.modeling.image_encoder import ImageEncoderViT
# except ImportError as e:
#     print(f"Error importing required libraries: {e}")
#     sys.exit(1)

app = FastAPI()

# ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
# ssl_context.load_cert_chain('cert.pem', keyfile='key.pem')

# app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://deployed-criminal-detection-v5.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_BASE_URL = os.environ.get("API_BASE_URL", "https://browser-demo-beta.xyz")

CRIMINAL_DATA_DIR = os.path.join(backend_dir, "criminal_data")
SAMPLE_IMAGES_DIR = os.path.join(backend_dir, "sample_images")

logger.debug("CRIMINAL_DATA_DIR: %s", CRIMINAL_DATA_DIR)
logger.debug("SAMPLE_IMAGES_DIR: %s", SAMPLE_IMAGES_DIR)

# Mount the criminal data directory to serve static files
app.mount(
    "/criminal_data", StaticFiles(directory=CRIMINAL_DATA_DIR), name="criminal_data"
)

# model = ImageEncoderViT()
# sam_encoder = CustomSam(image_encoder=model)
# device = "cuda" if torch.cuda.is_available() else "cpu"
# sam_encoder.to(device)


@app.post("/process-image/")
async def process_image(
    file: UploadFile = File(...), confidence_threshold: float = 0.5
):
    """
    Endpoint to process an uploaded image and return its embeddings.

    Args:
        file (UploadFile): The image file to be processed.
        confidence_threshold (float): The confidence threshold for face detection.

    Returns:
        JSONResponse: A JSON response containing the embeddings of the image or an error message.
    """
    try:
        logger.info("Starting image processing")
        image = Image.open(io.BytesIO(await file.read())).convert("RGB")
        logger.info("Image received and converted to RGB")

        # Convert the image to a numpy array
        x = np.array(image)
        logger.info(f"Image shape: {x.shape}")
        print("converted")
        print(x.shape)

        required_file = '/var/www/deployed-criminal-detection-browser-demo-beta/backend/criminal_data/ds_model_vggface_detector_opencv_unaligned_normalization_base_expand_0.pkl'
        if not os.path.exists(required_file):
            logger.error(f"Required file not found: {required_file}")
            return JSONResponse(content={"error": f"Required file not found: {required_file}"}, status_code=500)

        logger.info("Extracting faces from the input image")
        face_objs = DeepFace.extract_faces(
            img_path=x,
            detector_backend="yolov8",
            enforce_detection=True,
        )
        logger.info(f"Extracted {len(face_objs)} faces")

        print("this", face_objs)
        # returns a list of dictionaries, each one with face pixels, confidence, width. height...etc

        detected_faces = [
            face_objs[idx]["face"]
            for idx in range(0, len(face_objs))
            if face_objs[idx]["confidence"] > confidence_threshold
        ]

        # will be an empty list if there's no face detected

        # for each detected face, run verify() to know whether it is in the database

        recognition_results = [
            (
                DeepFace.find(
                    img_path=detected_faces[idx],
                    db_path=CRIMINAL_DATA_DIR,  # Use the CRIMINAL_DATA_DIR constant
                    enforce_detection=False,
                    distance_metric="cosine",
                    align=False,
                    model_name="VGG-Face",
                )
                if len(detected_faces) > 0
                else []
            )
            for idx in range(0, len(detected_faces))
        ]

        logger.info(f"Recognition results: {len(recognition_results)}")
        # the less distance, the more likely they are to be the same face

        empty_table = pd.DataFrame(
            columns=[
                "identity",
                "hash",
                "target_x",
                "target_y",
                "target_w",
                "target_h",
                "source_x",
                "source_y",
                "source_w",
                "source_h",
                "threshold",
                "distance",
            ]
        )

        print(recognition_results)

        recognition_results = [
            (
                pd.DataFrame(
                    result[0].query("distance == distance.min() & distance < threshold")
                )
                if len(result[0]) >= 0
                else empty_table
            )
            for result in recognition_results
        ]
        # we'll get a dataframe for each detected criminal
        # each dataframe has a property for the path to the criminal they think the input belongs
        # along with the euclidean L2 similarity and it's threshold (if value < threshold, = face)

        recognized_criminals = []
        recognized_similarities = []

        for result in recognition_results:
            if len(result) > 0 and not result.empty:
                identity = result.identity.iloc[0] if 'identity' in result.columns else ''
                criminal_name = identity.split("\\")[-2] if "\\" in identity else identity
                recognized_criminals.append(criminal_name)
                
                distance = result.distance.iloc[0] if 'distance' in result.columns else 1.0
                similarity = ((distance + 1) / 2) if distance != " " else 1.0
                recognized_similarities.append(similarity)
            else:
                recognized_criminals.append(" ")
                recognized_similarities.append(1.0)

        logger.info("Processing completed successfully")
        return JSONResponse(
            content={
                "recognition": recognized_criminals,
                "similarities": recognized_similarities,
            },
            status_code=200,
        )
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return JSONResponse(content={"error": f"Error processing image: {str(e)}"}, status_code=500)
    except IOError as e:
        logger.error(f"File error: {str(e)}")
        return JSONResponse(content={"error": f"File error: {str(e)}"}, status_code=400)
    except ValueError as e:
        logger.error(f"Data error: {str(e)}")
        return JSONResponse(content={"error": f"Data error: {str(e)}"}, status_code=400)
    except RuntimeError as e:
        logger.error(f"Model error: {str(e)}")
        return JSONResponse(
            content={"error": f"Model error: {str(e)}"}, status_code=500
        )


@app.post("/create-criminal/")
async def create_criminal(name: str = Form(...), files: list[UploadFile] = File(...)):
    """
    Endpoint to create a new criminal record with associated images.

    Args:
        name (str): The name of the criminal.
        files (list[UploadFile]): A list of image files associated with the criminal.

    Returns:
        JSONResponse: A JSON response indicating the success of the operation.
    """

    criminal_dir = os.path.join(CRIMINAL_DATA_DIR, name)

    if os.path.exists(criminal_dir):
        return JSONResponse(
            content={"message": f"Criminal {name} already exists"}, status_code=400
        )

    os.makedirs(criminal_dir, exist_ok=True)

    for file in files:
        file_path = os.path.join(criminal_dir, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())

    return JSONResponse(content={"message": f"Criminal {name} created successfully"})


@app.post("/delete-criminal/")
async def delete_criminal(name: str = Form(...)):
    """
    Endpoint to delete a criminal record.

    Args:
        name (str): The name of the criminal to be deleted.

    Returns:
        JSONResponse: A JSON response indicating the success or failure of the operation.
    """
    criminal_dir = os.path.join(CRIMINAL_DATA_DIR, name)
    if os.path.exists(criminal_dir):
        shutil.rmtree(criminal_dir)
        return JSONResponse(
            content={"message": f"Criminal {name} deleted successfully"}
        )
    else:
        return JSONResponse(
            content={"message": f"Criminal {name} not found"}, status_code=404
        )


@app.post("/edit-criminal/")
async def edit_criminal(name: str = Form(...), files: list[UploadFile] = File(...)):
    """
    Endpoint to edit an existing criminal record by adding or updating images.

    Args:
        name (str): The name of the criminal to be edited.
        files (list[UploadFile]): A list of image files to be added or updated.

    Returns:
        JSONResponse: A JSON response indicating the success or failure of the operation.
    """
    criminal_dir = os.path.join(CRIMINAL_DATA_DIR, name)
    if not os.path.exists(criminal_dir):
        return JSONResponse(
            content={"message": f"Criminal {name} not found"}, status_code=404
        )

    for file in files:
        file_path = os.path.join(criminal_dir, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())

    return JSONResponse(content={"message": f"Criminal {name} updated successfully"})


@app.get("/list-criminals/")
async def list_criminals():
    """
    Endpoint to list all criminals and their associated images.

    Returns:
        JSONResponse: A JSON response containing a list of criminals and their images.
    """
    if not os.path.exists(CRIMINAL_DATA_DIR):
        return JSONResponse(
            content={"error": "Criminal data directory does not exist"},
            status_code=404,
        )

    criminals = []
    for criminal_name in os.listdir(CRIMINAL_DATA_DIR):
        criminal_dir = os.path.join(CRIMINAL_DATA_DIR, criminal_name)
        if os.path.isdir(criminal_dir):
            images = [
                f"/criminal_data/{criminal_name}/{img}"  # os.path.join(criminal_dir, img)
                for img in os.listdir(criminal_dir)
                if img.endswith((".png", ".jpg", ".jpeg"))
            ]
            criminals.append({"name": criminal_name, "images": images})

    return JSONResponse(content=criminals)


@app.get("/criminal-images/{criminal_name}")
async def get_criminal_images(criminal_name: str):
    """
    Endpoint to get images for a given criminal name.

    Args:
        criminal_name (str): The name of the criminal.

    Returns:
        JSONResponse: A JSON response containing the list of image URLs.
    """
    criminal_dir = os.path.join(CRIMINAL_DATA_DIR, criminal_name)
    print(f"Received request for criminal: {criminal_name}")
    print(f"Looking for directory: {criminal_dir}")

    if not os.path.exists(criminal_dir):
        print(f"Directory not found for criminal: {criminal_name}")
        return JSONResponse(content={"error": "Criminal not found"}, status_code=404)

    images = []
    for filename in os.listdir(criminal_dir):
        if filename.lower().endswith((".png", ".jpg", ".jpeg")):
            images.append(f"/criminal_data/{criminal_name}/{filename}")

    return JSONResponse(content={"images": images}, status_code=200)


@app.get("/get-images/")
async def get_images():
    """
    Endpoint to get sample images for criminal detection.

    Returns:
        JSONResponse: A JSON response containing the list of sample image URLs.
    """
    logger.debug("Entering get_images endpoint")
    try:
        images = []
        logger.debug("SAMPLE_IMAGES_DIR: %s", SAMPLE_IMAGES_DIR)

        if not os.path.exists(SAMPLE_IMAGES_DIR):
            logger.error("SAMPLE_IMAGES_DIR does not exist: %s", SAMPLE_IMAGES_DIR)
            return JSONResponse(
                content={"error": "Sample images directory not found"},
                status_code=404,
            )

        for filename in os.listdir(SAMPLE_IMAGES_DIR):
            logger.debug("Processing file: %s", filename)
            if filename.lower().endswith((".png", ".jpg", ".jpeg")):
                file_path = os.path.join(SAMPLE_IMAGES_DIR, filename)
                logger.debug("Reading file: %s", file_path)
                with open(file_path, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode()
                    images.append(encoded_string)
                    logger.debug("Encoded image: %s", filename)

        logger.debug("Total images processed: %s", len(images))
        return JSONResponse(content={"images": images}, status_code=200)
    except IOError as e:
        logger.error("IOError in get_images: %s", str(e))
        return JSONResponse(content={"error": f"IO error: {str(e)}"}, status_code=500)
    except ValueError as e:
        logger.error("ValueError in get_images: %s", str(e))
        return JSONResponse(
            content={"error": f"Value error: {str(e)}"}, status_code=500
        )


@app.get("/")
async def root():
    """
    Endpoint to check if the API is running.

    Returns:
        JSONResponse: A JSON response indicating the API is running.
    """
    return {"message": "Criminal Detection API is running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000,
                )
    #  ssl=ssl_context

