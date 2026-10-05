"""
AI Real Estate Intelligence Platform — REST API

This replaces the "everything inline in Streamlit" approach with a proper
FastAPI backend. It reuses your existing model, SHAP explainer, and
services (location_service, infrastructure_service, scoring_service,
map_service, advisor_service) — no retraining, no logic rewritten,
just exposed as clean HTTP endpoints so any frontend (React, etc.)
can consume them.

Run with:
    uvicorn api.main:app --reload --port 8000

The React app should point to http://localhost:8000 in dev.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import time
from google.genai import errors as genai_errors
from typing import Optional, List, Dict, Any

import joblib
import numpy as np
import pandas as pd
import shap
from google import genai
from google.genai import types
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.services.location_service import get_coordinates_from_neighborhood
from src.services.infrastructure_service import get_nearby_infrastructure
from src.services.scoring_service import calculate_infrastructure_score
from src.services.property_health_service import calculate_property_health_score
from src.advisor.advisor_service import (
    analyze_price,
    investment_recommendation,
    family_suitability,
    assess_risk,
    confidence_score,
    generate_summary,
)

# ======================================================================
# APP SETUP
# ======================================================================

app = FastAPI(
    title="AI Real Estate Intelligence Platform API",
    description="Prediction, explainability, location intelligence, and advisor services.",
    version="1.0.0",
)
load_dotenv()

genai_client = genai.Client()  # reads GEMINI_API_KEY from env automatically
CHAT_MODEL = "gemini-3.1-flash-lite"

# Allow the React dev server (Vite default) and general local dev origins.
# Tighten this list before deploying to production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================================
# LOAD MODEL + DATA (once, at startup)
# ======================================================================

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_PATH = os.path.join(BASE_DIR, "models", "house_price_model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "models", "model_features.pkl")
DATA_PATH = os.path.join(BASE_DIR, "data", "train.csv")

model = joblib.load(MODEL_PATH)
feature_columns: List[str] = joblib.load(FEATURES_PATH)
df_raw = pd.read_csv(DATA_PATH)
explainer = shap.TreeExplainer(model)

NEIGHBORHOODS = sorted(df_raw["Neighborhood"].unique().tolist())
NEIGHBORHOOD_AVG_PRICE = df_raw.groupby("Neighborhood")["SalePrice"].mean().to_dict()

# ======================================================================
# SCHEMAS
# ======================================================================

class PropertyInput(BaseModel):
    overall_qual: int = Field(..., ge=1, le=10)
    overall_cond: int = Field(..., ge=1, le=10)
    lot_area: int = Field(..., ge=1000, le=20000)
    total_bsmt_sf: int = Field(..., ge=0, le=3000)
    first_flr: int = Field(..., ge=300, le=3000)
    second_flr: int = Field(..., ge=0, le=2000)
    garage_cars: int = Field(..., ge=0, le=4)
    full_bath: int = Field(..., ge=0, le=4)
    half_bath: int = Field(..., ge=0, le=2)
    year_built: int = Field(..., ge=1900, le=2025)
    year_sold: int = 2010
    neighborhood: str
    kitchen_qual: str
    bsmt_qual: str

    # ---- Advanced fields (optional — sensible defaults keep the
    # existing form working unchanged, but improve prediction accuracy
    # by aligning with the actual training feature engineering) ----
    year_remod_add: Optional[int] = None       # defaults to year_built (no remodel)
    garage_yr_blt: Optional[int] = None         # defaults to year_built
    bsmt_full_bath: int = 0
    bsmt_half_bath: int = 0
    ms_sub_class: int = 60                      # 60 = 2-Story 1946+, most common class
    bedroom_abv_gr: int = 3
    kitchen_abv_gr: int = 1
    tot_rms_abv_grd: int = 7
    fireplaces: int = 0
    garage_area: Optional[int] = None           # defaults to garage_cars * 250 (rough heuristic)


class PredictResponse(BaseModel):
    predicted_price: float
    total_sf: float
    house_age: int
    total_bath: float
    investment_score: float
    neighborhood_avg_price: Optional[float] = None


class AskingPriceInput(PropertyInput):
    asking_price: float


class AdvisorRequest(BaseModel):
    property: PropertyInput
    asking_price: float

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    property: Optional[PropertyInput] = None
    asking_price: Optional[float] = None
# ======================================================================
# SHARED HELPERS
# ======================================================================

def build_input_df(p: PropertyInput) -> pd.DataFrame:
    """Builds the model input row.

    This combines the correct parts of two previously-inconsistent
    approaches found in the codebase:
      - train.py / predict.py compute engineered features correctly
        (HouseAge, RemodAge, GarageAge, TotalBath incl. basement baths)
        but their get_dummies() step never touches Neighborhood /
        KitchenQual / BsmtQual, so those user selections were silently
        ignored.
      - app.py's inline version explicitly set the Neighborhood /
        KitchenQual / BsmtQual one-hot flags, but left RemodAge,
        GarageAge, and basement bathrooms at 0.

    Here we do both: correct engineered numeric features AND correct
    categorical one-hot flags.
    """

    input_dict = {col: 0 for col in feature_columns}

    # Defaults for advanced fields the form may not collect explicitly.
    # Treat 0 the same as "not provided" — a real YearRemodAdd, GarageYrBlt,
    # or GarageArea of 0 is never meaningful, but Swagger's auto-generated
    # example fills unset optional ints with 0 rather than omitting them.
    year_remod_add = p.year_remod_add if p.year_remod_add else p.year_built
    garage_yr_blt = p.garage_yr_blt if p.garage_yr_blt else p.year_built
    garage_area = p.garage_area if p.garage_area else p.garage_cars * 250

    # ---- Raw numeric features ----
    raw_numeric = {
        "MSSubClass": p.ms_sub_class,
        "OverallQual": p.overall_qual,
        "OverallCond": p.overall_cond,
        "LotArea": p.lot_area,
        "TotalBsmtSF": p.total_bsmt_sf,
        "1stFlrSF": p.first_flr,
        "2ndFlrSF": p.second_flr,
        "FullBath": p.full_bath,
        "HalfBath": p.half_bath,
        "BsmtFullBath": p.bsmt_full_bath,
        "BsmtHalfBath": p.bsmt_half_bath,
        "BedroomAbvGr": p.bedroom_abv_gr,
        "KitchenAbvGr": p.kitchen_abv_gr,
        "TotRmsAbvGrd": p.tot_rms_abv_grd,
        "Fireplaces": p.fireplaces,
        "GarageCars": p.garage_cars,
        "GarageArea": garage_area,
        "GrLivArea": p.first_flr + p.second_flr,
    }
    for col, val in raw_numeric.items():
        if col in input_dict:
            input_dict[col] = val

    # ---- Engineered features (matches train.py / predict.py logic) ----
    total_sf = p.total_bsmt_sf + p.first_flr + p.second_flr
    house_age = p.year_sold - p.year_built
    remod_age = p.year_sold - year_remod_add
    garage_age = p.year_sold - garage_yr_blt
    total_bath = (
        p.full_bath
        + (0.5 * p.half_bath)
        + p.bsmt_full_bath
        + (0.5 * p.bsmt_half_bath)
    )

    engineered = {
        "TotalSF": total_sf,
        "HouseAge": house_age,
        "RemodAge": remod_age,
        "GarageAge": garage_age,
        "TotalBath": total_bath,
    }
    for col, val in engineered.items():
        if col in input_dict:
            input_dict[col] = val

    # ---- Categorical one-hot flags ----
    neigh_col = f"Neighborhood_{p.neighborhood}"
    if neigh_col in input_dict:
        input_dict[neigh_col] = 1

    kitchen_col = f"KitchenQual_{p.kitchen_qual}"
    if kitchen_col in input_dict:
        input_dict[kitchen_col] = 1

    bsmt_col = f"BsmtQual_{p.bsmt_qual}"
    if bsmt_col in input_dict:
        input_dict[bsmt_col] = 1

    return pd.DataFrame([input_dict])


def compute_prediction(p: PropertyInput) -> Dict[str, Any]:
    input_df = build_input_df(p)
    prediction_log = model.predict(input_df)[0]
    predicted_price = float(np.expm1(prediction_log))

    total_sf = p.total_bsmt_sf + p.first_flr + p.second_flr
    house_age = p.year_sold - p.year_built
    total_bath = (
        p.full_bath
        + (0.5 * p.half_bath)
        + p.bsmt_full_bath
        + (0.5 * p.bsmt_half_bath)
    )

    investment_score = (
        p.overall_qual * 3
        + p.garage_cars * 1.5
        + total_bath * 1.2
        - house_age * 0.5
    )
    investment_score = max(0.0, min(100.0, investment_score * 2))

    return {
        "input_df": input_df,
        "predicted_price": predicted_price,
        "total_sf": total_sf,
        "house_age": house_age,
        "total_bath": total_bath,
        "investment_score": investment_score,
    }


def get_infrastructure_report(neighborhood: str) -> Dict[str, Any]:
    lat, lon = get_coordinates_from_neighborhood(neighborhood)
    if lat is None:
        raise HTTPException(
            status_code=503,
            detail="Location service is unavailable right now (couldn't reach OpenStreetMap). Try again in a moment.",
        )
    infrastructure = get_nearby_infrastructure(lat, lon)
    score_data = calculate_infrastructure_score(infrastructure)
    return {
        "lat": lat,
        "lon": lon,
        "infrastructure": infrastructure,
        "score_data": score_data,
    }


# ======================================================================
# ENDPOINTS
# ======================================================================

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/metadata")
def metadata():
    """Dropdown options + form bounds for the frontend to render the input form."""
    return {
        "neighborhoods": NEIGHBORHOODS,
        "kitchen_qual_options": ["Ex", "Gd", "TA", "Fa"],
        "bsmt_qual_options": ["Ex", "Gd", "TA", "Fa", "None"],
    }


@app.post("/predict", response_model=PredictResponse)
def predict(p: PropertyInput):
    result = compute_prediction(p)
    return PredictResponse(
        predicted_price=result["predicted_price"],
        total_sf=result["total_sf"],
        house_age=result["house_age"],
        total_bath=result["total_bath"],
        investment_score=result["investment_score"],
        neighborhood_avg_price=NEIGHBORHOOD_AVG_PRICE.get(p.neighborhood),
    )


@app.post("/price-fairness")
def price_fairness(p: AskingPriceInput):
    result = compute_prediction(p)
    fairness = analyze_price(result["predicted_price"], p.asking_price)
    return {
        "predicted_price": result["predicted_price"],
        "asking_price": p.asking_price,
        **fairness,
    }


@app.post("/explain")
def explain(p: PropertyInput):
    """SHAP-based explanation, returned as JSON (no matplotlib) so the
    frontend can render its own waterfall / bar chart with Recharts."""
    result = compute_prediction(p)
    input_df = result["input_df"]

    shap_values = explainer.shap_values(input_df)[0]

    feature_effects = pd.DataFrame({
        "feature": input_df.columns,
        "value": input_df.iloc[0].values,
        "impact": shap_values,
    })

    top_positive = (
        feature_effects.sort_values("impact", ascending=False)
        .head(5)
        .to_dict(orient="records")
    )
    top_negative = (
        feature_effects.sort_values("impact")
        .head(5)
        .to_dict(orient="records")
    )

    return {
        "base_value": float(explainer.expected_value),
        "predicted_log_price": float(model.predict(input_df)[0]),
        "predicted_price": result["predicted_price"],
        "top_positive_contributors": top_positive,
        "top_negative_contributors": top_negative,
    }


@app.get("/location-insights/{neighborhood}")
def location_insights(neighborhood: str):
    return get_infrastructure_report(neighborhood)


@app.post("/advisor")
def advisor(req: AdvisorRequest):
    """Full grounded AI Advisor summary: price fairness, investment
    recommendation, family suitability, risk, and confidence — all
    computed from real scores, not hallucinated."""

    result = compute_prediction(req.property)
    infra_report = get_infrastructure_report(req.property.neighborhood)

    summary = generate_summary(
        predicted_price=result["predicted_price"],
        asking_price=req.asking_price,
        investment_score=result["investment_score"],
        infrastructure_report=infra_report["score_data"],
    )

    # property_health_service.py was already built in the codebase but
    # never wired into the app — its inputs line up exactly with what
    # advisor_service.generate_summary() already computes.
    property_health = calculate_property_health_score(
        investment_score=result["investment_score"],
        infrastructure_score=infra_report["score_data"]["Overall Score"],
        price_status=summary["Price Analysis"]["status"],
        risk=summary["Risk"],
    )

    return {
        "predicted_price": result["predicted_price"],
        "investment_score": result["investment_score"],
        "infrastructure_score": infra_report["score_data"]["Overall Score"],
        "summary": summary,
        "property_health": property_health,
    }


@app.get("/model-dashboard")
def model_dashboard():
    model_results = [
        {"model": "Linear Regression", "r2_score": 0.838},
        {"model": "Random Forest", "r2_score": 0.884},
        {"model": "XGBoost", "r2_score": 0.912},
    ]

    importances = model.feature_importances_
    indices = np.argsort(importances)[-15:][::-1]
    feature_importance = [
        {"feature": feature_columns[i], "importance": float(importances[i])}
        for i in indices
    ]

    return {
        "model_comparison": model_results,
        "feature_importance": feature_importance,
    }


@app.get("/neighborhood-price-comparison/{neighborhood}")
def neighborhood_price_comparison(neighborhood: str):
    if neighborhood not in NEIGHBORHOOD_AVG_PRICE:
        raise HTTPException(status_code=404, detail="Unknown neighborhood.")

    top5 = (
        df_raw.groupby("Neighborhood")["SalePrice"]
        .mean()
        .sort_values(ascending=False)
        .head(5)
    )

    return {
        "neighborhood": neighborhood,
        "neighborhood_avg_price": NEIGHBORHOOD_AVG_PRICE[neighborhood],
        "top_5_premium_neighborhoods": [
            {"neighborhood": n, "avg_price": float(v)} for n, v in top5.items()
        ],
    }
# ======================================================================
# CHATBOT — grounded via Gemini function calling over the platform's
# own analytics. Gemini never invents numbers: every figure it states
# comes from a tool call into compute_prediction / get_infrastructure_report /
# generate_summary / calculate_property_health_score, the exact same
# functions the rest of the app uses.
# ======================================================================

CHAT_SYSTEM_PROMPT = """You are the AI Property Advisor assistant embedded in a real estate
decision-support platform. You help buyers, sellers, and investors understand a
property's predicted price, investment potential, neighborhood infrastructure,
and overall risk.

