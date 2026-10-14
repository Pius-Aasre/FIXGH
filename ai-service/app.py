"""
Hugging Face Spaces entry point for the FixGH AI Service.

HuggingFace requires the app file to be named `app.py`. This file simply
re-exports the FastAPI `app` object from `main.py` and starts the uvicorn
server when the Space boots.

The Space is configured with sdk: gradio in README.md, but we override
the ASGI app via `app.py` so uvicorn serves our FastAPI application directly.
"""

# Re-export the FastAPI app so HuggingFace's uvicorn runner picks it up.
from main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=7860, reload=False)
