import pandas as pd
import numpy as np
import joblib
import os


# ===============================
# LOAD MODEL AND FEATURE COLUMNS
# ===============================

base_dir = os.path.dirname(os.path.dirname(__file__))

model_path = os.path.join(base_dir, "models", "house_price_model.pkl")
features_path = os.path.join(base_dir, "models", "model_features.pkl")

model = joblib.load(model_path)
model_features = joblib.load(features_path)


# ===============================
# PREPROCESS INPUT
# ===============================

def preprocess_input(input_dict):

    df = pd.DataFrame([input_dict])

    # FEATURE ENGINEERING (same as training)

    df["TotalSF"] = df["TotalBsmtSF"] + df["1stFlrSF"] + df["2ndFlrSF"]

    df["HouseAge"] = df["YrSold"] - df["YearBuilt"]
    df["RemodAge"] = df["YrSold"] - df["YearRemodAdd"]
    df["GarageAge"] = df["YrSold"] - df["GarageYrBlt"]

    df["TotalBath"] = (
        df["FullBath"]
        + (0.5 * df["HalfBath"])
        + df["BsmtFullBath"]
        + (0.5 * df["BsmtHalfBath"])
    )

    df = df.drop(["YearBuilt", "YearRemodAdd", "GarageYrBlt"], axis=1)

    # One hot encoding
    df = pd.get_dummies(df)

    # Align with training features
    df = df.reindex(columns=model_features, fill_value=0)

    return df


# ===============================
# PREDICTION FUNCTION
# ===============================

def predict_price(input_dict):

    processed_input = preprocess_input(input_dict)

    prediction_log = model.predict(processed_input)[0]

    # Reverse log transform
    prediction = np.expm1(prediction_log)

    return float(prediction)


# ===============================
# TEST PREDICTION
# ===============================

if __name__ == "__main__":

    sample_input = {

        "MSSubClass": 60,
        "LotArea": 8450,
        "OverallQual": 7,
        "OverallCond": 5,
        "YearBuilt": 2003,
        "YearRemodAdd": 2003,
        "TotalBsmtSF": 856,
        "1stFlrSF": 856,
        "2ndFlrSF": 854,
        "FullBath": 2,
        "HalfBath": 1,
        "BsmtFullBath": 1,
        "BsmtHalfBath": 0,
        "BedroomAbvGr": 3,
        "KitchenAbvGr": 1,
        "TotRmsAbvGrd": 8,
        "Fireplaces": 0,
        "GarageCars": 2,
        "GarageArea": 548,
        "GarageYrBlt": 2003,
        "YrSold": 2008
    }

    price = predict_price(sample_input)

    print("Predicted House Price:", price)