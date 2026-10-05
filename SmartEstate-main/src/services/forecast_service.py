from prophet import Prophet

def forecast_prices(data):

    model = Prophet()

    model.fit(data)

    future = model.make_future_dataframe(periods=365*5)

    forecast = model.predict(future)

    return forecast