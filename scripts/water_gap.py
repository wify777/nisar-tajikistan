"""Why is radar water area larger than optical? Compare the two masks pixel by pixel on the same 20 m grid,
for dates where NISAR and Sentinel-2 imaged the reservoir on the same day.

Radar mask: as water_series.py (HH smoothed 5x5, fixed threshold, connected body, swath-edge buffer, optional opening).
Optical mask: as optical_water.py (MNDWI > 0, SCL cloud masked, connected body).
Then: where are the radar-only pixels? next to the optical shoreline (<= 1 pixel), a bit further, or far away;
and are the far ones on slopes facing away from the radar (Copernicus DEM 30 m)?
Writes analysis/water_gap.json. Usage: python scripts/water_gap.py
"""
import glob, json, os, numpy as np, requests, rasterio, pyproj
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
from rasterio.warp import reproject
from rasterio.transform import from_origin
from scipy import ndimage as nd
os.environ.update(GDAL_HTTP_MAX_RETRY="6", GDAL_HTTP_RETRY_DELAY="3", AWS_NO_SIGN_REQUEST="YES")

ROGUN_SEEDS = [(69.7755, 38.699), (69.7989, 38.7146), (69.8085, 38.7308), (69.8524, 38.7647), (69.868, 38.797), (69.929, 38.8457)]
CASES = [("nurek", "20260709", ["S2B_42SWH_20260709_0_L2A"], dict(thr=-11.9, seeds=None, open_px=0, cloud=[3, 8, 9, 10])),
         ("rogun", "20260709", ["S2B_42SWH_20260709_0_L2A", "S2B_42SWJ_20260709_0_L2A"], dict(thr=-11.9, seeds=ROGUN_SEEDS, open_px=2, cloud=[3, 8, 9])),
         ("rogun", "20260907", ["S2B_42SWH_20260907_0_L2A", "S2B_42SWJ_20260907_0_L2A"], dict(thr=-11.9, seeds=ROGUN_SEEDS, open_px=2, cloud=[3, 8, 9]))]
LOOK_FROM_AZ = 74.0   # NISAR ascending, left-looking: the satellite is at azimuth ~74 deg as seen from the ground


