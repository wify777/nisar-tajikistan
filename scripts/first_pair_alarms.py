"""Why does the first image pair of the summer give most false alarms? Test of three explanations.

Cases: every yellow-rule background alarm and every background test >= 126 ha in the first pair of the summer
(results_E/E1/table.csv: Rogun and Nurek 27 Jun -> 9 Jul, track 012A; Rushan 20 Jun -> 2 Jul, track 092D).
For the pixels flagged inside each alarm circle (same test: coherence minus median of other pairs, 5x5, < -0.3):
  - water:   became water between the two radar dates (HH < -11.9 dB after, not before)  -> reservoir filling
  - harvest: green before on Sentinel-2 (NDVI >= 0.3) and NDVI fell by > 0.1 (same S2 orbit around the radar dates)
  - drying:  bare before and after (NDVI < 0.2) and HH fell by > 1 dB
  - other
The same shares for the unflagged land of the same circle are the baseline: an explanation counts only if it is much
more common on flagged pixels. Writes analysis/first_pair_alarms.json. Usage: python scripts/first_pair_alarms.py"""
import csv, glob, os, json, numpy as np, pyproj, requests, rasterio
from rasterio.windows import from_bounds
from rasterio.enums import Resampling

R = 2500.0; THR = -0.3
CASES = {  # site: (pair, S2 before ids, S2 after ids)
    "rogun": ("20260627_20260709", ["S2B_42SWH_20260629_0_L2A", "S2B_42SWJ_20260629_0_L2A"], ["S2B_42SWH_20260709_0_L2A", "S2B_42SWJ_20260709_0_L2A"]),
    "nurek": ("20260627_20260709", ["S2B_42SWH_20260629_0_L2A"], ["S2B_42SWH_20260709_0_L2A"]),
    "rushan_d": ("20260620_20260702", ["S2B_42SYH_20260616_0_L2A", "S2B_42SYG_20260616_0_L2A"], ["S2C_42SYH_20260701_0_L2A", "S2C_42SYG_20260701_0_L2A"]),
}
SKIP = {"rushan_d": {"20260620_20260714", "20260714_20260831", "20260831_20260924"}}


def box(a, k=5):
    a = np.nan_to_num(a); p = np.pad(a, k // 2, mode="edge"); s = np.zeros(a.shape)
    for i in range(k):
        for j in range(k): s += p[i:i + a.shape[0], j:j + a.shape[1]]
    return s / (k * k)


def s2(ids, B, H, W):
    out = {k: np.zeros((H, W)) for k in ("red", "nir", "scl")}
    for sid in ids:
        f = f"cache/s2_first_pair/{sid}_{int(B[0])}_{int(B[1])}.npz"
        if os.path.exists(f): d = dict(np.load(f))
        else:
            a = requests.get(f"https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/{sid}", timeout=60).json()["assets"]
            d = {}
            for k in ("red", "nir", "scl"):
                with rasterio.open(a[k]["href"]) as s:
                    d[k] = s.read(1, window=from_bounds(*B, s.transform), out_shape=(H, W), boundless=True, fill_value=0,
                                  resampling=Resampling.average if k != "scl" else Resampling.nearest).astype(np.float32)
            os.makedirs(os.path.dirname(f), exist_ok=True); np.savez_compressed(f, **d)
        m = (d["red"] > 0) & (out["red"] == 0)
        for k in out: out[k][m] = d[k][m]
    ok = (out["red"] > 0) & ~np.isin(out["scl"], [0, 1, 3, 8, 9, 10])
    ndvi = (out["nir"] - out["red"]) / (out["nir"] + out["red"] + 1e-6)
    return ndvi, ok


rows = list(csv.DictReader(open("results_E/E1/table.csv")))
res = {"cases": []}
tot = {"flagged": {}, "rest": {}}
for site, (pair, sb, sa) in CASES.items():
    sel = [r for r in rows if r["site"] == site and r["pair"] == pair and (
        float(r["flagged_ha"]) >= 126 or (float(r["flagged_ha"]) >= 50 and float(r["ratio_to_window"]) >= 2))]
    if not sel: continue
    fs = sorted(glob.glob(f"cache/{site}/gunw_*.npz"))
    U = {os.path.basename(f)[5:22]: np.load(f)["coh"] for f in fs if os.path.basename(f)[5:22] not in SKIP.get(site, set())}
    z = np.load(fs[0]); x, y = z["x"], z["y"]; H, W = len(y), len(x); dx = abs(x[1] - x[0])
    B = (x.min() - dx / 2, y.min() - dx / 2, x.max() + dx / 2, y.max() + dx / 2)
    others = np.nanmedian(np.stack([U[k] for k in U if k != pair]), axis=0)
    flag = box(U[pair] - others) < THR
    d0, d1 = pair[:8], pair[9:]
    db = lambda d: 10 * np.log10(box(np.where(np.load(f"cache/{site}/gcov_{d}.npz")["hh"] > 0, np.load(f"cache/{site}/gcov_{d}.npz")["hh"], np.nan), 3) + 1e-9)
    h0, h1 = db(d0), db(d1)
    nb, okb = s2(sb, B, H, W); na, oka = s2(sa, B, H, W)
    XX, YY = np.meshgrid(x, y); T = pyproj.Transformer.from_crs(4326, 32642, always_xy=True)
    water = (h1 < -11.9) & (h0 >= -11.9)
    ok = okb & oka & np.isfinite(U[pair])
    harvest = ok & (nb >= 0.3) & (na - nb < -0.1)
    drying = ok & (nb < 0.2) & (na < 0.2) & (h1 - h0 < -1.0) & ~water
    for r in sel:
        cx, cy = T.transform(float(r["lon"]), float(r["lat"])); circ = (XX - cx) ** 2 + (YY - cy) ** 2 < R * R
        rec = {"site": site, "pair": pair, "lon": float(r["lon"]), "lat": float(r["lat"]), "flagged_ha": float(r["flagged_ha"]),
               "ratio": float(r["ratio_to_window"])}
        for name, m in (("flagged", circ & flag & ok), ("rest", circ & ~flag & ok)):
            n = max(int(m.sum()), 1)
            sh = {"n": int(m.sum()), "water": round(float((water & m).sum()) / n, 3), "harvest": round(float((harvest & m & ~water).sum()) / n, 3),
                  "drying": round(float((drying & m).sum()) / n, 3), "green_before": round(float((ok & (nb >= 0.3) & m).sum()) / n, 3),
                  "ndvi_before": round(float(np.median(nb[m])), 3) if m.any() else None, "ndvi_change": round(float(np.median((na - nb)[m])), 3) if m.any() else None,
                  "hh_change_db": round(float(np.nanmedian((h1 - h0)[m])), 2) if m.any() else None}
            rec[name] = sh
            for k in ("water", "harvest", "drying"):
                tot[name].setdefault(k, 0); tot[name][k] += (locals()[k] & m & (~water if k == "harvest" else True)).sum()
            tot[name].setdefault("n", 0); tot[name]["n"] += m.sum()
        rec["optical_coverage"] = round(float((circ & ok).sum() / circ.sum()), 2)
        res["cases"].append(rec)
        print(site, r["lon"], r["lat"], r["flagged_ha"], "cover", rec["optical_coverage"], "\n  flagged", rec["flagged"], "\n  rest   ", rec["rest"])
res["total"] = {g: {k: (round(float(v) / max(float(tot[g]["n"]), 1), 3) if k != "n" else int(v)) for k, v in tot[g].items()} for g in tot}
print("TOTAL", res["total"])
json.dump(res, open("analysis/first_pair_alarms.json", "w"), indent=1)
