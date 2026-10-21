from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import random
import re

app = FastAPI(title="FixGH AI Service", description="AI Complaint Organization, Filtering, and Categorization for Ghana Authorities")


class ReportData(BaseModel):
    category: Optional[str] = None
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CategorizeRequest(BaseModel):
    title: str
    description: str
    location_text: Optional[str] = None


class ComplaintItem(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    category: Optional[str] = None
    location_text: Optional[str] = None
    priority: Optional[str] = None
    created_at: Optional[str] = None


class MonthlyDigestRequest(BaseModel):
    authority_name: str
    authority_email: str
    month_label: str
    complaints: List[ComplaintItem]


# 40 Ghanaian Public Authorities Registry with rich keywords and geographic signals
AUTHORITIES_KNOWLEDGE_BASE = [
    {
        "id": "1",
        "name": "Ghana Police Service",
        "email": "hq.pro@police.gov.gh",
        "category": "Security & Law Enforcement",
        "keywords": [
            "crime", "theft", "stolen", "robbery", "armed robber", "armed robbery", "gunpoint", "thief",
            "burglary", "assault", "attacked", "violence", "threat", "threatening", "security", "murder",
            "extortion", "scam", "weapon", "gun", "knife", "police", "fraud", "harassment",
            "kidnap", "break-in", "vandalism",
        ],
    },
    {
        "id": "2",
        "name": "Ghana National Fire Service",
        "email": "info@gnfs.gov.gh",
        "category": "Fire & Rescue",
        "keywords": [
            "fire", "blaze", "burning", "flame", "smoke", "fire hazard", "gas leak", "lpg leak",
            "gas explosion", "fire hydrant", "flammable", "inferno", "bushfire", "electrical fire", "fire safety",
        ],
    },
    {
        "id": "3",
        "name": "National Ambulance Service",
        "email": "nas@nas.gov.gh",
        "category": "Emergency Health & Rescue",
        "keywords": [
            "medical emergency", "ambulance", "casualty", "collapsed person", "unconscious", "severe injury", "paramedic", "cardiac arrest",
            "patient emergency", "profuse bleeding", "trauma rescue", "urgent hospital transfer",
        ],
    },
    {
        "id": "4",
        "name": "Environmental Protection Authority",
        "email": "info@epa.gov.gh",
        "category": "Environment & Pollution",
        "keywords": [
            "pollution", "toxic waste", "chemical spill", "galamsey", "illegal mining", "river pollution", "factory smoke", "hazardous waste",
            "environmental damage", "noise pollution", "industrial fumes", "chemical dumping", "air pollution", "water contamination", "environmental degradation",
        ],
    },
    {
        "id": "5",
        "name": "Food and Drugs Authority",
        "email": "fda@fda.gov.gh",
        "category": "Public Health & Consumer Safety",
        "keywords": [
            "unsafe food", "rotten food", "food poisoning", "expired food", "fake drugs", "counterfeit medication", "unregistered medicine", "bad cosmetics",
            "skin bleaching creams", "contaminated water sachet", "expired drinks", "harmful cosmetics", "drug safety", "spoilt meat",
        ],
    },
    {
        "id": "6",
        "name": "Electricity Company of Ghana",
        "email": "ecgho@ecggh.com",
        "category": "Electricity Infrastructure",
        "keywords": [
            "power outage", "power cut", "electricity", "ecg", "dumsor", "transformer", "fallen electric pole", "exposed wire",
            "high voltage", "faulty meter", "spark", "electric pole", "prepaid meter", "blackout", "cable spark", "low voltage",
            "electrical shock hazard",
        ],
    },
    {
        "id": "7",
        "name": "Ghana Water Company",
        "email": "info@gwcl.com.gh",
        "category": "Water Infrastructure",
        "keywords": [
            "water supply", "gwcl", "burst pipe", "broken pipe", "leaking pipe", "water outage", "no water", "dirty water",
            "tap water", "low water pressure", "broken water main", "water crisis", "flooding pipe", "water tanker shortage", "water pipe", "pipe burst",
            "burst water pipe", "water main", "main pipe", "pipe leak", "water leak",
        ],
    },
    {
        "id": "8",
        "name": "Public Utilities Regulatory Commission",
        "email": "info@purc.com.gh",
        "category": "Utilities Regulation & Consumer Rights",
        "keywords": [
            "purc", "utility complaint", "electricity billing", "water billing", "tariff overcharge", "utility extortion", "overbilling", "utility regulatory",
            "ecg dispute", "gwcl dispute", "wrong utility bill", "unjust tariff",
        ],
    },
    {
        "id": "9",
        "name": "National Communications Authority",
        "email": "info@nca.org.gh",
        "category": "Telecommunications",
        "keywords": [
            "nca", "telecom", "cellular network", "mtn network", "telecel", "at ghana", "sim registration", "call drop",
            "data bundle deduction", "bad network", "internet outage", "cell tower", "mast", "broadband disruption",
        ],
    },
    {
        "id": "10",
        "name": "Driver and Vehicle Licensing Authority",
        "email": "info@dvla.gov.gh",
        "category": "Transport Licensing",
        "keywords": [
            "dvla", "driver license", "drivers license", "roadworthy", "road worthiness", "vehicle registration", "license plate", "number plate",
            "driving test", "fake license", "vehicle inspection", "dvla renewal",
        ],
    },
    {
        "id": "11",
        "name": "National Road Safety Authority",
        "email": "info@nrsa.gov.gh",
        "category": "Road Safety",
        "keywords": [
            "road safety", "nrsa", "accident hotspot", "black spot", "speed ramps", "speed bump", "zebra crossing", "missing road sign",
            "traffic hazard", "pedestrian danger", "speeding", "reckless driving", "road signage", "unmarked intersection",
        ],
    },
    {
        "id": "12",
        "name": "Department of Urban Roads",
        "email": "info@dur.gov.gh",
        "category": "Urban Roads & Streets",
        "keywords": [
            "urban road", "city road", "street pothole", "pothole", "street erosion", "inner city road", "residential road", "damaged street",
            "culvert street", "town road", "unpaved street", "road maintenance", "urban asphalt",
        ],
    },
    {
        "id": "13",
        "name": "Ghana Highway Authority",
        "email": "info@highways.gov.gh",
        "category": "Highways & Trunk Infrastructure",
        "keywords": [
            "highway", "trunk road", "motorway", "accra-tema motorway", "accra-kumasi highway", "highway bridge", "intercity road", "highway pothole",
            "toll booth", "expressway", "bypass", "dual carriageway", "highway cave-in",
        ],
    },
    {
        "id": "14",
        "name": "Accra Metropolitan Assembly",
        "email": "info@ama.gov.gh",
        "category": "Local Assembly - Accra Metro",
        "locations": [
            "accra",
            "makola",
            "osu",
            "adabraka",
            "circle",
            "jamestown",
            "ministries",
        ],
        "keywords": [
            "ama", "accra sanitation", "garbage accra", "refuse accra", "makola", "osu", "adabraka", "circle",
            "james town", "central accra", "accra waste", "choked gutters accra", "unlawful structure accra", "odaw river trash",
        ],
    },
    {
        "id": "15",
        "name": "Ga Central Municipal Assembly",
        "email": "info@gcma.gov.gh",
        "category": "Local Assembly - Ga Central",
        "locations": [
            "sowutuom",
            "anyaa",
            "santa maria",
            "chantan",
            "ablekuma",
        ],
        "keywords": [
            "ga central", "gcma", "sowutuom", "anyaa", "santa maria", "chantan", "ablekuma", "kwashieman",
            "ga central sanitation", "ga central road",
        ],
    },
    {
        "id": "16",
        "name": "Ga East Municipal Assembly",
        "email": "info@gema.gov.gh",
        "category": "Local Assembly - Ga East",
        "locations": [
            "abokobi",
            "dome",
            "haatso",
            "taifa",
            "kwabenya",
            "agbogba",
        ],
        "keywords": [
            "ga east", "gema", "abokobi", "dome", "haatso", "taifa", "kwabenya", "agbogba",
            "ga east sanitation", "ga east roads", "ga east drain",
        ],
    },
    {
        "id": "17",
        "name": "Ga North Municipal Assembly",
        "email": "info@gnma.gov.gh",
        "category": "Local Assembly - Ga North",
        "locations": [
            "ofankor",
            "pokuase",
            "tantra hill",
            "trobu",
        ],
        "keywords": [
            "ga north", "gnma", "ofankor", "pokuase", "tantra hill", "trobu", "amasaman border", "ga north sanitation",
            "ga north roads", "ga north gutter",
        ],
    },
    {
        "id": "18",
        "name": "Ga South Municipal Assembly",
        "email": "info@gsma.gov.gh",
        "category": "Local Assembly - Ga South",
        "locations": [
            "weija",
            "ngleshie amanfro",
            "gbawe",
            "bortianor",
            "galilea",
            "kokrobite",
        ],
        "keywords": [
            "ga south", "gsma", "weija", "ngleshie amanfro", "gbawe", "bortianor", "galilea", "kokrobite",
            "ga south sanitation", "ga south roads",
        ],
    },
    {
        "id": "19",
        "name": "Okaikwei North Municipal Assembly",
        "email": "info@onma.gov.gh",
        "category": "Local Assembly - Okaikwei North",
        "locations": [
            "achimota",
            "tesano",
            "abeka",
            "lapaz",
            "fadama",
            "akweteyman",
        ],
        "keywords": [
            "okaikwei north", "onma", "achimota", "tesano", "abeka", "lapaz", "fadama", "akweteyman",
            "okaikwei sanitation", "lapaz gutter",
        ],
    },
    {
        "id": "20",
        "name": "Ghana Revenue Authority",
        "email": "info@gra.gov.gh",
        "category": "Revenue & Customs",
        "keywords": [
            "gra", "tax", "customs", "vat evasion", "tax extortion", "illegal duty", "import tax", "tin number",
            "port customs", "customs harassment", "tax bribery", "revenue authority", "e-levy complaint",
        ],
    },
    {
        "id": "21",
        "name": "National Insurance Commission",
        "email": "info@nicgh.org",
        "category": "Insurance Regulation",
        "keywords": [
            "nic", "insurance complaint", "unpaid insurance claim", "motor insurance", "life insurance", "insurance fraud", "insurance company delay", "premium dispute",
            "claims rejection", "insurance broker scam",
        ],
    },
    {
        "id": "22",
        "name": "National Labour Commission",
        "email": "info@nlcghana.org",
        "category": "Labour & Workplace",
        "keywords": [
            "nlc", "labour commission", "employment dispute", "wrongful dismissal", "unpaid salary", "unpaid wages", "unlawful sacking", "employer abuse",
            "workplace exploitation", "strike action", "severance pay", "labour violation",
        ],
    },
    {
        "id": "23",
        "name": "Pharmacy Council Ghana",
        "email": "info@pcghana.org",
        "category": "Pharmacy Regulation",
        "keywords": [
            "pharmacy council", "chemist", "drug store", "over the counter medicine", "quack pharmacist", "unlicensed pharmacy", "dispensing error", "medicine seller",
            "pharmacy negligence", "unauthorized drug shop",
        ],
    },
    {
        "id": "24",
        "name": "Medical and Dental Council",
        "email": "info@mdc.gov.gh",
        "category": "Medical Standards",
        "keywords": [
            "medical council", "dental council", "doctor negligence", "medical malpractice", "quack doctor", "hospital negligence", "surgical error", "clinic malpractice",
            "dental malpractice", "unlicensed clinic", "hospital mistreatment",
        ],
    },
    {
        "id": "25",
        "name": "National Identification Authority",
        "email": "info@nia.gov.gh",
        "category": "Civic Identity",
        "keywords": [
            "nia", "ghana card", "national id", "id card registration", "card collection", "name correction", "national identification", "ghana card delay",
            "nia office", "biometric registration glitch",
        ],
    },
    {
        "id": "26",
        "name": "National Information Technology Agency",
        "email": "info@nita.gov.gh",
        "category": "Government IT & Digital Public Infrastructure",
        "keywords": [
            "nita", "government website down", "ghana.gov", "digital service issue", "government portal", "public cybersecurity", "government network", "e-services error",
            "national data centre",
        ],
    },
    {
        "id": "27",
        "name": "Public Procurement Authority",
        "email": "info@ppa.gov.gh",
        "category": "Public Procurement",
        "keywords": [
            "ppa", "public procurement", "tender rigging", "sole sourcing", "government contract fraud", "kickback", "procurement irregularity", "bidding corruption",
            "inflated tender", "contract padding",
        ],
    },
    {
        "id": "28",
        "name": "National Petroleum Authority",
        "email": "info@npa.gov.gh",
        "category": "Petroleum & Fuel Standards",
        "keywords": [
            "npa", "petroleum", "fuel adulteration", "bad petrol", "bad diesel", "fuel station", "filling station cheating", "pump under-dispensing",
            "illegal gas station", "lpg cylinder", "substandard fuel",
        ],
    },
    {
        "id": "29",
        "name": "Energy Commission",
        "email": "info@energycom.gov.gh",
        "category": "Energy Standards & Regulations",
        "keywords": [
            "energy commission", "electrical wiring", "certified electrician", "appliance energy efficiency", "star rating", "renewable energy regulations", "solar installation standards", "wiring certification",
        ],
    },
    {
        "id": "30",
        "name": "Forestry Commission",
        "email": "info.hq@fcghana.org",
        "category": "Forestry & Wildlife Protection",
        "keywords": [
            "forestry commission", "illegal logging", "timber poaching", "chainsaw operator", "forest reserve", "rosewood", "deforestation", "wildlife poaching",
            "game reserve encroachment", "tree felling",
        ],
    },
    {
        "id": "31",
        "name": "Ghana Maritime Authority",
        "email": "info@ghanamaritime.org",
        "category": "Maritime & Water Transport",
        "keywords": [
            "maritime authority", "sea safety", "boat accident", "volta lake disaster", "ferry safety", "fishing vessel", "marine pollution", "sea vessel",
            "coastal waters", "drowning boat",
        ],
    },
    {
        "id": "32",
        "name": "Ghana Ports and Harbours Authority",
        "email": "headquarters@ghanaports.gov.gh",
        "category": "Ports & Harbours",
        "keywords": [
            "gpha", "tema port", "takoradi port", "container delay", "demurrage dispute", "port clearance", "wharf", "harbour",
            "cargo damage", "port congestion",
        ],
    },
    {
        "id": "33",
        "name": "Ghana Post",
        "email": "info@ghanapost.com.gh",
        "category": "Postal & Digital Address",
        "keywords": [
            "ghana post", "ghanapost gps", "postal service", "missing mail", "lost parcel", "ems tracking", "courier delay", "digital address error",
            "post office",
        ],
    },
    {
        "id": "34",
        "name": "National Media Commission",
        "email": "admin@nmc.org.gh",
        "category": "Media & Broadcasting Ethics",
        "keywords": [
            "nmc", "media commission", "fake news", "defamatory broadcast", "hate speech radio", "tv content violation", "journalist harassment", "broadcast violation",
            "press complaint", "illegal frequency",
        ],
    },
    {
        "id": "35",
        "name": "National Pensions Regulatory Authority",
        "email": "info@npra.gov.gh",
        "category": "Pensions Regulation",
        "keywords": [
            "npra", "pension", "ssnit delay", "tier 1", "tier 2", "tier 3", "pension trustee", "unpaid pension",
            "retirement benefits", "pension contribution default",
        ],
    },
    {
        "id": "36",
        "name": "Electoral Commission",
        "email": "info@ec.gov.gh",
        "category": "Elections & Civic Registry",
        "keywords": [
            "electoral commission", "ec ghana", "voter registration", "voters register", "polling station", "voting machine", "ballot", "election irregularity",
            "exhibition of register", "voter transfer",
        ],
    },
    {
        "id": "37",
        "name": "Public Services Commission",
        "email": "info@psc.gov.gh",
        "category": "Civil & Public Service Standards",
        "keywords": [
            "public services commission", "civil service conduct", "government bureaucrat delay", "civil servant misconduct", "public office abuse", "public service appointment", "administrative neglect",
        ],
    },
    {
        "id": "38",
        "name": "Commission on Human Rights and Administrative Justice",
        "email": "info@chraj.gov.gh",
        "category": "Human Rights & Anti-Corruption",
        "keywords": [
            "chraj", "human rights violation", "unlawful arrest", "administrative injustice", "state harassment", "corruption", "whistleblowing", "discrimination",
            "fundamental rights", "abuse of power by official",
        ],
    },
    {
        "id": "39",
        "name": "National Disaster Management Organisation",
        "email": "info@nadmo.gov.gh",
        "category": "Disaster & Crisis Management",
        "keywords": [
            "nadmo", "flood", "severe flooding", "disaster relief", "rainstorm disaster", "tidal wave", "collapsed building disaster", "emergency shelter",
            "disaster victim relief", "mudslide", "natural catastrophe",
        ],
    },
    {
        "id": "40",
        "name": "Registrar-General's Department",
        "email": "info@rgd.gov.gh",
        "category": "Business & Company Registration",
        "keywords": [
            "registrar general", "rgd", "orc", "registrar of companies", "business registration", "company name reservation", "annual returns", "company filing",
            "business certificate", "business portal failure",
        ],
    },
]


def filter_spam(title: str, description: str) -> tuple[bool, Optional[str]]:
    """
    AI content filter to screen out nonsense, gibberish, spam test submissions.
    Returns (is_valid, reason_if_invalid).
    """
    text = f"{title} {description}".strip()
    if len(text) < 10:
        return False, "Complaint text too short or uninformative (minimum 10 characters required)."

    # Check for repeated characters (e.g., 'aaaaaa', 'asdfasdfasdf', '111111')
    if re.search(r"(.)\1{5,}", text):
        return False, "Detected repetitive character sequence (Spam filter)."

    words = re.findall(r"\b[a-zA-Z]{2,}\b", text)
    if len(words) < 2:
        return False, "Lacks sufficient natural language words."

    # Test phrase filters
    lowered = text.lower()
    if lowered in ["test", "testing", "asdf", "hello world", "sample complaint", "qwerty", "test report"]:
        return False, "Automated test or placeholder text detected."

    return True, None


def _normalise(text: str) -> str:
    """Lowercase, strip punctuation and collapse whitespace for keyword matching."""
    cleaned = re.sub(r"[^\w\s]", " ", str(text or "").lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def _phrase_matches(text: str, phrase: str) -> bool:
    """
    Word-boundary aware phrase matcher that tolerates simple inflections.

    Plain substring matching matches inside larger words ("gun" inside
    "gunpoint") and misses inflections ("armed robber" vs "armed robbers").
    """
    words = [w for w in str(phrase or "").lower().split() if w]
    if not words:
        return False

    parts = [re.escape(w) + r"(?:s|es|ed|d|ing)?" for w in words]
    return re.search(r"\b" + r"\s+".join(parts) + r"\b", text) is not None


def classify_authority(title: str, description: str, location_text: Optional[str] = None):
    """
    Intelligently scores and maps the complaint across the 40 public authorities.

    Keyword evidence is primary; location evidence only breaks ties. Matching a
    generic city name (e.g. "Accra") must not outrank an explicit domain
    keyword, otherwise every report filed in Accra is routed to the Accra
    Metropolitan Assembly instead of the responsible agency.
    """
    clean_text = _normalise(f"{title} {description} {location_text or ''}")

    keyword_scores = {}
    location_scores = {}

    for auth in AUTHORITIES_KNOWLEDGE_BASE:
        keyword_score = 0
        location_score = 0
        auth_id = auth["id"]

        # Exact department mentions
        if _phrase_matches(clean_text, auth["name"]):
            keyword_score += 15

        # Check location matches for Municipal Assemblies (AMA, Ga Central, etc.)
        for loc in auth.get("locations", []):
            if _phrase_matches(clean_text, loc):
                location_score += 8

        # Keyword matching
        for kw in auth["keywords"]:
            if _phrase_matches(clean_text, kw):
                # Give extra weight to multi-word specific phrases
                keyword_score += 4 if " " in kw else 2

        if keyword_score > 0:
            keyword_scores[auth_id] = keyword_score
        if location_score > 0:
            location_scores[auth_id] = location_score

    best_auth = None

    if keyword_scores:
        top_score = max(keyword_scores.values())
        tied = [i for i, s in keyword_scores.items() if s == top_score]

        # Location only decides between equally-scored authorities
        best_id = max(tied, key=lambda i: location_scores.get(i, 0))
        best_auth = next((a for a in AUTHORITIES_KNOWLEDGE_BASE if a["id"] == best_id), None)
    elif location_scores:
        top_score = max(location_scores.values())
        best_id = next(i for i, s in location_scores.items() if s == top_score)
        best_auth = next((a for a in AUTHORITIES_KNOWLEDGE_BASE if a["id"] == best_id), None)

    # Default fallback based on general civic category heuristics
    if not best_auth:
        if any(w in clean_text for w in ["road", "street", "pothole", "gutter", "drain"]):
            return AUTHORITIES_KNOWLEDGE_BASE[11], 0.6  # Dept of Urban Roads
        return AUTHORITIES_KNOWLEDGE_BASE[13], 0.5   # Accra Metro Assembly fallback

    confidence = min(0.5 + (keyword_scores.get(best_auth["id"], 0) * 0.05), 0.98)

    return best_auth, round(confidence, 2)


# Priority tiers — MUST stay in sync with backend/src/services/classification-rules.js
PRIORITY_KEYWORDS = {
    "EMERGENCY": [
        "emergency", "collapse", "gas explosion", "explosion", "casualty", "unconscious", "dying", "armed robbery",
        "armed robber", "gunpoint", "fatal", "toxic spill", "electrocution", "active fire",
    ],
    "HIGH": [
        "hazard", "deep crater", "flooding", "blackout", "live wire", "transformer", "burst main", "contamination",
        "expired medication", "expired medicine", "open manhole", "urgent",
    ],
    "MEDIUM": [
        "unpaid", "delay", "pothole", "choked", "leak", "faded", "bad network",
    ],
}


def calculate_priority(category: str, title: str = "", description: str = "") -> str:
    """
    Score urgency from the report title AND description.

    The title MUST be scanned too — emergency keywords are frequently present
    only in the headline ("Armed robbery near Circle Overpass").
    """
    text = _normalise(f"{title} {description}")

    for tier in ("EMERGENCY", "HIGH", "MEDIUM"):
        for keyword in PRIORITY_KEYWORDS[tier]:
            if _phrase_matches(text, keyword):
                return tier

    return "LOW"


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "FixGH AI Complaint Organizer",
        "authorities_count": len(AUTHORITIES_KNOWLEDGE_BASE),
    }


@app.post("/v1/classify-and-route")
def classify_and_route(data: CategorizeRequest):
    """
    Primary AI triage endpoint:
    1. Filters spam & noise
    2. Categorizes into one of 40 official Ghanaian authorities
    3. Scores priority and returns actionable metadata
    """
    is_valid, filter_reason = filter_spam(data.title, data.description)
    if not is_valid:
        return {
            "is_valid": False,
            "filter_reason": filter_reason,
            "authority": None,
            "priority": "LOW",
            "category": "Filtered / Spam",
            "confidence": 0.0,
        }

    matched_auth, confidence = classify_authority(data.title, data.description, data.location_text)
    priority = calculate_priority(matched_auth["category"], data.title, data.description)

    return {
        "is_valid": True,
        "filter_reason": None,
        "authority": {
            "id": matched_auth["id"],
            "name": matched_auth["name"],
            "email": matched_auth["email"],
            "category": matched_auth["category"],
        },
        "category": matched_auth["category"],
        "priority": priority,
        "confidence": confidence,
    }


@app.post("/v1/categorize")
def categorize(data: CategorizeRequest):
    """
    Backwards-compatible categorization endpoint
    """
    res = classify_and_route(data)
    if not res["is_valid"]:
        return {"category": "Other", "confidence": 0.0}
    return {
        "category": res["category"],
        "authority": res["authority"],
        "confidence": res["confidence"]
    }


@app.post("/v1/score-priority")
def score_priority(data: ReportData):
    priority = calculate_priority(data.category or "", data.title or "", data.description or "")
    return {"priority_score": priority}


@app.post("/v1/generate-monthly-digest")
def generate_monthly_digest(data: MonthlyDigestRequest):
    """
    Generates an executive monthly synthesis for a specific authority
    based on the complaints collected during the month.
    """
    total = len(data.complaints)
    if total == 0:
        return {
            "executive_summary": f"No public grievances were logged for {data.authority_name} during {data.month_label}.",
            "critical_highlights": [],
            "hotspots": [],
            "urgency_breakdown": {"EMERGENCY": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0},
        }

    emergencies = [c for c in data.complaints if c.priority == "EMERGENCY"]
    highs = [c for c in data.complaints if c.priority == "HIGH"]

    urgency_breakdown = {
        "EMERGENCY": len(emergencies),
        "HIGH": len(highs),
        "MEDIUM": len([c for c in data.complaints if c.priority == "MEDIUM"]),
        "LOW": len([c for c in data.complaints if c.priority == "LOW" or not c.priority]),
    }

    # Extract locations / hotspots
    locs = [c.location_text for c in data.complaints if c.location_text]
    unique_locs = list(dict.fromkeys(locs))[:5]

    executive_summary = (
        f"During {data.month_label}, a total of {total} verified citizen incident reports were filed under {data.authority_name}'s "
        f"jurisdiction via FixGH. Critical interventions are required for {len(emergencies) + len(highs)} high-urgency incidents. "
        f"Key community reports are concentrated across: {', '.join(unique_locs) if unique_locs else 'multiple metropolitan districts'}."
    )

    critical_highlights = [
        f"[{c.priority or 'HIGH'}] {c.title} — {c.location_text or 'Location tagged in GPS'}"
        for c in (emergencies + highs)[:5]
    ]

    return {
        "executive_summary": executive_summary,
        "critical_highlights": critical_highlights,
        "hotspots": unique_locs,
        "urgency_breakdown": urgency_breakdown,
        "total_count": total,
    }
