import sys
import os

# Add project root directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import streamlit as st
import pandas as pd
import numpy as np
import joblib
import shap
import matplotlib.pyplot as plt
import seaborn as sns
import io

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet

# NEW IMPORTS FOR MAP
from streamlit_folium import st_folium
from src.services.map_service import create_map

from src.services.location_service import (
    get_coordinates_from_neighborhood
)
from src.services.infrastructure_service import (
    get_nearby_infrastructure,
)
from src.services.scoring_service import calculate_infrastructure_score
# ===============================
# PAGE CONFIG
# ===============================

st.set_page_config(
    page_title="Smart Real Estate Advisor",
    page_icon="🏠",
    layout="wide"
)

st.title("🏠 AI-Powered Smart Real Estate Advisory Platform")

# ===============================
# DOCUMENTATION
# ===============================

with st.expander("📘 About This System"):
    st.markdown("""
    This AI system predicts house prices using a tuned XGBoost model trained on historical housing data.

    🔹 It considers:
    - Structural features (area, bathrooms, garage capacity)
    - Construction and finishing quality ratings
    - Location-based influence (Neighborhood)
    - Engineered features such as Total Square Footage and House Age

    🔹 The platform provides:
    - Real-time price prediction
    - Price fairness detection
    - Investment scoring
    - Model comparison dashboard
    - Data analytics insights
    - SHAP-based explainable AI interpretation
    - Downloadable reports (CSV & PDF)

    This system transforms traditional regression into a complete decision-support advisory tool.
    """)

# ===============================
# LOAD MODEL + DATA
# ===============================

@st.cache_resource
def load_resources():

    import os

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    model_path = os.path.join(base_dir, "models", "house_price_model.pkl")
    features_path = os.path.join(base_dir, "models", "model_features.pkl")
    data_path = os.path.join(base_dir, "data", "train.csv")

    model = joblib.load(model_path)
    feature_columns = joblib.load(features_path)
    df_raw = pd.read_csv(data_path)

    return model, feature_columns, df_raw

model, feature_columns, df_raw = load_resources()

# ===============================
# SIDEBAR INPUTS
# ===============================

st.sidebar.header("Property Details")

overall_qual = st.sidebar.slider("Overall Quality", 1, 10, 5)
overall_cond = st.sidebar.slider("Overall Condition", 1, 10, 5)
lot_area = st.sidebar.number_input("Lot Area (sq ft)", 1000, 20000, 5000)

total_bsmt_sf = st.sidebar.number_input("Basement Area (sq ft)", 0, 3000, 500)
first_flr = st.sidebar.number_input("1st Floor Area (sq ft)", 300, 3000, 1000)
second_flr = st.sidebar.number_input("2nd Floor Area (sq ft)", 0, 2000, 500)

garage_cars = st.sidebar.slider("Garage Capacity", 0, 4, 1)
full_bath = st.sidebar.slider("Full Bathrooms", 0, 4, 2)
half_bath = st.sidebar.slider("Half Bathrooms", 0, 2, 1)

year_built = st.sidebar.slider("Year Built", 1900, 2025, 2000)
year_sold = 2010

neighborhood = st.sidebar.selectbox(
    "Neighborhood",
    sorted(df_raw["Neighborhood"].unique())
)

kitchen_qual = st.sidebar.selectbox(
    "Kitchen Quality",
    ["Ex", "Gd", "TA", "Fa"]
)

bsmt_qual = st.sidebar.selectbox(
    "Basement Quality",
    ["Ex", "Gd", "TA", "Fa", "None"]
)



# ===============================
# PREPROCESS INPUT
# ===============================

input_dict = {col: 0 for col in feature_columns}

input_dict["OverallQual"] = overall_qual
input_dict["OverallCond"] = overall_cond
input_dict["LotArea"] = lot_area
input_dict["TotalBsmtSF"] = total_bsmt_sf
input_dict["1stFlrSF"] = first_flr
input_dict["2ndFlrSF"] = second_flr
input_dict["GarageCars"] = garage_cars

total_sf = total_bsmt_sf + first_flr + second_flr
house_age = year_sold - year_built
total_bath = full_bath + (0.5 * half_bath)

if "TotalSF" in input_dict:
    input_dict["TotalSF"] = total_sf

if "HouseAge" in input_dict:
    input_dict["HouseAge"] = house_age

if "TotalBath" in input_dict:
    input_dict["TotalBath"] = total_bath

neigh_col = f"Neighborhood_{neighborhood}"
if neigh_col in input_dict:
    input_dict[neigh_col] = 1

