"""Check that the Earthdata token works for NISAR data. Never prints the token."""
import os, sys, pathlib, requests
import asf_search as asf

tok = pathlib.Path(os.path.expanduser("~/.nasa/earthdata_token")).read_text().strip()
print("token length:", len(tok), "| looks like JWT:", tok.count(".") == 2)

session = asf.ASFSession().auth_with_token(tok)
aoi = "POLYGON((69.0 38.0, 69.9 38.0, 69.9 38.7, 69.0 38.7, 69.0 38.0))"  # Nurek / Vakhsh area, test only
res = asf.search(dataset=["NISAR"], processingLevel=["GCOV"], intersectsWith=aoi, maxResults=3)
print("search results:", len(res))
if not res:
    sys.exit("no results")
url = res[0].properties["url"] if "url" in res[0].properties else res[0].find_urls(extension=".h5")[0]
print("granule:", res[0].properties.get("fileID", "?")[:80])
r = requests.get(url, headers={"Authorization": f"Bearer {tok}", "Range": "bytes=0-7"}, timeout=60, allow_redirects=True)
print("HTTP status:", r.status_code)
print("HDF5 signature ok:", r.content[:4] == b"\x89HDF")
