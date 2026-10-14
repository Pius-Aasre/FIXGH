# FixGH AI Service

**FastAPI-powered AI microservice** for the FixGH civic-tech platform.  
Deployed on **Render** as a Docker service.

Automatically classifies citizen complaints, filters spam, assigns priority scores,
and routes reports to the correct Ghanaian public authority out of 40 registered departments.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/v1/classify-and-route` | Full AI triage (spam filter + classify + priority) |
| `POST` | `/v1/categorize` | Category + authority matching only |
| `POST` | `/v1/score-priority` | Priority scoring only |
| `POST` | `/v1/generate-monthly-digest` | Executive summary for authority monthly reports |

## Local Development

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Swagger docs: `http://localhost:8000/docs`

## Deployment

Deployed automatically via [`render.yaml`](../render.yaml) as the `fixgh-ai` Docker service.  
The backend (`fixgh-backend`) receives the URL automatically via Render's `fromService` wiring.
