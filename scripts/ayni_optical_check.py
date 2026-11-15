"""Ayni: does Sentinel-2 show change where NISAR flagged the 11 July mudflow?

Radar zone = the unbiased test of pair_drop_test.py (event pair 9 -> 21 Jul minus the median of all other pairs,
5x5 smoothing, drop > 0.3) inside 2.5 km of the villages (126 ha). Everything is put on the same 20 m NISAR grid.
Optical pairs (clear Sentinel-2 L2A, SCL cloud/shadow masked):
  event    6 Jul -> 19 Jul (spans 11 Jul)
  controls 16 Jun -> 6 Jul (before) and 19 Jul -> 26 Jul (after)
All four scenes come from the same Sentinel-2 orbit geometry (06:18 UTC pass, view incidence ~8.8 deg), because
mixing the 06:18 and 06:28 passes changes sun azimuth by ~6 deg and makes slopes brighten or darken on their own.
The mixed pair 6 -> 17 Jul is kept in the output only as a warning example.
For each pair: change in NDVI, visible brightness and SWIR reflectance, inside the radar zone vs the rest of the
2.5 km circle. Writes analysis/ayni_optical_check.json and analysis/ayni_optical_check.png.
Usage: python scripts/ayni_optical_check.py
"""
import glob, os, json, numpy as np, requests, rasterio, pyproj
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
os.environ.update(GDAL_HTTP_MAX_RETRY="6", GDAL_HTTP_RETRY_DELAY="3")

fs = sorted(glob.glob("cache/ayni/gunw_*.npz")); U = {os.path.basename(f)[5:22]: np.load(f)["coh"] for f in fs}
z = np.load(fs[0]); x, y = z["x"], z["y"]; H, W = len(y), len(x); dx = abs(x[1] - x[0])
B = (x.min() - dx / 2, y.min() - dx / 2, x.max() + dx / 2, y.max() + dx / 2)
XX, YY = np.meshgrid(x, y)
T = pyproj.Transformer.from_crs(4326, 32642, always_xy=True)
cx, cy = T.transform(68.978, 39.349); circle = (XX - cx) ** 2 + (YY - cy) ** 2 < 2500 ** 2


