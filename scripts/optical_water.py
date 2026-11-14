"""Optical water area (Sentinel-2 L2A, MNDWI > 0, clouds masked with SCL) on the same 20 m grid as a NISAR site window,
for the S2 scene closest to each radar date (within +-3 days, cloud <= 10% inside the window). Mosaics tiles of the same day.
Writes site/data/<site>/optical_water.json. Usage: python scripts/optical_water.py <site> [--seed-lon LON --seed-lat LAT | --seeds "LON,LAT;LON,LAT"] [--cloud-classes 3,8,9]
Note: SCL class 10 (thin cirrus) is often set on clear water; dropping it from the mask (--cloud-classes 3,8,9) avoids cutting water bodies apart."""
import sys, glob, json, datetime as dt, numpy as np, requests, rasterio, pyproj
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
from scipy import ndimage as nd
site = sys.argv[1]; a = sys.argv
seeds = [tuple(map(float, p.split(","))) for p in a[a.index("--seeds")+1].split(";")] if "--seeds" in a else []
CLOUD = [int(c) for c in a[a.index("--cloud-classes")+1].split(",")] if "--cloud-classes" in a else [3, 8, 9, 10]   # SCL classes treated as cloud/shadow
if "--seed-lon" in a: seeds.append((float(a[a.index("--seed-lon")+1]), float(a[a.index("--seed-lat")+1])))
z = np.load(sorted(glob.glob(f"cache/{site}/gcov_*.npz"))[0]); x, y, epsg = z["x"], z["y"], int(z["epsg"])
dx = abs(x[1]-x[0]); B = (x.min()-dx/2, y.min()-dx/2, x.max()+dx/2, y.max()+dx/2); H, W = len(y), len(x)
inv = pyproj.Transformer.from_crs(epsg, 4326, always_xy=True); lo0, la0 = inv.transform(B[0], B[1]); lo1, la1 = inv.transform(B[2], B[3])
radar = json.load(open(f"site/data/{site}/water.json"))
def read(href, rs):
    with rasterio.open(href) as s:
        if s.crs.to_epsg() != epsg: return None
        return s.read(1, window=from_bounds(*B, s.transform), out_shape=(H, W), boundless=True, fill_value=0, resampling=rs).astype(float)
out = {"dates_radar": [], "dates_s2": [], "scenes": [], "s2_water_km2": [], "radar_water_km2": [], "cloud_pct": []}
for d, rw in zip(radar["dates"], radar["water_km2"]):
    t = dt.datetime.strptime(d, "%Y%m%d")
    feats = requests.post("https://earth-search.aws.element84.com/v1/search", json={"collections": ["sentinel-2-l2a"], "bbox": [lo0, la0, lo1, la1],
        "datetime": f"{(t-dt.timedelta(days=3)):%Y-%m-%d}T00:00:00Z/{(t+dt.timedelta(days=3)):%Y-%m-%d}T23:59:59Z", "limit": 50}, timeout=60).json()["features"]
    days = sorted({f["properties"]["datetime"][:10] for f in feats}, key=lambda s: abs((dt.datetime.strptime(s, "%Y-%m-%d")-t).days))
    best = None
    for day in days:
        fs = [f for f in feats if f["properties"]["datetime"][:10] == day]
        g = np.zeros((H, W)); sw = np.zeros((H, W)); scl = np.zeros((H, W))
        for f in fs:
            gg = read(f["assets"]["green"]["href"], Resampling.average)
            if gg is None: continue
            m = (gg > 0) & (g == 0)
            g[m] = gg[m]; sw[m] = read(f["assets"]["swir16"]["href"], Resampling.average)[m]; scl[m] = read(f["assets"]["scl"]["href"], Resampling.nearest)[m]
        valid = g > 0; cloud = np.isin(scl, CLOUD) & valid
        cpct = 100 * cloud.sum() / max(valid.sum(), 1)
        if valid.mean() < 0.95 or cpct > 10: continue
        best = (day, [f["id"] for f in fs], g, sw, cloud, cpct); break
    if not best: print(d, "no clear S2 scene"); continue
    day, ids, g, sw, cloud, cpct = best
    w = ((g - sw) / (g + sw + 1e-6) > 0) & ~cloud & (g > 0)
    lab, n = nd.label(w)
    if seeds:
        T = pyproj.Transformer.from_crs(4326, epsg, always_xy=True); keep = set()
        for lo, la in seeds:
            fx, fy = T.transform(lo, la); v = lab[int(np.abs(np.sort(y)[::-1]-fy).argmin()), int(np.abs(np.sort(x)-fx).argmin())]   # S2 rows run north to south
            if v: keep.add(v)
        body = np.isin(lab, list(keep))
    else:
        body = lab == int(np.argmax(nd.sum(w, lab, range(1, n+1)))) + 1
    km2 = float(body.sum() * dx * dx / 1e6)
    for k, v in zip(out, [d, day, ids, round(km2, 2), rw, round(cpct, 2)]): out[k].append(v)
    print(d, day, round(km2, 2), "radar", rw, "cloud%", round(cpct, 2))
json.dump(out, open(f"site/data/{site}/optical_water.json", "w"), indent=1)
