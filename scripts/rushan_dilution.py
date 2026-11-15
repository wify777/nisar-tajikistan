"""Why the radar test missed the Rushan 20 Jul 2026 mudflow: is the signal diluted by our 5x5 smoothing?

Maps the Sentinel-2 change mask (16 -> 26 Jul, same rule as rushan_optical_change.py) onto the NISAR GUNW grid
(track 092D, cache/rushan_d), then compares the coherence drop of the event pair (14 -> 26 Jul) against the median
of all other pairs, on the mudflow traces and on the land around them, for smoothing boxes 1x1, 3x3 and 5x5.
Writes analysis/rushan_dilution.json. Usage: python scripts/rushan_dilution.py"""
import glob, os, json, numpy as np, pyproj
from scipy import ndimage as nd

EVENT = "20260714_20260726"
# --- optical change mask, 10 m, same window and rule as rushan_optical_change.py
T = pyproj.Transformer.from_crs(4326, 32642, always_xy=True)
x0, y0 = T.transform(71.40, 37.905); x1, y1 = T.transform(71.52, 37.99)
b = dict(np.load("cache/rushan_s2/S2B_42SYH_20260716_0_L2A.npz")); a = dict(np.load("cache/rushan_s2/S2B_42SYH_20260726_0_L2A.npz"))
ndvi = lambda d: (d["nir"] - d["red"]) / (d["nir"] + d["red"] + 1e-6)
dn = ndvi(a) - ndvi(b); dbr = (a["red"] + a["green"] + a["blue"]) / 3 - (b["red"] + b["green"] + b["blue"]) / 3
cloud = np.isin(a["scl"], [3, 8, 9, 10]) | np.isin(b["scl"], [3, 8, 9, 10])
ch = nd.binary_opening((dn < -0.15) & (dbr > 150) & ~cloud, iterations=1)
H, W = ch.shape

# --- radar pairs
fs = sorted(glob.glob("cache/rushan_d/gunw_*.npz")); U = {os.path.basename(f)[5:22]: np.load(f)["coh"] for f in fs}
z = np.load(fs[0]); x, y, epsg = z["x"], z["y"], int(z["epsg"])
assert epsg == 32642, epsg
dx, dy = x[1] - x[0], y[1] - y[0]
others = np.nanmedian(np.stack([U[k] for k in U if k != EVENT]), axis=0)
d = U[EVENT] - others

# fraction of each 20 m radar pixel covered by optical change (count 10 m change pixels by their centre)
rr, cc = np.nonzero(ch)
ex = x0 + (cc + 0.5) * 10; ny = y1 - (rr + 0.5) * 10
ci = np.round((ex - x[0]) / dx).astype(int); ri = np.round((ny - y[0]) / dy).astype(int)
ok = (ci >= 0) & (ci < len(x)) & (ri >= 0) & (ri < len(y))
cnt = np.zeros(d.shape); np.add.at(cnt, (ri[ok], ci[ok]), 1)
f = np.clip(cnt / ((abs(dx) * abs(dy)) / 100), 0, 1)
# optical window footprint on the radar grid (only compare where optics looked)
XX, YY = np.meshgrid(x, y)
inopt = (XX > x0) & (XX < x1) & (YY > y0) & (YY < y1)
clouds_r = np.zeros(d.shape, bool)
crr, ccc = np.nonzero(cloud); cci = np.round((x0 + (ccc + .5) * 10 - x[0]) / dx).astype(int); cri = np.round((y1 - (crr + .5) * 10 - y[0]) / dy).astype(int)
k_ = (cci >= 0) & (cci < len(x)) & (cri >= 0) & (cri < len(y)); clouds_r[cri[k_], cci[k_]] = True

trace = (f >= 0.5) & np.isfinite(d)
near = nd.binary_dilation(trace, iterations=25) & ~nd.binary_dilation(f > 0, iterations=3) & inopt & ~clouds_r & np.isfinite(d)