kitchen_col = f"KitchenQual_{kitchen_qual}"
if kitchen_col in input_dict:
    input_dict[kitchen_col] = 1

bsmt_col = f"BsmtQual_{bsmt_qual}"
if bsmt_col in input_dict:
    input_dict[bsmt_col] = 1

input_df = pd.DataFrame([input_dict])

prediction_log = model.predict(input_df)[0]
prediction_price = np.expm1(prediction_log)

# ===============================
# TABS
# ===============================

tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "🏠 Smart Advisor",
    "📊 Model Dashboard",
    "📈 Data Insights",
    "🧠 Why This Price?",
    "🗺 Location Insights"
])

# ===============================
# TAB 1 — SMART ADVISOR
# ===============================

with tab1:

    col1, col2 = st.columns(2)

    with col1:

        st.subheader("💰 Predicted Property Price")

        st.success(f"${prediction_price:,.2f}")

        asking_price = st.number_input(
            "Enter Asking Price",
            50000,
            2000000,
            int(prediction_price)
        )

        difference = prediction_price - asking_price

        if difference > 10000:
            st.success("Underpriced — Good Investment")

        elif difference < -10000:
            st.error("Overpriced — High Risk")

        else:
            st.info("Fairly Priced")

    with col2:

        investment_score = (
            overall_qual * 3 +
            garage_cars * 1.5 +
            total_bath * 1.2 -
            house_age * 0.5
        )

        investment_score = max(
            0,
            min(100, investment_score * 2)
        )

        st.subheader("Investment Score")

        st.progress(int(investment_score))

        st.write(f"{investment_score:.2f} / 100")

    st.subheader("Price Comparison")

    neigh_avg = df_raw.groupby("Neighborhood")["SalePrice"].mean()

    chart_df = pd.DataFrame({
        "Predicted": [prediction_price],
        "Neighborhood Avg": [neigh_avg[neighborhood]]
    })

    st.bar_chart(chart_df)

    st.subheader("Top 5 Premium Neighborhoods")

    st.table(
        neigh_avg.sort_values(ascending=False).head(5)
    )

    # =========================
    # CSV EXPORT
    # =========================

    result_df = pd.DataFrame({
        "Predicted Price": [prediction_price],
        "Investment Score": [investment_score],
        "Neighborhood": [neighborhood]
    })

    csv = result_df.to_csv(index=False).encode("utf-8")

    st.download_button(
        "Download CSV Report",
        csv,
        "prediction_report.csv",
        "text/csv"
    )

    # =========================
    # PDF EXPORT
    # =========================

    def generate_pdf(pred_price, invest_score, neighborhood):

        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter
        )

        elements = []

        styles = getSampleStyleSheet()

        elements.append(
            Paragraph(
                "Smart Real Estate Advisor Report",
                styles["Title"]
            )
        )

        elements.append(Spacer(1, 20))

        elements.append(
            Paragraph(
                f"Predicted Price: ${pred_price:,.2f}",
                styles["Normal"]
            )
        )

        elements.append(
            Paragraph(
                f"Investment Score: {invest_score:.2f}/100",
                styles["Normal"]
            )
        )

        elements.append(
            Paragraph(
                f"Neighborhood: {neighborhood}",
                styles["Normal"]
            )
        )

        doc.build(elements)

        buffer.seek(0)

        return buffer

    pdf_buffer = generate_pdf(
        prediction_price,
        investment_score,
        neighborhood
    )

    st.download_button(
        "Download PDF Report",
        pdf_buffer,
        "prediction_report.pdf",
        "application/pdf"
    )

# ===============================
# TAB 2 — MODEL DASHBOARD
# ===============================

with tab2:

    st.subheader("Model Performance Comparison")

    model_results = pd.DataFrame({
        "Model": [
            "Linear Regression",
            "Random Forest",
            "XGBoost"
        ],
        "R² Score": [
            0.838,
            0.884,
            0.912
        ]
    })

    st.bar_chart(
        model_results.set_index("Model")
    )

    st.subheader("Top Feature Importance")

    importances = model.feature_importances_

    indices = np.argsort(importances)[-15:]

    fig, ax = plt.subplots()

    ax.barh(
        range(len(indices)),
        importances[indices]
    )

    ax.set_yticks(
        range(len(indices))
    )

    ax.set_yticklabels(
        [feature_columns[i] for i in indices]
    )

    st.pyplot(fig)

# ===============================
# TAB 3 — DATA INSIGHTS
# ===============================

