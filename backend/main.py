import os
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, List, Optional
import tensorflow as tf
import numpy as np
import cv2
import io
from PIL import Image
import uvicorn
from datetime import datetime
import logging
import json
import signal
import sys
from backend.train import load_model  # Use absolute import
from backend.pipeline import main as train_model  # Use absolute import

# Load environment variables
from dotenv import load_dotenv

# Load environment variables from the project root .env.local
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / '.env.local')

# Configure logging with more specific patterns
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('dr_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app with lifespan management
app = FastAPI(
    title="Diabetic Retinopathy Detection API",
    description="API for detecting and classifying diabetic retinopathy from retinal images",
    version="1.0.0"
)

# Update CORS middleware configuration
origins = [
    "http://localhost",
    "http://localhost:3000",
    # Add other origins as needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Add explicit OPTIONS handler
@app.options("/{path:path}")
async def options_handler():
    return {}

# Pydantic models for request/response
class PredictionResponse(BaseModel):
    severity: str
    confidence: float
    severity_scores: Dict[str, float]
    processing_time: float

class BatchPredictionResponse(BaseModel):
    predictions: List[PredictionResponse]
    failed_images: List[str]
    total_processing_time: float

class ModelInfo(BaseModel):
    model_loaded: bool
    input_shape: tuple
    last_training_date: Optional[str]
    total_parameters: int

# ML Model setup
class DRModel:
    def __init__(self):
        self.model = None
        self.severity_labels = [
            "No DR",
            "Mild DR",
            "Moderate DR",
            "Severe DR",
            "Proliferative DR"
        ]
        self.input_shape = (224, 224)
        self.model_path = Path(__file__).resolve().parent / 'models' / 'dr_classification_model.h5'
        self.load_model()

    def load_model(self):
        """Load the TensorFlow model or use mock model for development"""
        try:
            if not self.model_path.exists():
                logger.warning(f"Model file not found at {self.model_path}. Using mock model.")
                self.model = "mock"
                return

            logger.info("Loading TensorFlow model...")
            self.model = tf.keras.models.load_model(str(self.model_path))
            logger.info("Model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            self.model = "mock"

    def preprocess_image(self, image_bytes):
        """Preprocess image for model input"""
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize
            image = image.resize(self.input_shape)
            
            # Convert to numpy array and normalize
            img_array = np.array(image)
            img_array = img_array.astype('float32') / 255.0
            
            # Add batch dimension
            img_array = np.expand_dims(img_array, axis=0)
            
            return img_array

        except Exception as e:
            logger.error(f"Preprocessing error: {str(e)}")
            raise ValueError(f"Error preprocessing image: {str(e)}")

    def predict(self, preprocessed_image):
        """Make prediction using the model"""
        try:
            start_time = datetime.now()
            
            if self.model == "mock":
                # Generate mock predictions
                mock_prediction = np.random.random(len(self.severity_labels))
                mock_prediction = mock_prediction / mock_prediction.sum()
                prediction = mock_prediction
            else:
                # Real model prediction
                prediction = self.model.predict(preprocessed_image, verbose=0)[0]

            # Get the predicted class and confidence
            predicted_class = np.argmax(prediction)
            confidence = float(prediction[predicted_class])

            # Calculate scores for all classes
            severity_scores = {
                label: float(score) * 100
                for label, score in zip(self.severity_labels, prediction)
            }

            processing_time = (datetime.now() - start_time).total_seconds()

            return {
                'severity': self.severity_labels[predicted_class],
                'confidence': confidence * 100,  # Convert to percentage
                'severity_scores': severity_scores,
                'processing_time': processing_time
            }

        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            raise ValueError(f"Error making prediction: {str(e)}")

# Initialize model
dr_model = DRModel()

@app.get("/", tags=["General"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to DR Detection API",
        "status": "active",
        "model_status": "Using mock model" if dr_model.model == "mock" else "Using trained model",
        "endpoints": {
            "predict": "/predict - Analyze single image",
            "batch_predict": "/batch_predict - Analyze multiple images",
            "health": "/health - Check API health",
            "docs": "/docs - API documentation"
        }
    }

@app.get("/health", tags=["General"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": dr_model.model is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/model/info", tags=["Model"], response_model=ModelInfo)
async def model_info():
    """Get model information"""
    if dr_model.model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return ModelInfo(
        model_loaded=True,
        input_shape=dr_model.input_shape,
        last_training_date="2024-01-15",  # Update this based on your model
        total_parameters=dr_model.model.count_params()
    )

# Add OPTIONS handler for the predict endpoint
@app.options("/predict")
async def predict_options():
    return {}

@app.post("/predict", tags=["Prediction"])
async def predict_image(file: UploadFile = File(...)):
    """Make prediction for a single image"""
    try:
        logging.info("Loading the trained model...")
        model = load_model('best_model.h5')
        logging.info("Model loaded successfully.")

        logging.info("Predicting DR level for the uploaded image...")
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (224, 224))
        img = img.astype(np.float32) / 255.0
        img = np.expand_dims(img, axis=0)

        prediction = model.predict(img)
        predicted_level = np.argmax(prediction, axis=1)[0]
        logging.info(f'Predicted DR level: {predicted_level}')
        return {"predicted_level": predicted_level}
    except Exception as e:
        logging.error(f"An error occurred during prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch_predict", tags=["Prediction"], response_model=BatchPredictionResponse)
async def batch_predict(files: List[UploadFile] = File(...)):
    """
    Make predictions for multiple images
    
    Parameters:
    - files: List of image files
    
    Returns:
    - List of predictions and any failed images
    """
    try:
        if dr_model.model is None:
            raise HTTPException(status_code=503, detail="Model not loaded")
        
        start_time = datetime.now()
        predictions = []
        failed_images = []
        
        for file in files:
            try:
                contents = await file.read()
                preprocessed_image = dr_model.preprocess_image(contents)
                result = dr_model.predict(preprocessed_image)
                predictions.append(result)
            except Exception as e:
                logger.error(f"Error processing {file.filename}: {str(e)}")
                failed_images.append(file.filename)
        
        total_time = (datetime.now() - start_time).total_seconds()
        
        return BatchPredictionResponse(
            predictions=predictions,
            failed_images=failed_images,
            total_processing_time=total_time
        )
    except Exception as e:
        logger.error(f"Error in batch prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train", tags=["Model"])
async def train(data_dir: str):
    try:
        logging.info("Starting model training...")
        accuracy = train_model(data_dir)
        logging.info(f"Model training completed with accuracy: {accuracy}")
        return {"message": "Model training completed successfully.", "accuracy": accuracy}
    except Exception as e:
        logging.error(f"An error occurred during training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add shutdown event handler
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down...")
    # Cleanup code here if needed

# Modified main block with proper signal handling
if __name__ == "__main__":
    config = uvicorn.Config(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_delay=1.0,  # Add delay between reloads
        log_level="info",
        workers=1,  # Single worker for development
        reload_excludes=["*.pyc", "*.log"],  # Exclude unnecessary files
        reload_includes=["*.py", "*.html", "*.css", "*.js"]  # Include only needed files
    )
    
    server = uvicorn.Server(config)
    
    # Handle graceful shutdown
    def handle_exit(signum, frame):
        logger.info(f"Received signal {signum}. Shutting down gracefully...")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)
    
    try:
        logger.info("Starting DR Detection API server...")
        server.run()
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        sys.exit(1)