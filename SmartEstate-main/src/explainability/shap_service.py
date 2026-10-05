import shap
import joblib

model = joblib.load("../../models/house_price_model.pkl")

explainer = shap.TreeExplainer(model)

def explain_prediction(data):

    shap_values = explainer.shap_values(data)

    return shap_values