with tab3:

    st.subheader("SalePrice Distribution (Original)")

    fig, ax = plt.subplots()

    sns.histplot(
        df_raw["SalePrice"],
        bins=40,
        kde=True,
        ax=ax
    )

    st.pyplot(fig)

    st.subheader("SalePrice Distribution (Log Transformed)")

    log_price = np.log1p(df_raw["SalePrice"])

    fig2, ax2 = plt.subplots()

    sns.histplot(
        log_price,
        bins=40,
        kde=True,
        ax=ax2
    )

    st.pyplot(fig2)

    st.subheader("Correlation Heatmap")

    corr = df_raw.corr(numeric_only=True)

    fig, ax = plt.subplots(figsize=(10,8))

    sns.heatmap(
        corr,
        cmap="coolwarm",
        ax=ax
    )

    st.pyplot(fig)

# ===============================
# TAB 4 — WHY THIS PRICE
# ===============================

with tab4:

    explainer = shap.TreeExplainer(model)

    shap_values = explainer.shap_values(input_df)

    st.subheader("SHAP Waterfall Explanation")

    fig, ax = plt.subplots()

    shap.plots.waterfall(
        shap.Explanation(
            values=shap_values[0],
            base_values=explainer.expected_value,
            data=input_df.iloc[0],
            feature_names=input_df.columns
        ),
        show=False
    )

    st.pyplot(fig)

    st.subheader("Top Influencing Features")

    shap_vals = shap_values[0]

    feature_effects = pd.DataFrame({
        "Feature": input_df.columns,
        "Impact": shap_vals
    })

    top_positive = feature_effects.sort_values(
        "Impact",
        ascending=False
    ).head(3)

    top_negative = feature_effects.sort_values(
        "Impact"
    ).head(3)

    st.write("### Positive Contributors")

    st.table(top_positive)

    st.write("### Negative Contributors")

    st.table(top_negative)

# ===============================
# TAB 5 — LOCATION INSIGHTS
# ===============================

with tab5:

    st.header("📍 Neighborhood Intelligence")

    # ----------------------------------
    # Get Coordinates
    # ----------------------------------

    lat, lon = get_coordinates_from_neighborhood(neighborhood)

    if lat is None:

        st.error("Unable to locate neighborhood.")

    else:

        infrastructure = get_nearby_infrastructure(lat, lon)

        score_data = calculate_infrastructure_score(
            infrastructure
        )

        # ----------------------------------
        # Overall Score
        # ----------------------------------

        col1, col2, col3 = st.columns(3)

        with col1:

            st.metric(
                "Infrastructure Score",
                f"{score_data['Overall Score']}/10"
            )

        with col2:

            st.metric(
                "Grade",
                score_data["Grade"]
            )

        with col3:

            st.metric(
                "Nearby Categories",
                len(infrastructure)
            )

        st.success(
            score_data["Recommendation"]
        )

        st.divider()

        # ----------------------------------
        # Category Scores
        # ----------------------------------

        st.subheader("📊 Category Scores")

        score_df = pd.DataFrame(

            list(
                score_data["Category Scores"].items()
            ),

            columns=["Category", "Score"]

        )

        st.bar_chart(
            score_df.set_index("Category")
        )

        st.divider()

        # ----------------------------------
        # Nearby Facilities
        # ----------------------------------

        st.subheader("🏘 Nearby Infrastructure")

        for category, places in infrastructure.items():

            with st.expander(category):

                if len(places) == 0:

                    st.warning("No nearby locations found.")

                else:

                    for place in places:

                        st.write(

                            f"**{place['name']}**"

                        )

                        st.caption(

                            f"Distance : {place['distance']} km"

                        )

        st.divider()

        # ----------------------------------
        # Strengths
        # ----------------------------------

        st.subheader("✅ Strengths")

        if len(score_data["Strengths"]) == 0:

            st.write("No major strengths detected.")

        else:

            for s in score_data["Strengths"]:

                st.success(s)

        # ----------------------------------

        st.subheader("⚠ Weaknesses")

        if len(score_data["Weaknesses"]) == 0:

            st.write("No major weaknesses.")

        else:

            for w in score_data["Weaknesses"]:

                st.error(w)

        st.divider()

        # ----------------------------------
        # Map
        # ----------------------------------

        map_obj = create_map(lat, lon)

        st_folium(
            map_obj,
            width=900,
            height=550
        )

# ===============================

st.markdown("---")

st.caption("Professional AI Real Estate Advisory System")