Rules:
- NEVER state a specific number (price, score, percentage) unless it came from
  a tool call in this conversation. If you don't have the number, call a tool
  to get it, or tell the user you need more information.
- If no property is currently loaded and the user asks something that needs
  one, tell them to fill in the property form first.
- Keep answers concise and conversational — a few sentences, not a report.
- If the user asks something with no real estate connection, politely steer
  the conversation back.
"""


def build_chat_tools(ctx: "ChatRequest"):
    """Builds a fresh set of tool functions bound to this request's property
    context (Gemini's automatic function calling introspects each function's
    type hints and docstring to build its schema, so keep both accurate)."""

    def get_price_prediction() -> dict:
        """Get the predicted market price for the currently loaded property,
        along with total square footage, house age, total bathrooms, and
        investment score. Use this whenever the user asks about price, value,
        or investment score for the property they've entered."""
        if ctx.property is None:
            return {"error": "No property is currently loaded. Ask the user to fill in the property form first."}
        result = compute_prediction(ctx.property)
        return {
            "predicted_price": result["predicted_price"],
            "total_sf": result["total_sf"],
            "house_age": result["house_age"],
            "total_bath": result["total_bath"],
            "investment_score": result["investment_score"],
            "neighborhood_avg_price": NEIGHBORHOOD_AVG_PRICE.get(ctx.property.neighborhood),
        }

    def get_shap_explanation() -> dict:
        """Get a breakdown of which features are pushing the predicted price
        up or down for the currently loaded property, based on SHAP values.
        Use this when the user asks 'why' the price is what it is, or which
        features matter most."""
        if ctx.property is None:
            return {"error": "No property is currently loaded. Ask the user to fill in the property form first."}
        result = compute_prediction(ctx.property)
        input_df = result["input_df"]
        shap_values = explainer.shap_values(input_df)[0]
        feature_effects = pd.DataFrame({"feature": input_df.columns, "impact": shap_values})
        top_positive = feature_effects.sort_values("impact", ascending=False).head(5)
        top_negative = feature_effects.sort_values("impact").head(5)
        return {
            "predicted_price": result["predicted_price"],
            "top_positive_contributors": [
                {"feature": r.feature, "impact": round(float(r.impact), 2)} for r in top_positive.itertuples()
            ],
            "top_negative_contributors": [
                {"feature": r.feature, "impact": round(float(r.impact), 2)} for r in top_negative.itertuples()
            ],
        }

    def get_full_advisor_report(asking_price: Optional[float] = None) -> dict:
        """Get the full advisor verdict for the currently loaded property:
        price fairness vs. asking price, investment recommendation, family
        suitability, risk level, confidence score, and overall property health
        score. If asking_price is not given, uses the asking price already
        provided in context; if neither is available, returns an error asking
        the user for one.

        Args:
            asking_price: The asking price in dollars, if the user just mentioned one.
        """
        if ctx.property is None:
            return {"error": "No property is currently loaded. Ask the user to fill in the property form first."}
        price = asking_price if asking_price is not None else ctx.asking_price
        if price is None:
            return {"error": "No asking price given. Ask the user what asking price they'd like evaluated."}

        result = compute_prediction(ctx.property)
        infra_report = get_infrastructure_report(ctx.property.neighborhood)
        summary = generate_summary(
            predicted_price=result["predicted_price"],
            asking_price=price,
            investment_score=result["investment_score"],
            infrastructure_report=infra_report["score_data"],
        )
        property_health = calculate_property_health_score(
            investment_score=result["investment_score"],
            infrastructure_score=infra_report["score_data"]["Overall Score"],
            price_status=summary["Price Analysis"]["status"],
            risk=summary["Risk"],
        )
        return {
            "predicted_price": result["predicted_price"],
            "investment_score": result["investment_score"],
            "infrastructure_score": infra_report["score_data"]["Overall Score"],
            "summary": summary,
            "property_health": property_health,
        }

    def get_neighborhood_infrastructure(neighborhood: Optional[str] = None) -> dict:
        """Get nearby infrastructure details (hospitals, schools, parks,
        restaurants, shopping, public transport) and the infrastructure score
        for a neighborhood. Defaults to the currently loaded property's
        neighborhood if none is specified.

        Args:
            neighborhood: Neighborhood name. Omit to use the current property's neighborhood.
        """
        target = neighborhood or (ctx.property.neighborhood if ctx.property else None)
        if not target:
            return {"error": "No neighborhood specified and no property is loaded. Ask the user which neighborhood."}
        try:
            report = get_infrastructure_report(target)
        except HTTPException as e:
            return {"error": e.detail}
        return {
            "neighborhood": target,
            "infrastructure": report["infrastructure"],
            "score_data": report["score_data"],
        }

    def compare_top_neighborhoods(neighborhood: Optional[str] = None) -> dict:
        """Get the average sale price for a given neighborhood plus the top 5
        highest-priced neighborhoods overall, for market-comparison questions.
        Defaults to the currently loaded property's neighborhood if none is
        specified.

        Args:
            neighborhood: Neighborhood name. Omit to use the current property's neighborhood.
        """
        target = neighborhood or (ctx.property.neighborhood if ctx.property else None)
        top5 = (
            df_raw.groupby("Neighborhood")["SalePrice"]
            .mean()
            .sort_values(ascending=False)
            .head(5)
        )
        payload = {
            "top_5_premium_neighborhoods": [
                {"neighborhood": n, "avg_price": float(v)} for n, v in top5.items()
            ]
        }
        if target and target in NEIGHBORHOOD_AVG_PRICE:
            payload["neighborhood"] = target
            payload["neighborhood_avg_price"] = NEIGHBORHOOD_AVG_PRICE[target]
        return payload

    return [
        get_price_prediction,
        get_shap_explanation,
        get_full_advisor_report,
        get_neighborhood_infrastructure,
        compare_top_neighborhoods,
    ]


import time
from google.genai import errors as genai_errors


def chat_loop(ctx: "ChatRequest") -> str:
    contents = [
        {
            "role": "model" if m.role == "assistant" else "user",
            "parts": [{"text": m.content}],
        }
        for m in ctx.messages
    ]

    tools = build_chat_tools(ctx)

    last_error = None
    for attempt in range(3):
        try:
            response = genai_client.models.generate_content(
                model=CHAT_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=CHAT_SYSTEM_PROMPT,
                    tools=tools,
                ),
            )
            return (response.text or "").strip() or (
                "I'm having trouble pulling that together right now — could you rephrase your question?"
            )
        except genai_errors.ServerError as e:
            # 503 = model overloaded, transient. Retry with backoff.
            last_error = e
            if attempt < 2:
                time.sleep(1.5 * (attempt + 1))  # 1.5s, then 3s
                continue
            raise

    raise last_error


@app.post("/chat")
def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")
    try:
        reply = chat_loop(req)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chat service error: {e}")
    return {"reply": reply}