from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from datetime import datetime
import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import pandas as pd
from supabase import create_client, Client

app = FastAPI(title="Recipe ML Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ML_SERVICE_SECRET = os.getenv("ML_SERVICE_SECRET")

if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ML_SERVICE_SECRET]):
    raise ValueError("Missing required environment variables")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Global model storage
model_store = {
    "model": None,
    "trained_at": None,
    "accuracy": None,
    "features": None,
    "version": "v1.0.0"
}

# Pydantic models
class PredictRequest(BaseModel):
    metrics: dict
    product_type: str

class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    score: int
    suggestions: List[str]
    model_version: str

class TrainResponse(BaseModel):
    status: str
    accuracy: float
    features_used: int
    training_samples: int
    model_version: str

class ModelInfo(BaseModel):
    model_type: str
    trained_at: Optional[str]
    accuracy: Optional[float]
    training_samples: Optional[int]
    features: Optional[List[str]]
    version: str

# Authentication
def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    token = authorization.replace("Bearer ", "")
    if token != ML_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Invalid token")
    
    return token

# Endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model_store["model"] is not None,
        "trained_at": model_store["trained_at"],
        "version": model_store["version"]
    }

@app.post("/train", response_model=TrainResponse)
async def train_model(token: str = Depends(verify_token)):
    """Train the ML model on recipe outcomes data"""
    try:
        # Fetch training data from Supabase
        print("📚 Fetching training data from Supabase...")
        
        # Get recipe outcomes with metrics
        response = supabase.table("recipe_outcomes").select(
            "outcome, recipe_id, recipes(calculated_metrics(*), product_type)"
        ).execute()
        
        if not response.data or len(response.data) < 20:
            raise HTTPException(
                status_code=400, 
                detail=f"Not enough training data. Need at least 20 samples, got {len(response.data) if response.data else 0}"
            )
        
        # Prepare training data
        data_rows = []
        for item in response.data:
            if not item.get("recipes"):
                continue
            
            recipe = item["recipes"]
            metrics_list = recipe.get("calculated_metrics", [])
            
            if not metrics_list:
                continue
            
            metrics = metrics_list[0] if isinstance(metrics_list, list) else metrics_list
            
            # Convert outcome to score
            outcome = item["outcome"]
            if outcome == "success":
                score = 100
            elif outcome == "needs_improvement":
                score = 70
            else:
                score = 40
            
            row = {
                "score": score,
                "fat_pct": metrics.get("fat_pct", 0),
                "msnf_pct": metrics.get("msnf_pct", 0),
                "sugars_pct": metrics.get("sugars_pct", 0),
                "total_solids_pct": metrics.get("total_solids_pct", 0),
                "sp": metrics.get("sp", 0),
                "pac": metrics.get("pac", 0),
                "fpdt": metrics.get("fpdt", 0),
                "other_solids_pct": metrics.get("other_solids_pct", 0),
                "pod_index": metrics.get("pod_index", 0)
            }
            data_rows.append(row)
        
        if len(data_rows) < 20:
            raise HTTPException(
                status_code=400,
                detail=f"Not enough valid training samples. Need at least 20, got {len(data_rows)}"
            )
        
        # Create DataFrame
        df = pd.DataFrame(data_rows)
        
        # Separate features and target
        feature_cols = [col for col in df.columns if col != "score"]
        X = df[feature_cols].values
        y = df["score"].values
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train model
        print(f"🤖 Training RandomForest on {len(X_train)} samples...")
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        accuracy = max(0, min(1, r2))  # Clamp between 0 and 1
        
        # Store model
        model_store["model"] = model
        model_store["trained_at"] = datetime.utcnow().isoformat()
        model_store["accuracy"] = accuracy
        model_store["features"] = feature_cols
        model_store["training_samples"] = len(data_rows)
        
        # Save model to disk
        joblib.dump(model, "recipe_model.pkl")
        
        print(f"✅ Model trained! Accuracy: {accuracy:.2f}, MSE: {mse:.2f}")
        
        return TrainResponse(
            status="success",
            accuracy=round(accuracy, 2),
            features_used=len(feature_cols),
            training_samples=len(data_rows),
            model_version=model_store["version"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Training error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")

@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest, token: str = Depends(verify_token)):
    """Predict recipe success based on metrics"""
    
    if model_store["model"] is None:
        raise HTTPException(
            status_code=400,
            detail="Model not trained yet. Call /train first."
        )
    
    try:
        # Extract features in the same order as training
        metrics = request.metrics
        feature_values = [
            metrics.get("fat_pct", 0),
            metrics.get("msnf_pct", 0),
            metrics.get("sugars_pct", 0),
            metrics.get("total_solids_pct", 0),
            metrics.get("sp", 0),
            metrics.get("pac", 0),
            metrics.get("fpdt", 0),
            metrics.get("other_solids_pct", 0),
            metrics.get("pod_index", 0)
        ]
        
        # Predict
        X = np.array([feature_values])
        predicted_score = model_store["model"].predict(X)[0]
        
        # Get confidence from feature importance
        feature_importance = model_store["model"].feature_importances_
        confidence = min(0.95, max(0.5, model_store["accuracy"]))
        
        # Determine status
        if predicted_score >= 85:
            status = "pass"
            suggestions = [
                "Recipe metrics are well-balanced",
                "ML model predicts high success rate"
            ]
        elif predicted_score >= 70:
            status = "warn"
            suggestions = [
                "Recipe is acceptable but could be optimized",
                "Consider adjusting key metrics for better results"
            ]
        else:
            status = "fail"
            suggestions = [
                "Recipe needs significant adjustment",
                "Review critical parameters before production"
            ]
        
        return PredictResponse(
            prediction=status,
            confidence=round(confidence, 2),
            score=int(predicted_score),
            suggestions=suggestions,
            model_version=model_store["version"]
        )
        
    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/model/info", response_model=ModelInfo)
async def get_model_info(token: str = Depends(verify_token)):
    """Get information about the current model"""
    
    if model_store["model"] is None:
        return ModelInfo(
            model_type="RandomForestRegressor",
            trained_at=None,
            accuracy=None,
            training_samples=None,
            features=None,
            version=model_store["version"]
        )
    
    return ModelInfo(
        model_type="RandomForestRegressor",
        trained_at=model_store["trained_at"],
        accuracy=model_store["accuracy"],
        training_samples=model_store.get("training_samples"),
        features=model_store["features"],
        version=model_store["version"]
    )

@app.on_event("startup")
async def startup_event():
    """Load model from disk if it exists"""
    try:
        if os.path.exists("recipe_model.pkl"):
            model_store["model"] = joblib.load("recipe_model.pkl")
            print("✅ Loaded existing model from disk")
    except Exception as e:
        print(f"⚠️ Could not load existing model: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
