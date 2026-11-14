"""Rushan 20 Jul 2026 mudflow: Sentinel-2 L2A change between 16 and 26 July (10 m).
Flags pixels with vegetation loss (NDVI drop > 0.15) and brightening (mean visible reflectance +150), lists the largest
clusters and saves before/after and change images in analysis/. Usage: python scripts/rushan_optical_change.py"""
import os, requests, rasterio, numpy as np, pyproj
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
from scipy import ndimage as nd
from PIL import Image
os.environ.update(GDAL_HTTP_MAX_RETRY="6", GDAL_HTTP_RETRY_DELAY="3")
T = pyproj.Transformer.from_crs(4326, 32642, always_xy=True); inv = pyproj.Transformer.from_crs(32642, 4326, always_xy=True)
x0, y0 = T.transform(71.40, 37.905); x1, y1 = T.transform(71.52, 37.99)
B = (x0, y0, x1, y1); W = int((x1 - x0) / 10); H = int((y1 - y0) / 10)
def load(sid):
    f = f"cache/rushan_s2/{sid}.npz"
    if os.path.exists(f): return dict(np.load(f))
    a = requests.get(f"https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{sid}", timeout=60).json()["assets"]
    out = {}
    for k in ["blue", "green", "red", "nir", "swir16", "scl"]:
        for attempt in range(4):
            try:
                with rasterio.Env(GDAL_HTTP_MAX_RETRY="6", GDAL_HTTP_RETRY_DELAY="3"), rasterio.open(a[k]["href"]) as s:
                    out[k] = s.read(1, window=from_bounds(*B, s.transform), out_shape=(H, W), boundless=True, fill_value=0,
                                    resampling=Resampling.bilinear if k != "scl" else Resampling.nearest).astype(np.float32)
                break
            except Exception as e:
                print("retry", k, attempt, e)
        if k not in out: raise RuntimeError(f"{sid}: band {k} unreadable")
    np.savez_compressed(f, **out); return out
def first_ok(ids):
    for sid in ids:
        try:
            d = load(sid); print("using", sid); return d
        except Exception as e:
            print("skip", sid, e)
    raise SystemExit("no readable scene")
b = first_ok(["S2B_42SYH_20260716_0_L2A", "S2B_42SYG_20260716_0_L2A"])
a = first_ok(["S2B_42SYH_20260726_0_L2A", "S2B_42SYG_20260726_0_L2A", "S2B_42SYG_20260805_0_L2A", "S2B_42SYH_20260815_0_L2A"])
def rgb(d):
    v = np.dstack([d["red"], d["green"], d["blue"]]); return np.clip((v - 1000) / 2000 * 255, 0, 255).astype(np.uint8)
Image.fromarray(np.hstack([rgb(b), np.full((H, 8, 3), 255, np.uint8), rgb(a)])).save("analysis/rushan_s2_0716_0726.png")
ndvi = lambda d: (d["nir"] - d["red"]) / (d["nir"] + d["red"] + 1e-6)
dn = ndvi(a) - ndvi(b); dbr = (a["red"] + a["green"] + a["blue"]) / 3 - (b["red"] + b["green"] + b["blue"]) / 3
cloud = np.isin(a["scl"], [3, 8, 9, 10]) | np.isin(b["scl"], [3, 8, 9, 10])
print("cloud frac", round(float(cloud.mean()), 3), "size", W, H)
ch = nd.binary_opening((dn < -0.15) & (dbr > 150) & ~cloud, iterations=1)
lab, n = nd.label(ch); sz = nd.sum(ch, lab, range(1, n + 1))
for i in np.argsort(sz)[::-1][:12]:
    rr, cc = np.nonzero(lab == i + 1); lo, la = inv.transform(x0 + cc.mean() * 10, y1 - rr.mean() * 10)
    print("ha", round(sz[i] * 0.01, 2), "lon,lat", round(float(lo), 4), round(float(la), 4), "extent m ns/ew", int(rr.max() - rr.min()) * 10, int(cc.max() - cc.min()) * 10)
v = rgb(a).copy(); v[ch] = [255, 0, 255]; Image.fromarray(v).save("analysis/rushan_s2_change.png")
