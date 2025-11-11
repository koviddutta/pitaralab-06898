# Python ML Service for Recipe Analysis

This is a FastAPI-based machine learning service that trains scikit-learn models on recipe outcome data and provides predictions.

## Features

- Train regression models on `recipe_outcomes` data
- Predict recipe success based on metrics
- A/B test against current validation logic
- RESTful API for training and prediction

## Prerequisites

- Python 3.9+
- pip or poetry
- Supabase credentials (for data access)

## Local Development

1. Install dependencies:
```bash
cd python-ml-service
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export SUPABASE_URL="https://upugwezzqpxzjxpdxuar.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export ML_SERVICE_SECRET="your-secret-key-for-auth"
```

3. Run the service:
```bash
uvicorn main:app --reload --port 8000
```

4. Test the API:
```bash
curl http://localhost:8000/health
```

## Deployment Options

### Option 1: Railway (Easiest)
1. Create account at railway.app
2. Connect this directory
3. Add environment variables
4. Deploy (automatic)
5. Get your production URL: `https://your-app.railway.app`

### Option 2: Google Cloud Run
```bash
gcloud run deploy recipe-ml-service \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,ML_SERVICE_SECRET=$ML_SERVICE_SECRET
```

### Option 3: AWS Lambda (via Serverless Framework)
```bash
npm install -g serverless
serverless deploy
```

### Option 4: Render.com
1. Create account at render.com
2. New Web Service -> Connect this directory
3. Add environment variables
4. Deploy

## API Endpoints

### Health Check
```bash
GET /health
```

### Train Model
```bash
POST /train
Headers:
  Authorization: Bearer <ML_SERVICE_SECRET>
Response:
{
  "status": "success",
  "accuracy": 0.87,
  "features_used": 14,
  "training_samples": 120,
  "model_version": "v1.2.0"
}
```

### Predict Recipe Success
```bash
POST /predict
Headers:
  Authorization: Bearer <ML_SERVICE_SECRET>
Body:
{
  "metrics": {
    "fat_pct": 8.5,
    "msnf_pct": 11.2,
    "sugars_pct": 18.5,
    "total_solids_pct": 38.2,
    "sp": 280,
    "pac": -5.2,
    "fpdt": -2.8
  },
  "product_type": "ice_cream"
}
Response:
{
  "prediction": "success",
  "confidence": 0.89,
  "score": 92,
  "suggestions": ["Recipe looks well-balanced", "SP is optimal"],
  "model_version": "v1.2.0"
}
```

### Get Model Info
```bash
GET /model/info
Headers:
  Authorization: Bearer <ML_SERVICE_SECRET>
Response:
{
  "model_type": "RandomForestRegressor",
  "trained_at": "2025-11-11T13:20:00Z",
  "accuracy": 0.87,
  "training_samples": 120,
  "features": ["fat_pct", "msnf_pct", "sugars_pct", ...],
  "version": "v1.2.0"
}
```

## Integration with Lovable App

Once deployed, update the edge function with your service URL:
1. Go to Lovable project
2. Add secret `ML_SERVICE_URL` with your deployment URL
3. Add secret `ML_SERVICE_SECRET` with your auth secret
4. The edge function will automatically use the Python ML service

## Cost Estimates

- **Railway**: Free tier (500 hours/month), then $5/month
- **Google Cloud Run**: ~$0.01-0.10/day for low traffic
- **AWS Lambda**: Free tier (1M requests/month), then $0.20/million
- **Render**: Free tier with limitations, Pro $7/month

## Monitoring

- Check `/health` endpoint for service status
- Check `/model/info` for model metadata
- Logs available in your deployment platform
