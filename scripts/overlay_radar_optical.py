"""Overlay the NISAR change zones on Sentinel-2 true colour, both in the same UTM grid (EPSG:32642).
Contours: cyan = smoothed coherence drop < -0.3 (event pair minus control); red = smoothed HH increase > +3 dB."""
import numpy as np, pyproj, rasterio, matplotlib, json
from rasterio.windows import from_bounds
matplotlib.use("Agg"); import matplotlib.pyplot as plt
lon, lat, half = 68.978, 39.346, 4000
tr = pyproj.Transformer.from_crs(4326, 32642, always_xy=True); X0, Y0 = tr.transform(lon, lat)
L, R, B, T = X0-half, X0+half, Y0-half, Y0+half
def box(a, k=5):
    p = np.pad(a, k//2, mode="edge"); s = np.zeros_like(a, dtype=float)
    for i in range(k):
        for j in range(k): s += p[i:i+a.shape[0], j:j+a.shape[1]]
    return s/(k*k)
coh = box(np.load("analysis/ayni_coh_event.npy") - np.load("analysis/ayni_coh_control.npy"))
# recompute dHH from the cached window would need the arrays; re-derive from the saved PNG run is not possible, so read json-free: use cache if present
import glob, os
dhh = None
if os.path.exists("cache/ayni/gcov_20260709.npz") and os.path.exists("cache/ayni/gcov_20260721.npz"):
    b = np.load("cache/ayni/gcov_20260709.npz"); a = np.load("cache/ayni/gcov_20260721.npz")
    db = lambda v: 10*np.log10(np.where(v > 0, v, np.nan)); dhh = box(np.nan_to_num(db(a["hh"]) - db(b["hh"])))
S2 = {"2026-07-06": None, "2026-07-14": "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/42/S/VJ/2026/7/S2C_42SVJ_20260714_0_L2A/TCI.tif"}
# find the 07-06 scene url from the friend's clear image is unknown; search STAC
import requests
st = requests.post("https://earth-search.aws.element84.com/v1/search", json={"collections": ["sentinel-2-l2a"], "intersects": {"type": "Point", "coordinates": [lon, lat]},
     "datetime": "2026-07-01T00:00:00Z/2026-07-20T00:00:00Z", "limit": 20}, timeout=60).json()
scenes = sorted([(f["properties"]["datetime"][:10], f["properties"].get("eo:cloud_cover"), f["assets"]["visual"]["href"], f["id"]) for f in st["features"]])
for s in scenes: print("S2 scene", s[0], "cloud", s[1], s[3])
pick = {d: h for d, c, h, i in scenes if "42SVJ" in i}
imgs = {}
for d in ["2026-07-06", "2026-07-14"]:
    if d not in pick: print("no scene", d); continue
    with rasterio.open(pick[d]) as src:
        assert src.crs.to_epsg() == 32642, src.crs
        imgs[d] = np.moveaxis(src.read(window=from_bounds(L, B, R, T, src.transform)), 0, -1)
fig, ax = plt.subplots(1, len(imgs), figsize=(8*len(imgs), 8), constrained_layout=True)
ax = np.atleast_1d(ax)
xs = np.linspace(L, R, coh.shape[1]); ys = np.linspace(T, B, coh.shape[0])
dg = tr.transform(68.9814, 39.3474); kz = tr.transform(68.975, 39.346)
for axi, (d, im) in zip(ax, imgs.items()):
    axi.imshow(im, extent=[L, R, B, T])
    axi.contour(xs, ys, coh, levels=[-0.3], colors="cyan", linewidths=1.4)
    if dhh is not None: axi.contour(xs, ys, dhh, levels=[3], colors="red", linewidths=1.0)
    for n, (px, py) in [("Dargh", dg), ("Kazdon", kz)]:
        axi.plot(px, py, "o", mfc="yellow", mec="black", ms=7); axi.annotate(n, (px, py), color="yellow", fontsize=9, xytext=(5, 5), textcoords="offset points")
    axi.set_title(f"Sentinel-2 true colour {d}  |  cyan: NISAR coherence drop < -0.3  |  red: NISAR HH > +3 dB", fontsize=9)
    axi.set_xlim(L+1500, R-1500); axi.set_ylim(B+1500, T-1500); axi.set_xticks([]); axi.set_yticks([])
fig.suptitle("Ayni: NISAR change zones (09.07 -> 21.07) on Copernicus Sentinel-2 L2A (contains modified Copernicus Sentinel data 2026)", fontsize=10)
fig.savefig("analysis/ayni_radar_on_optical.png", dpi=120); print("saved analysis/ayni_radar_on_optical.png", "dHH used:", dhh is not None)
