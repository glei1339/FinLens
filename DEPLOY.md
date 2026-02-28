# Deploy FinLens to Google Cloud Run

## Prerequisites

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed and logged in
- A Google Cloud project with the Cloud Run API enabled

## Deploy

From the project root:

```bash
# Set your project and region
export PROJECT_ID=your-project-id
export REGION=us-central1

# Build and push the container image (using Cloud Build)
gcloud builds submit --tag gcr.io/${PROJECT_ID}/finlens

# Deploy to Cloud Run
gcloud run deploy finlens \
  --image gcr.io/${PROJECT_ID}/finlens \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated
```

Or with Artifact Registry (recommended):

```bash
# Create repository (one-time)
gcloud artifacts repositories create finlens-repo \
  --repository-format=docker \
  --location=${REGION}

# Build and push
gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/finlens-repo/finlens

# Deploy
gcloud run deploy finlens \
  --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/finlens-repo/finlens \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated
```

The app will be available at the URL Cloud Run prints after deployment. All data stays in the browser (localStorage); no backend is required.