def box(a, k=5):
    a = np.nan_to_num(a); p = np.pad(a, k // 2, mode="edge"); s = np.zeros(a.shape)
    for i in range(k):
        for j in range(k): s += p[i:i + a.shape[0], j:j + a.shape[1]]
    return s / (k * k)


ev = "20260709_20260721"
zone = (box(U[ev] - np.nanmedian(np.stack([U[k] for k in U if k != ev]), axis=0)) < -0.3) & circle
print("radar zone ha", round(zone.sum() * dx * dx / 1e4, 1))
rest = circle & ~zone


def scene(sid):
    f = f"cache/ayni_s2/{sid}.npz"
    if os.path.exists(f): return dict(np.load(f))
    it = requests.get(f"https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{sid}", timeout=60).json()
    out = {}
    for k in ["blue", "green", "red", "nir", "swir16", "scl"]:
        a = it["assets"][k]; rb = (a.get("raster:bands") or [{}])[0]
        with rasterio.open(a["href"]) as s:
            assert s.crs.to_epsg() == 32642
            v = s.read(1, window=from_bounds(*B, s.transform), out_shape=(H, W), boundless=True, fill_value=0,
                       resampling=Resampling.nearest if k == "scl" else Resampling.average).astype(np.float32)
        if k != "scl": v = np.where(v > 0, v * rb.get("scale", 1e-4) + rb.get("offset", 0.0), np.nan)
        out[k] = v
    os.makedirs("cache/ayni_s2", exist_ok=True); np.savez_compressed(f, **out); return out


S = {d: scene(i) for d, i in [("0616", "S2A_42SVJ_20260616_0_L2A"), ("0706", "S2A_42SVJ_20260706_0_L2A"),
                              ("0719", "S2B_42SVJ_20260719_0_L2A"), ("0726", "S2A_42SVJ_20260726_0_L2A"),
                              ("0717", "S2C_42SVJ_20260717_0_L2A")]}
PAIRS = {"event 6 Jul -> 19 Jul": ("0706", "0719"), "control 16 Jun -> 6 Jul": ("0616", "0706"),
         "control 19 Jul -> 26 Jul": ("0719", "0726"), "mixed geometry 6 Jul -> 17 Jul (do not use)": ("0706", "0717")}
ndvi = lambda s: (s["nir"] - s["red"]) / (s["nir"] + s["red"])
vis = lambda s: (s["blue"] + s["green"] + s["red"]) / 3
bad = lambda s: np.isin(s["scl"], [0, 1, 3, 8, 9, 10]) | np.isnan(s["red"])
res = {"zone_ha": round(float(zone.sum() * dx * dx / 1e4), 1), "ndvi_before_zone_median": None, "pairs": {}}
res["ndvi_before_zone_median"] = round(float(np.nanmedian(ndvi(S["0706"])[zone])), 3)
res["ndvi_before_rest_median"] = round(float(np.nanmedian(ndvi(S["0706"])[rest])), 3)
res["vis_before_zone_median"] = round(float(np.nanmedian(vis(S["0706"])[zone])), 3)
for name, (a, b) in PAIRS.items():
    A, Bb = S[a], S[b]; ok = ~bad(A) & ~bad(Bb)
    d = {"dNDVI": ndvi(Bb) - ndvi(A), "dVIS": vis(Bb) - vis(A), "dSWIR": Bb["swir16"] - A["swir16"]}
    # "changed" pixel: visible or SWIR reflectance changed by more than 0.03 or NDVI by more than 0.1 (either sign)
    ch = (np.abs(d["dVIS"]) > 0.03) | (np.abs(d["dSWIR"]) > 0.03) | (np.abs(d["dNDVI"]) > 0.1)
    r = {"clear_zone_pct": round(float(ok[zone].mean() * 100), 1), "clear_rest_pct": round(float(ok[rest].mean() * 100), 1)}
    for k, v in d.items():
        r[k + "_zone_median"] = round(float(np.nanmedian(v[zone & ok])), 4)
        r[k + "_rest_median"] = round(float(np.nanmedian(v[rest & ok])), 4)
    r["changed_zone_pct"] = round(float(ch[zone & ok].mean() * 100), 1)
    r["changed_rest_pct"] = round(float(ch[rest & ok].mean() * 100), 1)
    res["pairs"][name] = r
    print(name, json.dumps(r))
print("NDVI before: zone", res["ndvi_before_zone_median"], "rest", res["ndvi_before_rest_median"], "visible refl zone", res["vis_before_zone_median"])
json.dump(res, open("analysis/ayni_optical_check.json", "w"), indent=1)

fig, ax = plt.subplots(1, 3, figsize=(15, 5.2), constrained_layout=True)
rgb = lambda s: np.clip(np.dstack([s["red"], s["green"], s["blue"]]) / 0.3, 0, 1)
ext = [x.min(), x.max(), y.min(), y.max()]
for i, (k, t) in enumerate([("0706", "Sentinel-2 6 Jul (before)"), ("0719", "Sentinel-2 19 Jul (after)")]):
    ax[i].imshow(np.nan_to_num(rgb(S[k])), extent=ext); ax[i].contour(x, y, zone.astype(float), levels=[.5], colors="cyan", linewidths=1)
    ax[i].set_title(t + " | cyan: NISAR zone", fontsize=10)
im = ax[2].imshow(vis(S["0719"]) - vis(S["0706"]), extent=ext, cmap="RdBu_r", vmin=-.06, vmax=.06)
ax[2].contour(x, y, zone.astype(float), levels=[.5], colors="k", linewidths=1); ax[2].set_title("change in visible reflectance 6 -> 19 Jul (same orbit)", fontsize=10)
fig.colorbar(im, ax=ax[2], shrink=.8)
for a in ax:
    a.set_xlim(cx - 2600, cx + 2600); a.set_ylim(cy - 2600, cy + 2600); a.set_xticks([]); a.set_yticks([])
fig.suptitle("Ayni: NISAR change zone on Copernicus Sentinel-2 L2A (contains modified Copernicus Sentinel data 2026)", fontsize=10)
fig.savefig("analysis/ayni_optical_check.png", dpi=110)

# Relative test: subtract the circle-wide median change (the whole scene got darker and greener after rain),
# then count zone pixels that lost vegetation AND got relatively brighter, vs the rest of the circle.
rel = {}
for name, (a, b) in PAIRS.items():
    A, Bb = S[a], S[b]; ok = ~bad(A) & ~bad(Bb) & circle
    dn = ndvi(Bb) - ndvi(A); dv = vis(Bb) - vis(A); dn -= np.nanmedian(dn[ok]); dv -= np.nanmedian(dv[ok])
    m = (dn < -0.05) & (dv > 0.01)
    rel[name] = {"zone_pct": round(float(m[zone & ok].mean() * 100), 1), "rest_pct": round(float(m[rest & ok].mean() * 100), 1),
                 "zone_ha": round(float(m[zone & ok].sum() * dx * dx / 1e4), 1),
                 "rel_dNDVI_zone_median": round(float(np.nanmedian(dn[zone & ok])), 3), "rel_dVIS_zone_median": round(float(np.nanmedian(dv[zone & ok])), 4)}
    print("relative", name, rel[name])
res["relative"] = rel
json.dump(res, open("analysis/ayni_optical_check.json", "w"), indent=1)

# Map layer for the site: pixels that lost vegetation and got brighter relative to the 2.5 km circle, same-orbit pair 6 -> 19 Jul.
from PIL import Image
A, Bb = S["0706"], S["0719"]; ok = ~bad(A) & ~bad(Bb)
dn = ndvi(Bb) - ndvi(A); dv = vis(Bb) - vis(A)
dn -= np.nanmedian(dn[ok & circle]); dv -= np.nanmedian(dv[ok & circle])
m = (dn < -0.05) & (dv > 0.01) & ok
rgba = np.zeros(m.shape + (4,), np.uint8); rgba[m] = (255, 40, 200, 210)
Image.fromarray(rgba).save("site/data/ayni/layers/s2change.png", optimize=True)
print("layer pixels", int(m.sum()), "ha", round(float(m.sum() * dx * dx / 1e4), 1))
