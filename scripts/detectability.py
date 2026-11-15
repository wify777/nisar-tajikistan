"""Where can the coherence test see a mudflow at all? Two independent reasons it can be blind, per orbit:

1. Geometry (Copernicus DEM 30 m + the line-of-sight vector read from the GUNW metadata, analysis/look_geometry.json):
   layover (slope toward the radar steeper than the incidence angle), shadow (terrain toward the radar blocks the ray,
   ray-marched up to 6 km), and grazing view (local incidence > 70 deg: almost no signal comes back).
2. No room to drop: the test needs a drop > 0.3, and coherence never goes below the noise floor (~0.2 in our windows,
   5th percentile of every pair). So a pixel whose usual coherence (median of the 12-day pairs) is below 0.5 cannot fire.

Tests:  Panjakent blind test - were the slopes that changed in orbit 121D visible to 012A and 113A?
        Rushan - the mapped fan and channel.     Every watched village - share of its 2.5 km circle that is watchable.
Writes analysis/detectability.json and site/data/detectability.json. Usage: python scripts/detectability.py"""
import glob, os, json, numpy as np, pyproj, rasterio
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_origin
from scipy import ndimage as nd

R = 2500.0; BASE_MIN = 0.5; GRAZE = 70.0
GEO = json.load(open("analysis/look_geometry.json"))
LONG = {"rushan_d": {"20260620_20260714", "20260714_20260831", "20260831_20260924"}}


