"""
Property Health Score Engine

Combines all project analytics into one easy-to-understand score.
"""


# ------------------------------------------
# Rating Generator
# ------------------------------------------

def get_rating(score):

    if score >= 90:
        return "★★★★★"

    elif score >= 80:
        return "★★★★☆"

    elif score >= 70:
        return "★★★☆☆"

    elif score >= 60:
        return "★★☆☆☆"

    return "★☆☆☆☆"


# ------------------------------------------
# Property Status
# ------------------------------------------

def get_status(score):

    if score >= 90:
        return "Excellent Property"

    elif score >= 80:
        return "Very Good Property"

    elif score >= 70:
        return "Good Property"

    elif score >= 60:
        return "Average Property"

    return "Needs Careful Evaluation"


# ------------------------------------------
# Price Fairness
# ------------------------------------------

def calculate_price_score(price_status):

    if price_status == "Underpriced":
        return 25

    elif price_status == "Fairly Priced":
        return 20

    return 10


# ------------------------------------------
# Risk Score
# ------------------------------------------

def calculate_risk_score(risk):

    if risk == "Low":
        return 20

    elif risk == "Medium":
        return 15

    return 8


# ------------------------------------------
# Main Engine
# ------------------------------------------

def calculate_property_health_score(

    investment_score,

    infrastructure_score,

    price_status,

    risk

):

    # -----------------------------
    # Investment
    # -----------------------------

    investment_component = (
        investment_score / 100
    ) * 30

    # -----------------------------
    # Infrastructure
    # -----------------------------

    infrastructure_component = (
        infrastructure_score / 10
    ) * 25

    # -----------------------------
    # Price Fairness
    # -----------------------------

    price_component = calculate_price_score(
        price_status
    )

    # -----------------------------
    # Risk
    # -----------------------------

    risk_component = calculate_risk_score(
        risk
    )

    total_score = round(

        investment_component +

        infrastructure_component +

        price_component +

        risk_component,

        2

    )

    return {

        "Health Score": total_score,

        "Rating": get_rating(total_score),

        "Status": get_status(total_score),

        "Breakdown": {

            "Investment": round(
                investment_component,
                2
            ),

            "Infrastructure": round(
                infrastructure_component,
                2
            ),

            "Price Fairness": price_component,

            "Risk": risk_component

        }

    }