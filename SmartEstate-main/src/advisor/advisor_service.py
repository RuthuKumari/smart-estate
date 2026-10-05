"""
AI Property Advisor Engine

This module converts model outputs into
human-friendly real estate advice.
"""

# ---------------------------------------
# Price Analysis
# ---------------------------------------

def analyze_price(predicted_price, asking_price):

    difference = predicted_price - asking_price

    percent = abs(difference) / predicted_price * 100

    if difference > 0:

        return {

            "status":"Underpriced",

            "message":"The asking price is below the predicted market value.",

            "difference":round(difference,2),

            "percentage":round(percent,2)

        }

    elif difference < 0:

        return {

            "status":"Overpriced",

            "message":"The asking price is higher than the predicted market value.",

            "difference":round(abs(difference),2),

            "percentage":round(percent,2)

        }

    else:

        return {

            "status":"Fairly Priced",

            "message":"The asking price closely matches the predicted value.",

            "difference":0,

            "percentage":0

        }


# ---------------------------------------
# Investment Recommendation
# ---------------------------------------

def investment_recommendation(
    investment_score,
    infrastructure_score
):

    final_score = (

        investment_score*0.6 +

        infrastructure_score*10*0.4

    )

    if final_score>=80:

        return "Excellent Investment"

    elif final_score>=65:

        return "Good Investment"

    elif final_score>=50:

        return "Average Investment"

    return "High Risk Investment"


# ---------------------------------------
# Family Suitability
# ---------------------------------------

def family_suitability(score_data):

    strengths = score_data["Strengths"]

    score = 0

    if "Schools" in strengths:

        score += 40

    if "Hospitals" in strengths:

        score += 30

    if "Parks" in strengths:

        score += 20

    if "Bus Stops" in strengths:

        score += 10

    if score>=80:

        return "Excellent"

    elif score>=60:

        return "Good"

    elif score>=40:

        return "Average"

    return "Limited"


# ---------------------------------------
# Risk Assessment
# ---------------------------------------

def assess_risk(price_status, infrastructure_score):

    risk = 0

    if price_status=="Overpriced":

        risk += 50

    elif price_status=="Fairly Priced":

        risk += 20

    if infrastructure_score<5:

        risk += 30

    elif infrastructure_score<7:

        risk += 10

    if risk<=20:

        return "Low"

    elif risk<=50:

        return "Medium"

    return "High"


# ---------------------------------------
# Confidence
# ---------------------------------------

def confidence_score(
    investment_score,
    infrastructure_score
):

    confidence = (

        investment_score*0.5 +

        infrastructure_score*10*0.5

    )

    return round(confidence,1)


# ---------------------------------------
# Generate Summary
# ---------------------------------------

def generate_summary(
    predicted_price,
    asking_price,
    investment_score,
    infrastructure_report
):

    price = analyze_price(
        predicted_price,
        asking_price
    )

    infrastructure_score = infrastructure_report[
        "Overall Score"
    ]

    recommendation = investment_recommendation(

        investment_score,

        infrastructure_score

    )

    family = family_suitability(

        infrastructure_report

    )

    risk = assess_risk(

        price["status"],

        infrastructure_score

    )

    confidence = confidence_score(

        investment_score,

        infrastructure_score

    )

    return {

        "Price Analysis":price,

        "Investment Recommendation":recommendation,

        "Family Suitability":family,

        "Risk":risk,

        "Confidence":confidence

    }