# Student Tech Hub 🎓💻

A beginner-friendly full-stack web application designed for students to discover upcoming campus technical events and register online. Built with a lightweight **Python FastAPI** backend and a responsive **HTML, CSS, and Vanilla JavaScript** frontend.

---

## 📌 Features

- **Frontend**: Clean, modern responsive interface with interactive 3D elements, real-time search, category filters, and an interactive registration pass.
- **Backend**: Python FastAPI REST API with endpoints to fetch upcoming events (`GET /api/events`) and register attendees (`POST /api/register`).
- **CORS Enabled**: Allows seamless cross-origin communication between the frontend and backend.
- **Simple Architecture**: In-memory storage without requiring external databases or heavy frameworks.

---

## 📁 Project Structure

```text
hackathon-2026/
├── frontend/
│   ├── index.html       # Webpage structure & user interface
│   ├── style.css        # Responsive styling & 3D effects
│   └── script.js        # Vanilla JS handling API requests & UI logic
├── backend/
│   ├── main.py          # FastAPI application & REST endpoints
│   └── requirements.txt # Python package dependencies
└── README.md            # Project documentation
```

---

## 🚀 How to Run the Project

### 1. Run the Backend (FastAPI)

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. (Optional) Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   * Or simply run: `python main.py`

- **API URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`

---

### 2. Run the Frontend Locally

No build step or Node.js required! Choose any of the following:

- **VS Code Live Server**: Right-click `frontend/index.html` and choose **"Open with Live Server"**.
- **Python HTTP Server**:
  ```bash
  cd frontend
  python -m http.server 3000
  ```
  Then open `http://localhost:3000` in your web browser.
- **Direct Browser Launch**: Double-click `frontend/index.html` to open it directly in any web browser.

---

## 👥 Contributors

- [@jayramkulkarni739-creator](https://github.com/jayramkulkarni739-creator)
