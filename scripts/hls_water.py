"""Rogun: water check with NASA HLS v2.0 (HLSL30 Landsat 8/9, HLSS30 Sentinel-2), 30 m, LP DAAC.

1. Water area (MNDWI > 0, bodies touching the reservoir seeds) on clear dates, same window and seeds as the radar.
2. For partly cloudy dates: what share of the 15 September water surface is still water on its cloud-free part.
   This tests the autumn radar dips even when a whole-window cloud rule rejects the scene.
Fmask bits 1-3 (cloud, adjacent to cloud/shadow, cloud shadow) are masked (HLS v2.0 User Guide).
Needs an Earthdata token in ~/.nasa/earthdata_token (never printed). First version of the HLS search by a teammate.
Usage: python scripts/hls_water.py
"""
import os, pathlib, numpy as np, rasterio, pyproj, earthaccess
from rasterio.windows import from_bounds
from scipy import ndimage as nd

os.environ["EARTHDATA_TOKEN"] = pathlib.Path(os.path.expanduser("~/.nasa/earthdata_token")).read_text().strip()
earthaccess.login(strategy="environment")
T = pyproj.Transformer.from_crs(4326, 32642, always_xy=True)
corners = [(69.711385, 38.908110), (70.011218, 38.905898), (70.007914, 38.671630), (69.709060, 38.673824)]
xs, ys = zip(*[T.transform(*c) for c in corners]); B = (min(xs), min(ys), max(xs), max(ys))
RES = 30; W = int((B[2] - B[0]) / RES); H = int((B[3] - B[1]) / RES); PX_KM2 = RES * RES / 1e6
SEEDS = [(69.7755, 38.699), (69.7989, 38.7146), (69.8085, 38.7308), (69.8524, 38.7647), (69.868, 38.797), (69.929, 38.8457)]
seed_rc = [(int((B[3] - y) / RES), int((x - B[0]) / RES)) for x, y in (T.transform(*s) for s in SEEDS)]
BBOX = (69.709, 38.671, 70.012, 38.909)


def read(url, fill):
    with rasterio.open(earthaccess.open([url])[0]) as s:
        assert s.crs.to_epsg() == 32642, s.crs
        return s.read(1, window=from_bounds(*B, s.transform), boundless=True, fill_value=fill, out_shape=(H, W))


def scene(day, sensor):
    gs = earthaccess.search_data(short_name=sensor, bounding_box=BBOX, temporal=(day, day))
    fm = np.full((H, W), 255, np.uint8); g_ = np.zeros((H, W), np.float32); s_ = np.zeros((H, W), np.float32)
    sw = "B06.tif" if sensor == "HLSL30" else "B11.tif"
    for g in gs:
        L = g.data_links()
        for arr, suffix, fill in ((fm, "Fmask.tif", 255), (g_, "B03.tif", -9999), (s_, sw, -9999)):
            a = read([l for l in L if l.endswith(suffix)][0], fill)
            m = (a != 255) & (arr == 255) if suffix == "Fmask.tif" else (a > 0) & (arr == 0)
            arr[m] = a[m]
    valid = fm != 255
    cloud = valid & ((fm & 0b1110) != 0)
    water = (g_ > 0) & (s_ > 0) & ~cloud & ((g_ - s_) / (g_ + s_ + 1e-6) > 0)
    return water, cloud, valid


def body(water):
    lab, _ = nd.label(water)
    keep = {v for r, c in seed_rc for v in np.unique(lab[max(r - 2, 0):r + 3, max(c - 2, 0):c + 3]) if v > 0}
    return np.isin(lab, list(keep))


w, c, v = scene("2026-09-15", "HLSL30"); ref = body(w)
mask = nd.binary_dilation(ref, iterations=5)
print(f"reference 2026-09-15 HLSL30: water {ref.sum() * PX_KM2:.2f} km2, cloud {c.sum() / v.sum() * 100:.1f}%")
for day, sensor in [("2026-08-30", "HLSL30"), ("2026-10-01", "HLSL30"), ("2026-10-09", "HLSL30"),
                    ("2026-10-25", "HLSL30"), ("2026-11-02", "HLSL30")]:
    w, c, v = scene(day, sensor)
    clear_ref = ref & ~c
    line = (f"{day} {sensor}: cloud in window {c.sum() / max(v.sum(), 1) * 100:.1f}%, over reservoir "
            f"{(c & mask).sum() / mask.sum() * 100:.1f}%")
    if clear_ref.sum() > 0.5 * ref.sum():
        line += f", still water on clear part of 15 Sep surface {(w & clear_ref).sum() / clear_ref.sum() * 100:.1f}%"
    if c.sum() / max(v.sum(), 1) <= 0.10:
        line += f", water area {body(w).sum() * PX_KM2:.2f} km2"
    print(line, flush=True)