def box(a, k):
    if k == 1: return np.nan_to_num(a)
    a = np.nan_to_num(a); p = np.pad(a, k // 2, mode="edge"); s = np.zeros(a.shape)
    for i in range(k):
        for j in range(k): s += p[i:i + a.shape[0], j:j + a.shape[1]]
    return s / (k * k)

px_ha = abs(dx * dy) / 1e4
out = {"event_pair": EVENT, "pixel_m": abs(float(dx)), "optical_change_ha": round(float(ch.sum()) * 0.01, 2),
       "trace_pixels": int(trace.sum()), "trace_ha": round(float(trace.sum()) * px_ha, 2), "boxes": {}}
print(f"optical change {out['optical_change_ha']} ha; radar pixels >=50% covered: {out['trace_pixels']} ({out['trace_ha']} ha)")
for k in (1, 3, 5):
    s = box(d, k)
    # how much of each box is mudflow trace: mean of f over the same box (dilution factor)
    fb = box(f, k)
    flag = s < -0.3
    # pair-by-pair background: same box applied to every other pair minus the median of the rest, flagged area in window
    win_ha = []
    for kk in U:
        oth = np.nanmedian(np.stack([U[o] for o in U if o != kk]), axis=0)
        win_ha.append(float((box(U[kk] - oth, k) < -0.3)[inopt].sum() * px_ha))
    rec = {"trace_mean_drop": round(float(s[trace].mean()), 3), "trace_p10_drop": round(float(np.percentile(s[trace], 10)), 3),
           "near_mean_drop": round(float(s[near].mean()), 3),
           "trace_mean_cover": round(float(fb[trace].mean()), 2),
           "trace_flagged_frac": round(float(flag[trace].mean()), 3),
           "near_flagged_frac": round(float(flag[near].mean()), 4),
           "event_window_flag_ha": round(win_ha[sorted(U).index(EVENT)], 1),
           "other_pairs_window_flag_ha": [round(v, 1) for i, v in enumerate(win_ha) if sorted(U)[i] != EVENT]}
    out["boxes"][f"{k}x{k}"] = rec
    print(k, rec)

# raw (1x1) drop where the trace covers the whole pixel vs partial
s1 = d
for lo, hi in ((0.99, 1.01), (0.5, 0.99)):
    m = (f >= lo) & (f < hi) & np.isfinite(d)
    print(f"cover {lo}-{hi}: n={m.sum()} raw drop mean {np.nanmean(s1[m]):.3f}")
out["full_cover_pixels"] = int(((f >= 0.99) & np.isfinite(d)).sum())
out["full_cover_raw_drop"] = round(float(np.nanmean(d[(f >= 0.99) & np.isfinite(d)])), 3)
json.dump(out, open("analysis/rushan_dilution.json", "w"), indent=1)

# --- the two known traces only (fan at Barrushon, channel at ~71.4525 E), and the coherence floor
inv = pyproj.Transformer.from_crs(32642, 4326, always_xy=True)
LO, LA = inv.transform(XX, YY)
zones = {"fan": np.hypot((LO - 71.4839) * 88000, (LA - 37.9505) * 111000) < 150,
         "channel": (abs(LO - 71.4525) * 88000 < 120) & (LA > 37.93) & (LA < 37.95)}
out["traces"] = {}
for name, zone in zones.items():
    m = zone & (f >= 0.5) & np.isfinite(d)
    out["traces"][name] = {"ha": round(float(m.sum() * px_ha), 1), "baseline_coh": round(float(np.nanmedian(others[m])), 3),
                           "event_coh": round(float(np.nanmedian(U[EVENT][m])), 3), "raw_drop": round(float(np.nanmean(d[m])), 3)}
out["coherence_floor_p5_event_pair"] = round(float(np.nanpercentile(U[EVENT], 5)), 3)
print(out["traces"], "floor p5", out["coherence_floor_p5_event_pair"])
json.dump(out, open("analysis/rushan_dilution.json", "w"), indent=1)
