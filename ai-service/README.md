---
title: FixGH AI Service
emoji: 🇬🇭
colorFrom: green
colorTo: emerald
sdk: gradio
sdk_version: "4.44.0"
app_file: app.py
pinned: false
license: mit
short_description: AI complaint classification & priority scoring for FixGH
---

# FixGH AI Service

**FastAPI-powered AI microservice** for the [FixGH](https://github.com/your-org/fixGH) civic-tech platform.

Automatically classifies citizen complaints, filters spam, assigns priority scores, and routes reports to the correct Ghanaian public authority out of 40 registered departments.

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

Interactive API docs available at: `http://localhost:8000/docs`

## Deployment (Hugging Face Spaces)

This Space runs the FastAPI app via `app.py` (which imports from `main.py`).  
The Space is configured to use the **Gradio SDK wrapper** to expose a public HTTPS URL.

> [!NOTE]
> The FixGH backend (on Render) calls this Space URL via the `AI_SERVICE_URL` environment variable.
