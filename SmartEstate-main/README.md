# SmartEstate — AI-Powered Real Estate Decision Intelligence Platform

> A full-stack AI platform that predicts property prices, explains every prediction, scores neighborhoods, and gives grounded investment advice — all in one place.

---

## Overview

SmartEstate goes beyond a simple house price predictor. It combines machine learning, explainable AI, live geospatial data, and intelligent decision support into a unified, production-style platform that helps buyers, sellers, and investors make data-driven real estate decisions.

Every number on screen traces back to a real computation — no black boxes, no guesswork.

---

## Live Features

| Feature | Description |
|---|---|
| **Price Prediction** | Predicts property price using a tuned XGBoost model trained on the Ames Housing dataset |
| **Explainable AI (SHAP)** | Shows exactly which features pushed the price up or down for each specific property |
| **Price Fairness Analysis** | Compares the predicted price to an asking price and flags it as Underpriced, Fairly Priced, or Overpriced |
| **Investment Score** | Scores a property's investment potential out of 100 based on quality, garage, bathrooms, and age |
| **Neighborhood Intelligence** | Pulls live infrastructure data from OpenStreetMap and scores nearby hospitals, schools, parks, transit, and more |
| **Interactive Map** | Displays nearby facilities on a live Leaflet map with color-coded markers per category |
| **Property Comparison Engine** | Compares 2–3 properties side by side with a ledger table, price-per-sqft analysis, and a plain-English verdict |
| **AI Property Advisor** | Generates a grounded investment recommendation, family suitability score, risk level, and property health score |
| **Property Health Score** | Combines investment score, infrastructure score, price fairness, and risk into a single 0–100 score with a star rating |
| **Conversational Chatbot** | Answers property-related questions in natural language using the Gemini LLM, grounded in the platform's real data |
| **Model Dashboard** | Shows R² comparison across three models and the top 15 globally most important features |
| **Downloadable Reports** | Export valuation results as CSV or PDF |

---

## Tech Stack

### Backend
- **Python** — core language
- **FastAPI** — REST API framework with auto-generated Swagger docs
- **XGBoost** — the primary regression model (R² = 0.912)
- **SHAP** — per-prediction explainability
- **pandas / numpy / scikit-learn** — data processing and feature engineering
- **geopy** — geocoding neighborhood names to coordinates via OpenStreetMap Nominatim
- **joblib** — model serialization and loading
- **ReportLab** — PDF report generation

### Frontend
- **React** (Vite) — component-based UI framework
- **Tailwind CSS** — utility-first styling and custom design system
- **Recharts** — bar charts (SHAP contributions, feature importance), radar charts (infrastructure scores)
- **Leaflet / react-leaflet** — interactive neighborhood maps
- **React Router** — client-side multi-page navigation

### AI / LLM
- **Google Gemini API** — powers the conversational chatbot on the Chat page

---

## Project Structure

```
SmartEstate/
├── api/
│   └── main.py                  # FastAPI backend — all endpoints
├── src/
│   ├── advisor/
│   │   └── advisor_service.py   # Rule-based investment advisor logic
│   ├── chatbot/
│   │   └── chatbot_service.py   # Chatbot service (Gemini integration)
│   ├── explainability/
│   │   └── shap_service.py      # SHAP explainer wrapper
│   └── services/
│       ├── forecast_service.py       # Price forecasting service
│       ├── infrastructure_service.py # OpenStreetMap infrastructure detection
│       ├── investment_service.py     # Investment scoring logic
│       ├── location_service.py       # Neighborhood geocoding
│       ├── map_service.py            # Coordinate lookup and map creation
│       ├── property_health_service.py# Property health score engine
│       └── scoring_service.py        # Infrastructure scoring and grading
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js        # API client wrapping all endpoints
│   │   ├── components/
│   │   │   ├── Navbar.jsx       # Top navigation bar
│   │   │   ├── PriceTicket.jsx  # Signature price display component
│   │   │   └── ScoreDial.jsx    # Circular score gauge component
│   │   └── pages/
│   │       ├── Home.jsx         # Landing page
│   │       ├── Predict.jsx      # Price prediction + SHAP explanation
│   │       ├── Neighborhood.jsx # Infrastructure analysis + map
│   │       ├── Compare.jsx      # Property comparison engine
│   │       ├── Advisor.jsx      # AI property advisor
│   │       ├── Chat.jsx         # Conversational chatbot
│   │       └── Dashboard.jsx    # Model performance dashboard
├── data/
│   └── train.csv                # Ames Housing dataset
├── models/
│   ├── house_price_model.pkl    # Trained XGBoost model
│   └── model_features.pkl       # Feature column list for inference
├── notebooks/
│   └── 01_EDA.ipynb             # Exploratory data analysis
├── requirements.txt
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Server liveness check |
| GET | `/metadata` | Neighborhood list and quality options for frontend dropdowns |
| POST | `/predict` | Predict property price and investment score |
| POST | `/price-fairness` | Compare predicted price to asking price |
| POST | `/explain` | SHAP feature contribution breakdown |
| GET | `/location-insights/{neighborhood}` | Infrastructure data, score, and coordinates |
| POST | `/advisor` | Full advisor summary including health score |
| GET | `/model-dashboard` | Model comparison metrics and feature importances |
| GET | `/neighborhood-price-comparison/{neighborhood}` | Neighborhood vs. average price comparison |
| POST | `/chat` | Conversational property Q&A |

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/SmartEstate.git
cd SmartEstate
```

### 2. Set Up the Python Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Train the Model

> Skip this step if `models/house_price_model.pkl` already exists in the repo.

```bash
python src/train.py
```

This trains the XGBoost model and saves it to `models/`.

### 4. Start the Backend

```bash
python -m uvicorn api.main:app --reload --port 8000
```

Backend runs at: `http://127.0.0.1:8000`
Interactive API docs: `http://127.0.0.1:8000/docs`

### 5. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

> Both terminals must stay open and running at the same time.

---

## Model Performance

| Model | R² Score |
|---|---|
| Linear Regression | 0.838 |
| Random Forest | 0.884 |
| **XGBoost (in production)** | **0.912** |

The XGBoost model was tuned using `RandomizedSearchCV` with 5-fold cross-validation over `n_estimators`, `learning_rate`, `max_depth`, `subsample`, and `colsample_bytree`.

---

## Dataset

**Ames Housing Dataset** — available on [Kaggle](https://www.kaggle.com/c/house-prices-advanced-regression-techniques)

- ~1,460 residential property sales
- Located in Ames, Iowa, USA
- Sales period: 2006–2010
- ~80 features covering structural quality, neighborhood, lot size, garage, bathrooms, and more

---

## Screenshots

> Add screenshots of each page here after deployment.

| Page | Description |
|---|---|
| Predict | Property form + price ticket + SHAP chart |
| Neighborhood | Infrastructure radar chart + live map |
| Compare | Side-by-side ledger comparison |
| Advisor | Full advisor panel with health score breakdown |
| Chat | Conversational Q&A interface |
| Model | R² comparison + feature importance chart |

---

## Future Improvements

- Price appreciation scenario calculator (1, 3, 5, 10 year projections)
- Upgrade infrastructure detection to OpenStreetMap Overpass API for more accurate radius-based results
- Add LLM function calling so the chatbot can autonomously call `/predict`, `/explain`, and `/advisor` as tools
- User authentication and saved property searches
- Deployment to a public URL (Render / Railway / Vercel)

---

## Author

P Lakshmi Sravani
- GitHub: [sravani1406](https://github.com/sravani1406)

---

## License

This project is licensed under the MIT License.
