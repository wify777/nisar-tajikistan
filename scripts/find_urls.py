"""Print HTTPS .h5 URLs of NISAR granules at a point, for a product, a track and a date window.
Usage: python find_urls.py <GCOV|GUNW> <lon> <lat> <track e.g. 084_A> <start> <end>"""
import sys, requests
prod, lon, lat, trk, s, e = sys.argv[1:7]
for c in [f"NISAR_L2_{prod}_V1", f"NISAR_L2_{prod}_PROVISIONAL_V1"]:
    r = requests.get("https://cmr.earthdata.nasa.gov/search/granules.umm_json", params={"short_name": c, "point": f"{lon},{lat}",
        "temporal": f"{s}T00:00:00Z,{e}T23:59:59Z", "page_size": 50, "sort_key": "start_date"}, timeout=60).json()
    for it in r["items"]:
        ur = it["umm"]["GranuleUR"]
        if f"_{trk}_" not in ur: continue
        for x in it["umm"]["RelatedUrls"]:
            if x["Type"] == "GET DATA" and x["URL"].startswith("https") and x["URL"].endswith(".h5"): print(x["URL"])
