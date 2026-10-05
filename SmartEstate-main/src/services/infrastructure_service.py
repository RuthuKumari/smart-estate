import math
import requests


# ----------------------------------------
# Distance Calculation (Haversine Formula)
# ----------------------------------------

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Returns distance between two coordinates in kilometers.
    """

    R = 6371

    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return round(R * c, 2)


# ----------------------------------------
# Search Nearby Places
# ----------------------------------------

def search_places(query, latitude, longitude, limit=5):
    """
    Search nearby places using OpenStreetMap Nominatim.
    Returns multiple nearby places sorted by distance.
    """

    url = "https://nominatim.openstreetmap.org/search"

    params = {
        "q": query,
        "format": "jsonv2",
        "limit": limit
    }

    headers = {
        "User-Agent": "house-price-project"
    }

    try:
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=10
        )

        response.raise_for_status()

        data = response.json()

        facilities = []

        for place in data:

            lat = float(place["lat"])
            lon = float(place["lon"])

            facilities.append({

                "name": place["display_name"],

                "lat": lat,

                "lon": lon,

                "distance": calculate_distance(
                    latitude,
                    longitude,
                    lat,
                    lon
                )

            })

        facilities.sort(
            key=lambda x: x["distance"]
        )

        return facilities

    except Exception:

        return []


# ----------------------------------------
# Infrastructure Detection
# ----------------------------------------

def get_nearby_infrastructure(latitude, longitude):

    return {

        "Hospitals": search_places(
            f"hospital near {latitude}, {longitude}",
            latitude,
            longitude
        ),

        "Schools": search_places(
            f"school near {latitude}, {longitude}",
            latitude,
            longitude
        ),

        "Restaurants": search_places(
            f"restaurant near {latitude}, {longitude}",
            latitude,
            longitude
        ),

        "Shopping": search_places(
            f"shopping mall near {latitude}, {longitude}",
            latitude,
            longitude
        ),

        "Parks": search_places(
            f"park near {latitude}, {longitude}",
            latitude,
            longitude
        ),

        "Bus Stops": search_places(
            f"bus stop near {latitude}, {longitude}",
            latitude,
            longitude
        )

    }


# ----------------------------------------
# Infrastructure Score
# ----------------------------------------

def score_distance(distance):

    if distance is None:
        return 0

    if distance <= 0.5:
        return 2.5

    elif distance <= 1:
        return 2

    elif distance <= 2:
        return 1.5

    elif distance <= 5:
        return 1

    return 0


def calculate_infrastructure_score(infrastructure):

    score = 0

    for facility in infrastructure.values():

        if facility is not None:

            score += score_distance(
                facility["distance"]
            )

    return round(score, 2)
'''
we'll use:
geopy (already in your project) for geocoding
requests to query the Nominatim Search API for nearby amenities

This approach is:

✅ Simpler
✅ More reliable
✅ Easier to debug
✅ No API key required
✅ Uses OpenStreetMap data

So you do not actually need overpy for the implementation I recommend.
Hospital ✔
Mary Greeley Medical Center
Distance: 1.63 km

School ✔
Ames High School
Distance: 0.97 km

Mall ✘
None

Bus Stop ✔
Distance: 0.33 km

Infrastructure Score: 6.0

This means:

✅ Your service is successfully connecting to OpenStreetMap.
✅ It can find nearby facilities.
✅ Distance calculation is working.
✅ Infrastructure scoring is working.

Earlier we built the infrastructure module using OpenStreetMap Nominatim Search. While it works, it isn't ideal for a real estate analytics platform.

Instead, I recommend we use the Overpass API, which is specifically designed for querying OpenStreetMap features (hospitals, schools, parks, etc.) within a geographic radius.

This gives us:

More accurate nearby places.
Multiple results instead of one.
Better infrastructure scoring.
Much richer context for the AI Property Advisor.
'''