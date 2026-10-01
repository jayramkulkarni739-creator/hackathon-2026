# NovaSphere 3D Student Tech Nexus

Hackathon theme: **Personalized AI Experiences**

NovaSphere is a student tech events platform with a 3D interface. Students choose their interests and skill level, and the app recommends the best events for them with a match percentage and a short reason.

## Features
- Personalized event recommendations (POST /api/recommend)
- Live events list from the FastAPI backend (GET /api/events)
- Student registration with a 3D holographic pass (POST /api/register)
- Interactive 3D design, search and category filters

## How the recommendation works
Each event has topics and a difficulty level. The backend scores every event by how many topics match the student's interests, adds a bonus when the level matches, and returns the events sorted by match percentage. No database or API key is needed.

## How to run
Backend:

    cd backend
    pip install -r requirements.txt
    python -m uvicorn main:app --reload --port 8000

Frontend (in a second terminal):

    cd frontend
    python -m http.server 3000

Then open http://localhost:3000

## Tech stack
Python, FastAPI, HTML, CSS, JavaScript

## Note
Event data and statistics are sample demo data.