def box(a, k=5):
    a = np.nan_to_num(a); p = np.pad(a, k // 2, mode="edge"); s = np.zeros(a.shape)
    for i in range(k):
        for j in range(k): s += p[i:i + a.shape[0], j:j + a.shape[1]]
    return s / (k * k)


def dem_on_grid(x, y):
    dx = abs(x[1] - x[0]); H, W = len(y), len(x)
    B = (x.min() - dx / 2, y.min() - dx / 2, x.max() + dx / 2, y.max() + dx / 2)
    out = np.full((H, W), np.nan); T = pyproj.Transformer.from_crs(32642, 4326, always_xy=True)
    lo0, la0 = T.transform(B[0], B[1]); lo1, la1 = T.transform(B[2], B[3])
    for lat in range(int(np.floor(min(la0, la1))), int(np.floor(max(la0, la1))) + 1):
        for lon in range(int(np.floor(min(lo0, lo1))) , int(np.floor(max(lo0, lo1))) + 1):
            name = f"Copernicus_DSM_COG_10_N{lat:02d}_00_E{lon:03d}_00_DEM"
            a = np.full((H, W), -9999.0)
            with rasterio.open(f"https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif") as s:
                reproject(rasterio.band(s, 1), a, dst_transform=from_origin(B[0], B[3], dx, dx), dst_crs="EPSG:32642",
                          dst_nodata=-9999, resampling=Resampling.bilinear)
            m = (a > -1000) & np.isnan(out); out[m] = a[m]
    return out


def site_data(site):
    fs = sorted(glob.glob(f"cache/{site}/gunw_*.npz")); U = {os.path.basename(f)[5:22]: np.load(f)["coh"] for f in fs}
    z = np.load(fs[0]); x, y = z["x"], z["y"]; assert int(z["epsg"]) == 32642
    dx = abs(x[1] - x[0])
    f = f"cache/{site}/dem.npy"
    if not os.path.exists(f): np.save(f, dem_on_grid(x, y))
    dem = np.load(f)
    g = GEO[site]; le, ln = g["los_e"], g["los_n"]; inc = np.radians(g["incidence_deg"]); lz = np.sqrt(max(0.0, 1 - le * le - ln * ln))
    gy, gx = np.gradient(dem, dx)                       # rows run north -> south: dz/dN = -gy, dz/dE = gx
    dzde, dzdn = gx, -gy
    nrm = np.sqrt(dzde ** 2 + dzdn ** 2 + 1)
    cosloc = (-dzde * le - dzdn * ln + lz) / nrm
    theta_loc = np.degrees(np.arccos(np.clip(cosloc, -1, 1)))
    hu = np.array([le, ln]) / np.hypot(le, ln)         # horizontal direction toward the satellite
    slope_to_sat = np.degrees(np.arctan(dzde * hu[0] + dzdn * hu[1]))   # >0 = ground rises toward the radar (back slope)
    layover = -slope_to_sat >= np.degrees(inc)        # front slope (falls toward the radar) steeper than the incidence angle
    # shadow: does terrain toward the satellite rise above the ray leaving this pixel at the grazing angle?
    rows, cols = np.mgrid[0:len(y), 0:len(x)].astype(float); shadow = np.zeros(dem.shape, bool); cot = 1 / np.tan(inc)
    for s in np.arange(dx, 6000, dx):
        c = cols + s * hu[0] / dx; r = rows - s * hu[1] / dx
        zz = nd.map_coordinates(dem, [r, c], order=1, mode="nearest")
        shadow |= zz > dem + s * cot + 1.0
    graze = (theta_loc > GRAZE) & ~shadow
    keys = [k for k in sorted(U) if k not in LONG.get(site, set())]
    base = np.nanmedian(np.stack([U[k] for k in keys]), axis=0)
    valid = np.isfinite(base)
    good_geo = ~layover & ~shadow & ~graze & np.isfinite(dem)
    watch = good_geo & (base >= BASE_MIN) & valid
    return dict(U=U, x=x, y=y, dem=dem, layover=layover, shadow=shadow, graze=graze, base=base, valid=valid, good_geo=good_geo,
                watch=watch, theta=theta_loc, track=g["track"])


def circle(D, lon, lat, r=R):
    zx, zy = pyproj.Transformer.from_crs(4326, 32642, always_xy=True).transform(lon, lat)
    XX, YY = np.meshgrid(D["x"], D["y"]); return (XX - zx) ** 2 + (YY - zy) ** 2 < r * r


def shares(D, m):
    n = max(int(m.sum()), 1); f = lambda a: round(float((a & m).sum()) / n, 3)
    return {"pixels": int(m.sum()), "layover": f(D["layover"]), "shadow": f(D["shadow"]), "grazing": f(D["graze"]),
            "good_geometry": f(D["good_geo"]), "usual_coh_ge_0.5": f(D["base"] >= BASE_MIN), "watchable": f(D["watch"]),
            "usual_coh_median": round(float(np.nanmedian(D["base"][m])), 3)}


out = {"rule": {"usual_coherence_min": BASE_MIN, "grazing_deg": GRAZE, "circle_m": R}, "geometry": GEO}
S = {s: site_data(s) for s in ["ayni", "panjakent", "panjakent_113a", "panjakent_121d", "rushan_d", "sarez"]}

# 1. Panjakent: zone = pixels flagged by 121D in the event pair (4 -> 16 Jul) inside the circle
P = S["panjakent_121d"]; EV = "20260704_20260716"
oth = np.nanmedian(np.stack([P["U"][k] for k in P["U"] if k != EV]), axis=0)
zone = (box(P["U"][EV] - oth) < -0.3) & circle(P, 67.8004, 39.2326)
ring = circle(P, 67.8004, 39.2326) & ~zone & P["valid"]
out["panjakent_zone_ha"] = round(float(zone.sum()) * 0.04, 1)
out["panjakent"] = {}
for s in ["panjakent", "panjakent_113a", "panjakent_121d"]:
    D = S[s]; out["panjakent"][D["track"]] = {"changed_slopes": shares(D, zone & D["valid"]), "rest_of_circle": shares(D, ring & D["valid"])}
    print("Panjakent", D["track"], "zone:", out["panjakent"][D["track"]]["changed_slopes"], "\n   rest:", out["panjakent"][D["track"]]["rest_of_circle"])
# same slopes, raw drop in the event pair of each ascending orbit
for s in ["panjakent", "panjakent_113a"]:
    D = S[s]; ev = [k for k in D["U"] if k[:8] <= "20260711" <= k[9:] and (int(k[9:]) - int(k[:8])) < 40]
    for k in ev:
        o = np.nanmedian(np.stack([D["U"][q] for q in D["U"] if q != k]), axis=0); dd = (D["U"][k] - o)
        m = zone & D["valid"] & D["watch"]; mm = zone & D["valid"] & ~D["watch"]
        out["panjakent"][D["track"]][f"event_pair_{k}_mean_drop"] = {"watchable_part": round(float(np.nanmean(dd[m])), 3) if m.any() else None,
                                                                     "blind_part": round(float(np.nanmean(dd[mm])), 3) if mm.any() else None}
        print("   ", D["track"], k, out["panjakent"][D["track"]][f"event_pair_{k}_mean_drop"])

# 2. Rushan traces (092D)
D = S["rushan_d"]; inv = pyproj.Transformer.from_crs(32642, 4326, always_xy=True)
XX, YY = np.meshgrid(D["x"], D["y"]); LO, LA = inv.transform(XX, YY)
tr = {"fan": np.hypot((LO - 71.4839) * 88000, (LA - 37.9505) * 111000) < 120,
      "channel": (abs(LO - 71.4525) * 88000 < 60) & (LA > 37.93) & (LA < 37.95)}
out["rushan"] = {k: shares(D, v & D["valid"]) for k, v in tr.items()}
print("Rushan", out["rushan"])

# 3. Ayni: zone flagged in its event pair
A = S["ayni"]; EV = "20260709_20260721"
oth = np.nanmedian(np.stack([A["U"][k] for k in A["U"] if k != EV]), axis=0)
az = (box(A["U"][EV] - oth) < -0.3) & circle(A, 68.978, 39.349)
out["ayni_changed_slopes"] = shares(A, az & A["valid"]); print("Ayni zone", out["ayni_changed_slopes"])

# 4. every watched village
PLACES = [("Dargh (Ayni)", "Дарг (Айни)", "ayni", 68.9814, 39.3474), ("Kazdon (Ayni)", "Каздон (Айни)", "ayni", 68.975, 39.346),
          ("Rashnai Poyon (Panjakent)", "Рашнаи Поён (Пенджикент)", "panjakent", 67.8004, 39.2326),
          ("Rashnai Poyon (Panjakent)", "Рашнаи Поён (Пенджикент)", "panjakent_113a", 67.8004, 39.2326),
          ("Rashnai Poyon (Panjakent)", "Рашнаи Поён (Пенджикент)", "panjakent_121d", 67.8004, 39.2326),
          ("Barrushon (Rushan)", "Баррушон (Рушан)", "rushan_d", 71.4809, 37.9504), ("Dehrushon (Rushan)", "Дерушон (Рушан)", "rushan_d", 71.432, 37.926),
          ("Usoi dam (Sarez)", "Усойский завал (Сарез)", "sarez", 72.5894, 38.2676)]
rows = []
for en, ru, s, lo, la in PLACES:
    D = S[s]; c = circle(D, lo, la) & D["valid"]; sh = shares(D, c)
    rows.append({"name": {"en": en, "ru": ru}, "orbit": D["track"], "watchable": sh["watchable"], "good_geometry": sh["good_geometry"],
                 "usual_coh_ok": sh["usual_coh_ge_0.5"], "layover": sh["layover"], "shadow": sh["shadow"], "grazing": sh["grazing"],
                 "watchable_ha": round(sh["watchable"] * sh["pixels"] * 0.04)})
    print(f"{en:28s} {D['track']}: watchable {sh['watchable']:.0%} ({rows[-1]['watchable_ha']} ha) | geometry ok {sh['good_geometry']:.0%} | usual coh>=0.5 {sh['usual_coh_ge_0.5']:.0%}")
out["villages"] = rows
# combined Panjakent: watchable from at least one of the three orbits
pj = [S[s]["watch"] for s in ["panjakent", "panjakent_113a", "panjakent_121d"]]; c = circle(S["panjakent"], 67.8004, 39.2326) & S["panjakent"]["valid"]
out["panjakent_any_orbit_watchable"] = round(float((np.logical_or.reduce(pj) & c).sum() / c.sum()), 3)
out["panjakent_zone_any_orbit_watchable"] = round(float((np.logical_or.reduce(pj[:2]) & zone).sum() / zone.sum()), 3)
print("Panjakent circle watchable by any orbit:", out["panjakent_any_orbit_watchable"], "| changed slopes watchable by 012A or 113A:", out["panjakent_zone_any_orbit_watchable"])
json.dump(out, open("analysis/detectability.json", "w"), indent=1)
json.dump({"rule": out["rule"], "villages": rows}, open("site/data/detectability.json", "w"), indent=1, ensure_ascii=False)
