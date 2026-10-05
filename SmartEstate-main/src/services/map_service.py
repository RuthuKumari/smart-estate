from geopy.geocoders import Nominatim
import folium

geolocator = Nominatim(user_agent="house_price_app")


# ----------------------------------------
# Get Coordinates
# ----------------------------------------

from geopy.geocoders import Nominatim
import folium

geolocator = Nominatim(user_agent="house_price_app", timeout=10)


def get_location_coordinates(place):
    try:
        location = geolocator.geocode(place)
    except Exception:
        return None, None

    if location:
        return location.latitude, location.longitude

    return None, None


# ----------------------------------------
# Create Map
# ----------------------------------------

def create_map(lat, lon, infrastructure=None):

    m = folium.Map(
        location=[lat, lon],
        zoom_start=14
    )

    # -----------------------------
    # Property Marker
    # -----------------------------

    folium.Marker(
        [lat, lon],
        tooltip="Property Location",
        popup="🏠 Property",
        icon=folium.Icon(color="red", icon="home")
    ).add_to(m)

    # -----------------------------
    # Infrastructure Markers
    # -----------------------------

    if infrastructure is not None:

        marker_colors = {
            "Hospital": "blue",
            "School": "green",
            "Mall": "purple",
            "Bus Stop": "orange"
        }

        marker_icons = {
            "Hospital": "plus-sign",
            "School": "education",
            "Mall": "shopping-cart",
            "Bus Stop": "bus"
        }

        for facility_type, facility in infrastructure.items():

            if facility is None:
                continue

            popup_text = f"""
            <b>{facility_type}</b><br>
            {facility["name"]}<br>
            Distance: {facility["distance"]} km
            """

            folium.Marker(
                [facility["lat"], facility["lon"]],
                popup=popup_text,
                tooltip=facility_type,
                icon=folium.Icon(
                    color=marker_colors.get(facility_type, "blue"),
                    icon=marker_icons.get(facility_type, "info-sign"),
                    prefix="glyphicon"
                )
            ).add_to(m)

    return m