import pandas as pd
import numpy as np
import os
import joblib

from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import r2_score, mean_squared_error
from xgboost import XGBRegressor


# =========================
# 1. LOAD DATA
# =========================

def load_data():

    base_dir = os.path.dirname(os.path.dirname(__file__))

    data_path = os.path.join(base_dir, "data", "train.csv")

    df = pd.read_csv(data_path)

    return df


# =========================
# 2. PREPROCESSING
# =========================

def preprocess_data(df):

    # Drop ID
    df = df.drop("Id", axis=1)

    # Log transform target
    df["SalePrice"] = np.log1p(df["SalePrice"])

    # Fill categorical None
    none_cols = [
        "PoolQC","MiscFeature","Alley","Fence","FireplaceQu",
        "GarageType","GarageFinish","GarageQual","GarageCond",
        "BsmtQual","BsmtCond","BsmtExposure","BsmtFinType1","BsmtFinType2"
    ]

    for col in none_cols:
        if col in df.columns:
            df[col] = df[col].fillna("None")

    # Numerical → median
    num_cols = df.select_dtypes(include=np.number).columns

    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())

    # Categorical → mode
    cat_cols = df.select_dtypes(include="object").columns

    for col in cat_cols:
        df[col] = df[col].fillna(df[col].mode()[0])


    # =========================
    # FEATURE ENGINEERING
    # =========================

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
    df = pd.get_dummies(df, drop_first=True)

    return df


# =========================
# 3. TRAIN MODEL
# =========================

def train_model(df):

    X = df.drop("SalePrice", axis=1)
    y = df["SalePrice"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    param_grid = {
        'n_estimators': [400, 600, 800],
        'learning_rate': [0.03, 0.05, 0.07],
        'max_depth': [3, 4, 5],
        'subsample': [0.7, 0.8, 0.9],
        'colsample_bytree': [0.7, 0.8, 0.9]
    }

    xgb = XGBRegressor(random_state=42)

    random_search = RandomizedSearchCV(
        estimator=xgb,
        param_distributions=param_grid,
        n_iter=20,
        cv=5,
        scoring='r2',
        verbose=1,
        n_jobs=-1
    )

    random_search.fit(X_train, y_train)

    best_model = random_search.best_estimator_

    # =========================
    # EVALUATION
    # =========================

    preds = best_model.predict(X_test)

    r2 = r2_score(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))

    print("\nBest Parameters:", random_search.best_params_)
    print("Final R2 Score:", r2)
    print("Final RMSE:", rmse)

    return best_model, X.columns


# =========================
# 4. SAVE MODEL
# =========================

def save_model(model, feature_columns):

    base_dir = os.path.dirname(os.path.dirname(__file__))

    models_dir = os.path.join(base_dir, "models")

    os.makedirs(models_dir, exist_ok=True)

    model_path = os.path.join(models_dir, "house_price_model.pkl")

    features_path = os.path.join(models_dir, "model_features.pkl")

    joblib.dump(model, model_path)

    joblib.dump(feature_columns, features_path)

    print("\nModel saved successfully inside models/")


# =========================
# MAIN EXECUTION
# =========================

if __name__ == "__main__":

    print("Loading data...")
    df = load_data()

    print("Preprocessing data...")
    df = preprocess_data(df)

    print("Training model...")
    model, feature_columns = train_model(df)

    print("Saving model...")
    save_model(model, feature_columns)

    print("\nTraining pipeline completed successfully.")