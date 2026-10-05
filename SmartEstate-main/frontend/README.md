# smartestate — Frontend

React + Vite + Tailwind frontend for the AI Real Estate Intelligence Platform.
Talks to the FastAPI backend in `api/main.py`.

## Setup

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

Opens at `http://localhost:5173`. Make sure the backend is running first:

\`\`\`bash
# from the project root, in another terminal
python -m uvicorn api.main:app --reload --port 8000
\`\`\`

CORS is already configured in `api/main.py` to allow `http://localhost:5173`.