# Deploy FinLens to Google Cloud Run

## Prerequisites

- [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed and logged in
- A Google Cloud project with the Cloud Run API enabled

## Fix: "could not parse reference" / invalid image name

If you see an error like `invalid image name "...FinLens/finlens:..." could not parse reference`, the image path contains **uppercase letters**. Docker/Artifact Registry require **lowercase** image names.

- **Option A – Use the repo’s `cloudbuild.yaml`:** This repo includes a `cloudbuild.yaml` that uses the lowercase image name `finlens`. In [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers), edit your trigger → set **Configuration** to **Cloud Build configuration file (yaml or json)** → set the config file to `cloudbuild.yaml` in the repo root. Save and re-run the build.
- **Option B – Fix the trigger image name:** In the trigger’s build configuration, change any image path so every segment is lowercase (e.g. `finlens` instead of `FinLens`). The Cloud Run service name must also be lowercase (e.g. `finlens`).

Substitutions in `cloudbuild.yaml`: `_REGION` (default `us-west1`), `_SERVICE_NAME` (`finlens`), `_REPOSITORY` (`cloud-run-source-deploy`). Override in the trigger if your setup differs.

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
