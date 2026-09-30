"""
NovaSphere Tech Nexus - FastAPI Backend
A beginner-friendly REST API for managing tech events and student registrations.
Features clean endpoints, in-memory storage, input validation, and CORS support.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# 1. Initialize FastAPI application
app = FastAPI(
    title="NovaSphere Tech Nexus API",
    description="Backend API for NovaSphere 3D Tech Nexus application",
    version="1.0.0"
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

# In-memory storage for registrations (simple and requires no external database)
registrations = []

# Sample technical events data
SAMPLE_EVENTS = [
    {
        "id": 1,
        "title": "Full-Stack 3D Web Graphics & WebGL",
        "category": "3D & Web",
        "icon": "🪐",
        "badge": "Beginner Friendly",
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
        "seats_left": 4,
        "date": "2026-10-30",
        "time": "4:30 PM - 6:30 PM",
        "location": "Cybersecurity Sandbox Lab",
        "description": "Discover ethical hacking techniques, web vulnerability defense, OWASP guidelines, and cryptographic keys through gamified CTF challenges.",
        "speaker": "Tanya Miller (Offensive Security Lead)"
    }
]

# 4. API Endpoints

@app.get("/")
def read_root():
    """Welcome root endpoint to verify API health."""
    return {
        "message": "Welcome to NovaSphere Tech Nexus API!",
        "status": "online",
        "version": "1.0.0",
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

# Convenient entry point to run with: python main.py
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
