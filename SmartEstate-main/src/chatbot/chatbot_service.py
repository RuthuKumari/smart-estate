def property_advisor(question):

    if "investment" in question.lower():
        return "This area has good investment potential."

    if "price" in question.lower():
        return "Price is predicted using machine learning models."

    return "Please ask about property investment or pricing."