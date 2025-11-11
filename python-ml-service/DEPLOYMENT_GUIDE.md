# Deployment Guide for Python ML Service

## Quick Start (Railway - Recommended)

Railway is the easiest option with a generous free tier.

### Step 1: Sign up for Railway
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Deploy
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your repository
3. Railway will auto-detect the Dockerfile

### Step 3: Add Environment Variables
In Railway dashboard, go to Variables tab and add:
```
SUPABASE_URL=https://upugwezzqpxzjxpdxuar.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<get-from-lovable-cloud-settings>
ML_SERVICE_SECRET=<create-a-random-secret>
```

### Step 4: Get Your URL
Railway will give you a URL like: `https://recipe-ml-service-production.up.railway.app`

### Step 5: Configure Lovable
In your Lovable project, add secrets:
1. `ML_SERVICE_URL` = Your Railway URL
2. `ML_SERVICE_SECRET` = Same secret as above

### Step 6: Train the Model
```bash
curl -X POST https://your-railway-url.railway.app/train \
  -H "Authorization: Bearer YOUR_ML_SERVICE_SECRET"
```

## Alternative: Google Cloud Run

### Deploy to Cloud Run
```bash
# Install Google Cloud SDK first
gcloud auth login

# Deploy
gcloud run deploy recipe-ml-service \
  --source ./python-ml-service \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY,ML_SERVICE_SECRET=$ML_SERVICE_SECRET
```

## Alternative: Render.com

1. Sign up at [render.com](https://render.com)
2. New Web Service → Connect repository
3. Root directory: `python-ml-service`
4. Add environment variables
5. Deploy

## Cost Comparison

| Platform | Free Tier | Cost After Free | Best For |
|----------|-----------|----------------|----------|
| Railway | 500 hrs/month, $5 credit | $5-10/month | Development & Production |
| Google Cloud Run | 2M requests/month | $0.01-1/day | High traffic |
| Render | 750 hrs/month | $7/month | Simple deployment |
| AWS Lambda | 1M requests/month | $0.20/million | Event-driven |

## Testing Your Deployment

### 1. Health Check
```bash
curl https://your-deployment-url/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": false,
  "trained_at": null,
  "version": "v1.0.0"
}
```

### 2. Train Model
```bash
curl -X POST https://your-deployment-url/train \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json"
```

### 3. Test Prediction
```bash
curl -X POST https://your-deployment-url/predict \
  -H "Authorization: Bearer YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

## Troubleshooting

### "Not enough training data"
You need at least 20 recipe outcomes in your database. Users must:
1. Create recipes
2. Save them
3. Provide feedback (success/needs_improvement/failed)

Check your data:
```sql
SELECT COUNT(*) FROM recipe_outcomes;
```

### "ML service not configured"
Add the secrets in Lovable:
1. Go to Lovable project settings
2. Add `ML_SERVICE_URL` secret
3. Add `ML_SERVICE_SECRET` secret

### "Model not trained yet"
Call the `/train` endpoint first before making predictions.

## Monitoring

- **Railway**: Built-in logs and metrics in dashboard
- **Google Cloud Run**: Check Cloud Console logs
- **Render**: Logs available in dashboard

## Security Notes

1. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** - only use in backend
2. **Rotate `ML_SERVICE_SECRET`** if compromised
3. **Use HTTPS only** for production
4. **Rate limit** the API if needed

## Next Steps

Once deployed:
1. ✅ Train the model with `/train` endpoint
2. ✅ Integrate with Lovable via edge function
3. ✅ Test predictions in the app
4. ✅ Set up automatic retraining (weekly/monthly)
5. ✅ Monitor model performance and retrain as needed
