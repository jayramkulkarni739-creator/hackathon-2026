"""
NovaSphere - Personalized AI Experiences Backend
A beginner-friendly REST API for managing tech events, student registrations,
and Personalized AI Event Recommendations (Hackathon 2026 Theme).

Features clean endpoints, in-memory storage, input validation, and CORS support.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# 1. Initialize FastAPI application
app = FastAPI(
    title="NovaSphere Personalized AI Experiences API",
    description="Backend API for NovaSphere Personalized AI Experiences Platform",
    version="1.1.0"
)

# 2. Enable CORS (Cross-Origin Resource Sharing)
# This allows the frontend running on a different port (e.g., Live Server on 5500,
# file:// protocol, or Python http.server on 3000) to communicate with this backend on port 8000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],          # Allows GET, POST, OPTIONS, etc.
    allow_headers=["*"],          # Allows all HTTP headers
)

# 3. Pydantic Models for Request Validation
class StudentRegistration(BaseModel):
    name: str
    email: str
    event_id: Optional[int] = None

class RecommendationRequest(BaseModel):
    """
    Request model for the Personalized AI Experiences recommendation engine.
    - interests: list of topic strings selected by the student (e.g. ["AI/ML", "Web"])
    - skill_level: student's self-assessed experience level ("Beginner", "Intermediate", "Advanced")
    """
    interests: List[str] = []
    skill_level: Optional[str] = "Beginner"

# In-memory storage for registrations (simple and requires no external database)
registrations = []

# Sample technical events data with topics and difficulty levels
SAMPLE_EVENTS = [
    {
        "id": 1,
        "title": "Full-Stack 3D Web Graphics & WebGL",
        "category": "3D & Web",
        "icon": "🪐",
        "badge": "Beginner Friendly",
        "level": "Beginner",
        "topics": ["3D/WebGL", "Web"],
        "seats_left": 22,
        "date": "2026-10-06",
        "time": "4:00 PM - 6:00 PM",
        "location": "Innovation Lab 3 & Spatial VR Stream",
        "description": "Master interactive 3D web interfaces, CSS 3D transforms, shaders, and spatial canvas rendering with zero prior experience.",
        "speaker": "Elena Vance (Creative Technologist)"
    },
    {
        "id": 2,
        "title": "Autonomous AI Agents & Neural Architectures",
        "category": "Artificial Intelligence",
        "icon": "🤖",
        "badge": "High Demand",
        "level": "Advanced",
        "topics": ["AI/ML", "Data Science"],
        "seats_left": 7,
        "date": "2026-10-12",
        "time": "3:00 PM - 5:30 PM",
        "location": "Auditorium Hall Alpha",
        "description": "Explore practical agentic AI workflows, LLM orchestration, and fine-tuning with hands-on Python and FastAPI integration.",
        "speaker": "Dr. Alex Rivera (AI Research Fellow)"
    },
    {
        "id": 3,
        "title": "NovaHacks 2026: 24h Campus Hackathon",
        "category": "Hackathon",
        "icon": "⚡",
        "badge": "Flagship 24h",
        "level": "Intermediate",
        "topics": ["Web", "AI/ML", "Cloud"],
        "seats_left": 40,
        "date": "2026-10-18",
        "time": "9:00 AM - 6:00 PM",
        "location": "NovaSphere Main Atrium",
        "description": "Collaborate in teams to build innovative full-stack, AI, and spatial apps. Win prizes, build your portfolio, and receive mentor support.",
        "speaker": "NovaSphere Dev Council"
    },
    {
        "id": 4,
        "title": "Cloud-Native DevOps & Container Matrix",
        "category": "Cloud & DevOps",
        "icon": "☁️",
        "badge": "Hands-on Lab",
        "level": "Intermediate",
        "topics": ["Cloud", "Cybersecurity"],
        "seats_left": 15,
        "date": "2026-10-24",
        "time": "5:00 PM - 7:00 PM",
        "location": "Virtual / Live Discord Stage",
        "description": "Demystify cloud infrastructure, container orchestration, Docker fundamentals, and automated CI/CD pipelines simplified for beginners.",
        "speaker": "Marcus Chen (Principal Cloud Engineer)"
    },
    {
        "id": 5,
        "title": "Zero-Trust Cybersecurity & Cryptography",
        "category": "Security",
        "icon": "🛡️",
        "badge": "Limited Seats",
        "level": "Advanced",
        "topics": ["Cybersecurity", "Cloud"],
        "seats_left": 4,
        "date": "2026-10-30",
        "time": "4:30 PM - 6:30 PM",
        "location": "Cybersecurity Sandbox Lab",
        "description": "Discover ethical hacking techniques, web vulnerability defense, OWASP guidelines, and cryptographic keys through gamified CTF challenges.",
        "speaker": "Tanya Miller (Offensive Security Lead)"
    },
    {
        "id": 6,
        "title": "Data Science & Predictive Modeling Lab",
        "category": "Artificial Intelligence",
        "icon": "📊",
        "badge": "Hands-on Lab",
        "level": "Beginner",
        "topics": ["Data Science", "AI/ML"],
        "seats_left": 18,
        "date": "2026-11-04",
        "time": "2:00 PM - 4:00 PM",
        "location": "Data Science Studio B",
        "description": "Hands-on introduction to Python data analysis, pandas, visualizations, and training your first predictive ML model.",
        "speaker": "Sarah Jenkins (Lead Data Scientist)"
    }
]

# 4. API Endpoints

@app.get("/")
def read_root():
    """Welcome root endpoint to verify API health."""
    return {
        "message": "Welcome to NovaSphere Personalized AI Experiences API!",
        "status": "online",
        "version": "1.1.0",
        "hackathon_theme": "Personalized AI Experiences",
        "documentation": "/docs"
    }

@app.get("/api/events")
def get_events():
    """
    GET /api/events
    Returns a list of upcoming technical events formatted as JSON.
    """
    return {
        "status": "success",
        "total_events": len(SAMPLE_EVENTS),
        "events": SAMPLE_EVENTS
    }

@app.post("/api/register")
def register_student(registration: StudentRegistration):
    """
    POST /api/register
    Accepts a student's name and email, validates them, and registers the student.
    """
    cleaned_name = registration.name.strip()
    cleaned_email = registration.email.strip()

    # Basic validations
    if not cleaned_name:
        raise HTTPException(status_code=400, detail="Student name cannot be empty.")
    if len(cleaned_name) < 2:
        raise HTTPException(status_code=400, detail="Student name must be at least 2 characters.")
    if not cleaned_email or "@" not in cleaned_email or "." not in cleaned_email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    # Save to our in-memory list (no external database required)
    new_entry = {
        "id": len(registrations) + 1,
        "name": cleaned_name,
        "email": cleaned_email,
        "event_id": registration.event_id
    }
    registrations.append(new_entry)

    return {
        "status": "success",
        "message": f"Congratulations {cleaned_name}! You are registered with NovaSphere.",
        "data": new_entry
    }

@app.post("/api/recommend")
def recommend_events(request: RecommendationRequest):
    """
    POST /api/recommend
    Personalized AI Experiences Recommendation Engine.

    1. Receives student's selected interests (list of topics) and skill level (Beginner/Intermediate/Advanced).
    2. Scores each event based on how many topics match the student's interests.
    3. Adds a bonus if the event level matches the student's skill level.
    4. Computes a match percentage and a personalized 'why this suits you' sentence naming matching topics.
    5. Returns events sorted by score (highest match first).
    Uses simple, clean Python logic without external databases or paid API keys.
    """
    # Clean inputs (strip whitespace and handle casing gracefully)
    student_interests = [i.strip() for i in request.interests if i.strip()]
    student_interests_lower = [i.lower() for i in student_interests]
    student_level = (request.skill_level or "Beginner").strip()

    scored_events = []

    for event in SAMPLE_EVENTS:
        event_topics = event.get("topics", [])
        event_level = event.get("level", "Beginner")

        # Step 1: Find all topics that match student's interests
        matching_topics = [
            topic for topic in event_topics
            if topic.lower() in student_interests_lower
        ]
        topic_match_count = len(matching_topics)

        # Step 2: Check if event difficulty level matches the student's skill level
        level_match = (event_level.lower() == student_level.lower())

        # Step 3: Compute recommendation score
        # 10 points per matched topic + 5 bonus points if difficulty matches
        score = (topic_match_count * 10) + (5 if level_match else 0)

        # Step 4: Calculate match percentage (0% to 100%)
        if student_interests:
            # Overlap ratio between matching topics and event's total topics
            overlap_ratio = topic_match_count / max(len(event_topics), 1)
            base_pct = overlap_ratio * 70                  # Up to 70% from topic alignment
            bonus_pct = 25 if level_match else 5           # Up to 25% bonus for matching skill level
            calculated_pct = round(base_pct + bonus_pct)

            # Baseline guarantee when no topics directly match
            if topic_match_count == 0:
                calculated_pct = 30 if level_match else 15

            # Clamp between 15% and 98%
            match_percentage = min(98, max(15, calculated_pct))
        else:
            # If no specific topics were selected, level match decides the score
            match_percentage = 75 if level_match else 35

        # Step 5: Generate personalized "why this suits you" sentence naming matching topics
        if matching_topics:
            topics_str = ", ".join(matching_topics)
            if level_match:
                reason = f"Perfect match for your interest in {topics_str}, crafted at your {student_level} skill level!"
            else:
                reason = f"Recommended for your interest in {topics_str}, featuring practical exercises to advance your skills."
        else:
            if level_match:
                reason = f"Aligned with your {student_level} skill level to help you explore new tech horizons."
            else:
                reason = f"Great workshop in {event.get('category')} to broaden your developer toolkit."

        # Package event with scoring data
        event_entry = dict(event)
        event_entry["score"] = score
        event_entry["match_percentage"] = match_percentage
        event_entry["reason"] = reason
        event_entry["matching_topics"] = matching_topics
        scored_events.append(event_entry)

    # Step 6: Sort by score descending (best match first), using match_percentage as tiebreaker
    scored_events.sort(key=lambda x: (x["score"], x["match_percentage"]), reverse=True)

    return {
        "status": "success",
        "student_profile": {
            "interests": student_interests,
            "skill_level": student_level
        },
        "total_recommendations": len(scored_events),
        "recommendations": scored_events
    }

# Convenient entry point to run with: python main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
