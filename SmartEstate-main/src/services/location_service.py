from src.services.map_service import get_location_coordinates

# --------------------------------------------------
# Ames Housing Neighborhood Search Strings
# --------------------------------------------------
# These search strings are used for geocoding.
# We append "Ames, Iowa" to improve accuracy.

NEIGHBORHOOD_LOCATION = {

    "Blmngtn": "Bloomington Heights, Ames, Iowa",
    "Blueste": "Bluestem, Ames, Iowa",
    "BrDale": "Briardale, Ames, Iowa",
    "BrkSide": "Brookside, Ames, Iowa",
    "ClearCr": "Clear Creek, Ames, Iowa",
    "CollgCr": "College Creek, Ames, Iowa",
    "Crawfor": "Crawford, Ames, Iowa",
    "Edwards": "Edwards, Ames, Iowa",
    "Gilbert": "Gilbert, Ames, Iowa",
    "IDOTRR": "Iowa DOT Railroad Area, Ames, Iowa",
    "MeadowV": "Meadow Village, Ames, Iowa",
    "Mitchel": "Mitchell, Ames, Iowa",
    "NAmes": "North Ames, Ames, Iowa",
    "NPkVill": "Northpark Villa, Ames, Iowa",
    "NWAmes": "Northwest Ames, Ames, Iowa",
    "NoRidge": "Northridge, Ames, Iowa",
    "NridgHt": "Northridge Heights, Ames, Iowa",
    "OldTown": "Old Town, Ames, Iowa",
    "SWISU": "Southwest of Iowa State University, Ames, Iowa",
    "Sawyer": "Sawyer, Ames, Iowa",
    "SawyerW": "Sawyer West, Ames, Iowa",
    "Somerst": "Somerset, Ames, Iowa",
    "StoneBr": "Stone Brook, Ames, Iowa",
    "Timber": "Timberland, Ames, Iowa",
    "Veenker": "Veenker, Ames, Iowa"

}


# --------------------------------------------------
# Get Coordinates from Neighborhood Code
# --------------------------------------------------

def get_coordinates_from_neighborhood(neighborhood_code):
    """
    Returns latitude and longitude for a dataset neighborhood.
    Falls back to Ames city center if the neighborhood
    cannot be geocoded.
    """

    place = NEIGHBORHOOD_LOCATION.get(
        neighborhood_code,
        "Ames, Iowa"
    )

    lat, lon = get_location_coordinates(place)

    # Fallback to Ames city center
    if lat is None or lon is None:
        lat, lon = get_location_coordinates("Ames, Iowa")

    return lat, lon