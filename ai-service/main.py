from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from typing import Optional
import random
import re

app = FastAPI(title="FixGH AI Service")


class ReportData(BaseModel):
    category: Optional[str] = None
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CategorizeRequest(BaseModel):
    title: str
    description: str


# Keyword map for auto-categorisation
CATEGORY_KEYWORDS = {
    "Pothole": [
        "pothole", "potholes", "pot hole", "pot holes", "pot whole", "pot wholes",
        "crater", "craters", "road damage", "road crack", "bad road", "road broken",
        "highway damage", "manhole", "asphalt",
    ],
    "Blocked Drain": [
        "drain", "drains", "gutter", "gutters", "sewer", "blocked", "clogged", "choked",
        "flooding", "flood", "stagnant water", "waterlogged", "drainage",
    ],
    "Burst Pipe": [
        "pipe", "pipes", "burst", "water leak", "leaking", "leak", "water main",
        "water supply", "water pressure", "water running", "gwcl",
    ],
    "Streetlight Out": [
        "streetlight", "streetlights", "street light", "street lights", "street ligt",
        "street ligts", "light", "lights", "darkness", "dark", "lamp", "lamppost",
        "no light", "blackout", "dumsor",
    ],
    "Road Marking": [
        "road marking", "faded lines", "zebra crossing", "lane marking",
        "traffic paint", "road signs",
    ],
    "Garbage / Dumping": [
        "garbage", "rubbish", "trash", "litter", "dumping", "refuse",
        "waste", "dump site", "filth", "dirty",
    ],
    "Traffic Signal": [
        "traffic light", "traffic signal", "signal", "semaphore",
        "traffic management",
    ],
    "Bridge / Culvert": [
        "bridge", "culvert", "overpass", "underpass",
    ],
    "Other": [],
}


def auto_categorize(title: str, description: str) -> tuple[str, float]:
    """
    Keyword-based categorisation. Returns (category, confidence).
    Falls back to 'Other' if no keywords match.
    """
    combined = f"{title} {description}".lower()
    # Remove punctuation for cleaner matching
    combined = re.sub(r"[^\w\s]", " ", combined)

    scores: dict[str, int] = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in combined:
                scores[cat] = scores.get(cat, 0) + 1

    if not scores:
        return "Other", 0.5

    best = max(scores, key=lambda c: scores[c])
    total_hits = sum(scores.values())
    confidence = round(scores[best] / max(total_hits, 1), 2)
    return best, min(confidence + 0.3, 0.99)  # Boost confidence slightly


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "FixGH AI Service is running"}


@app.post("/v1/categorize")
def categorize(data: CategorizeRequest):
    """
    Auto-categorise an infrastructure complaint from title + description.
    Returns { category, confidence }.
    """
    category, confidence = auto_categorize(data.title, data.description)
    return {"category": category, "confidence": confidence}


@app.post("/v1/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """
    Mock endpoint: In a real scenario, we'd pass this to YOLO/OpenCV.
    """
    categories = ["Pothole", "Blocked Drain", "Streetlight Out", "Burst Pipe"]
    detected = random.choice(categories)
    confidence = round(random.uniform(0.7, 0.99), 2)
    return {"category": detected, "confidence": confidence}


@app.post("/v1/score-priority")
def score_priority(data: ReportData):
    """
    Analyses severity based on description and category.
    """
    desc_lower = data.description.lower()
    if any(w in desc_lower for w in ["emergency", "crash", "flooding", "collapsed", "hazard"]):
        priority = "EMERGENCY"
    elif data.category in ["Pothole", "Burst Pipe", "Bridge / Culvert"]:
        priority = "HIGH"
    elif data.category in ["Blocked Drain", "Traffic Signal"]:
        priority = "MEDIUM"
    else:
        priority = "LOW"
    return {"priority_score": priority}


@app.post("/v1/detect-duplicate")
def detect_duplicate(data: ReportData):
    """
    Mock endpoint: Checks if a similar issue was reported nearby.
    """
    return {"is_duplicate": False, "confidence": 0.0, "duplicate_id": None}
