"""
Infrastructure Scoring Service
"""

# -------------------------------------------------
# Distance Score
# -------------------------------------------------

def score_distance(distance):

    if distance <= 0.5:
        return 5

    elif distance <= 1:
        return 4

    elif distance <= 2:
        return 3

    elif distance <= 3:
        return 2

    elif distance <= 5:
        return 1

    return 0


# -------------------------------------------------
# Category Score
# -------------------------------------------------

def calculate_category_score(facilities):

    if len(facilities) == 0:
        return 0

    total = 0

    for facility in facilities:

        total += score_distance(
            facility["distance"]
        )

    return round(total / len(facilities), 2)


# -------------------------------------------------
# Category Weights
# -------------------------------------------------

CATEGORY_WEIGHTS = {

    "Hospitals":0.25,

    "Schools":0.20,

    "Bus Stops":0.20,

    "Shopping":0.15,

    "Parks":0.10,

    "Restaurants":0.10

}


# -------------------------------------------------
# Grade Generator
# -------------------------------------------------

def get_grade(score):

    if score >= 9:
        return "A+"

    elif score >= 8:
        return "A"

    elif score >= 7:
        return "B+"

    elif score >= 6:
        return "B"

    elif score >= 5:
        return "C"

    return "Needs Improvement"


# -------------------------------------------------
# Recommendation Generator
# -------------------------------------------------

def generate_recommendation(score):

    if score >= 9:

        return (
            "Outstanding infrastructure with excellent "
            "healthcare, education and transport."
        )

    elif score >= 8:

        return (
            "Very good location suitable for families "
            "and long-term investment."
        )

    elif score >= 7:

        return (
            "Good infrastructure with balanced amenities."
        )

    elif score >= 6:

        return (
            "Average infrastructure. Some facilities "
            "may require longer travel."
        )

    return (
        "Infrastructure is limited. Consider carefully "
        "before investing."
    )


# -------------------------------------------------
# Main Function
# -------------------------------------------------

def calculate_infrastructure_score(data):

    category_scores = {}

    weighted_score = 0

    strengths = []

    weaknesses = []

    for category, facilities in data.items():

        score = calculate_category_score(
            facilities
        )

        category_scores[category] = score

        weight = CATEGORY_WEIGHTS.get(
            category,
            0
        )

        weighted_score += score * weight

        if score >= 4:

            strengths.append(category)

        elif score <= 2:

            weaknesses.append(category)

    overall_score = round(
        weighted_score * 2,
        2
    )
    
    return {

        "Category Scores": category_scores,

        "Overall Score": overall_score,

        "Grade": get_grade(overall_score),

        "Strengths": strengths,

        "Weaknesses": weaknesses,

        "Recommendation": generate_recommendation(
            overall_score
        )

    }