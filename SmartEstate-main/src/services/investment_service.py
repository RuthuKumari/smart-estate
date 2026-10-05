def investment_score(location_score, price_growth):

    score = location_score + price_growth

    if score > 8:
        return "High Investment Potential"

    if score > 5:
        return "Moderate Investment"

    return "Risky Investment"