def box(v, k=5):
    v = np.nan_to_num(v, nan=np.nanmedian(v)); p = np.pad(v, k // 2, mode="edge"); s = np.zeros(v.shape)
    for i in range(k):
        for j in range(k): s += p[i:i + v.shape[0], j:j + v.shape[1]]
    return s / (k * k)


def body(mask, seeds_rc):
    lab, n = nd.label(mask)
    if not n: return mask & False
    if seeds_rc:
        keep = {lab[r, c] for r, c in seeds_rc if lab[r, c]}
        return np.isin(lab, list(keep))
    return lab == int(np.argmax(nd.sum(mask, lab, range(1, n + 1)))) + 1


def dem_on_grid(B, H, W):
    out = np.full((H, W), np.nan)
    T = pyproj.Transformer.from_crs(32642, 4326, always_xy=True)
    lo0, la0 = T.transform(B[0], B[1]); lo1, la1 = T.transform(B[2], B[3])
    for lat in range(int(np.floor(la0)), int(np.floor(la1)) + 1):
        for lon in range(int(np.floor(lo0)), int(np.floor(lo1)) + 1):
            name = f"Copernicus_DSM_COG_10_N{lat:02d}_00_E{lon:03d}_00_DEM"
            url = f"https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif"
            a = np.full((H, W), -9999.0)
            with rasterio.open(url) as s:
                reproject(rasterio.band(s, 1), a, dst_transform=from_origin(B[0], B[3], (B[2] - B[0]) / W, (B[3] - B[1]) / H),
                          dst_crs="EPSG:32642", dst_nodata=-9999, resampling=Resampling.bilinear)
            m = (a > -1000) & np.isnan(out); out[m] = a[m]
    return out


res = []
for site, date, scenes, P in CASES:
    z = np.load(f"cache/{site}/gcov_{date}.npz"); x, y = z["x"], z["y"]; H, W = len(y), len(x); dx = abs(x[1] - x[0])
    B = (x.min() - dx / 2, y.min() - dx / 2, x.max() + dx / 2, y.max() + dx / 2)
    T = pyproj.Transformer.from_crs(4326, 32642, always_xy=True)
    seeds_rc = [(int(np.argmin(abs(y - sy))), int(np.argmin(abs(x - sx)))) for sx, sy in (T.transform(*s) for s in P["seeds"])] if P["seeds"] else None
    hh = box(10 * np.log10(np.where(z["hh"] > 0, z["hh"], np.nan)))
    nod = box((~(z["hh"] > 0)).astype(float), 25) > 0.8
    edge = nd.binary_dilation(nod, iterations=40) if nod.any() else nod
    dark = (hh < P["thr"]) & ~edge
    if P["open_px"]: dark = nd.binary_opening(dark, iterations=P["open_px"])
    R = body(dark, seeds_rc)
    g = np.zeros((H, W)); sw = np.zeros((H, W)); scl = np.zeros((H, W)); nir = np.zeros((H, W)); red = np.zeros((H, W))
    for sid in scenes:
        it = requests.get(f"https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{sid}", timeout=60).json()
        for k, arr, rs in (("green", g, Resampling.average), ("swir16", sw, Resampling.average), ("scl", scl, Resampling.nearest),
                           ("nir", nir, Resampling.average), ("red", red, Resampling.average)):
            with rasterio.open(it["assets"][k]["href"]) as s:
                a = s.read(1, window=from_bounds(*B, s.transform), out_shape=(H, W), boundless=True, fill_value=0, resampling=rs).astype(float)
            m = (a > 0) & (arr == 0); arr[m] = a[m]
    cloud = np.isin(scl, P["cloud"]); ok = (g > 0) & ~cloud
    mndwi = (g - sw) / (g + sw + 1e-6); ndvi = (nir - red) / (nir + red + 1e-6)
    O = body((mndwi > 0) & ok, seeds_rc)
    px = dx * dx / 1e6
    dist = nd.distance_transform_edt(~O) * dx            # metres from the nearest optical water pixel
    ronly = R & ~O & ok; oonly = O & ~R
    perim_px = int((O[:, 1:] != O[:, :-1]).sum() + (O[1:] != O[:-1]).sum())
    ring1 = nd.binary_dilation(O) & ~O
    dem = dem_on_grid(B, H, W)
    gy, gx = np.gradient(dem, dx)                         # rows run north -> south
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    aspect = (np.degrees(np.arctan2(-gx, gy)) + 360) % 360   # direction the slope faces (downhill), 0 = north
    away = (np.abs(((aspect - (LOOK_FROM_AZ + 180)) + 180) % 360 - 180) < 45) & (slope > 20)
    far = ronly & (dist > 60)
    land = ~R & ~O & ok & (dist < 2000)
    r = {"site": site, "date": date, "radar_km2": round(R.sum() * px, 2), "optical_km2": round(O.sum() * px, 2),
         "both_km2": round((R & O).sum() * px, 2), "radar_only_km2": round(ronly.sum() * px, 2), "optical_only_km2": round(oonly.sum() * px, 2),
         "radar_only_by_distance_km2": {"<=20m": round((ronly & (dist <= 20)).sum() * px, 2), "20-60m": round((ronly & (dist > 20) & (dist <= 60)).sum() * px, 2),
                                        ">60m": round(far.sum() * px, 2)},
         "optical_perimeter_km": round(perim_px * dx / 1000, 1), "one_pixel_ring_km2": round(ring1.sum() * px, 2),
         "far_radar_only": {"median_hh_db": round(float(np.median(hh[far])), 1) if far.any() else None,
                            "median_mndwi": round(float(np.median(mndwi[far])), 3) if far.any() else None,
                            "median_ndvi": round(float(np.median(ndvi[far])), 3) if far.any() else None,
                            "median_slope_deg": round(float(np.nanmedian(slope[far])), 1) if far.any() else None,
                            "share_on_slopes_facing_away_pct": round(float(away[far].mean() * 100), 1) if far.any() else None},
         "nearby_land_share_on_slopes_facing_away_pct": round(float(away[land].mean() * 100), 1),
         "nearby_land_median_slope_deg": round(float(np.nanmedian(slope[land])), 1)}
    res.append(r); print(json.dumps(r), flush=True)
json.dump(res, open("analysis/water_gap.json", "w"), indent=1)

# Where are the far radar-only pixels at Rogun on 7 Sep? Largest clusters with centre coordinates.
if __name__ == "__main__":
    pass
