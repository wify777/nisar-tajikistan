"""How often does our mudflow test fire where no mudflow was reported? (false alarm rate)

Test statistic, exactly as in pair_drop_test.py: for one GUNW pair, the area (ha) inside a 2.5 km circle where
coherence, smoothed 5x5, is more than 0.3 below the median of all other pairs of the same window.

Background = every cached window and pair with no reported event, circles on a 5 km grid (no overlap), circle at
least 95% inside valid data. Removed from the background: Ayni pair 9 Jul -> 21 Jul (the event) and the Rushan pair
14 Jul -> 26 Jul (event, within 6 km of the villages). Rushan descending pairs longer than 24 days are not used.
Rogun and Nurek are reported separately because reservoir filling there is a real change, not a false alarm.

Outputs: results_E/E1/table.csv (one row per test), results_E/E1/summary.json, site/data/false_alarm.json,
results_E/E1/spatial_noise_distribution.png
Usage: python scripts/false_alarm_rate.py
"""
import glob, os, json, csv, math, numpy as np, pyproj
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt

R = 2500.0; SPACING = 5000.0; THR = -0.3; K = 5
OUT = "results_E/E1"; os.makedirs(OUT, exist_ok=True)
SITES = {"ayni": "mountain", "sarez": "mountain", "rushan_d": "mountain", "rogun": "reservoir", "nurek": "reservoir"}
SKIP_PAIRS = {"rushan_d": {"20260620_20260714", "20260714_20260831", "20260831_20260924"}}
EVENT = {("ayni", "20260709_20260721"): None,                               # whole pair removed
         ("rushan_d", "20260714_20260726"): ((71.481, 37.950), (71.432, 37.926), 6000.0)}
AYNI_EVENT_HA = 126.1


def box(a, k=K):
    a = np.nan_to_num(a); p = np.pad(a, k // 2, mode="edge"); s = np.zeros(a.shape)
    for i in range(k):
        for j in range(k): s += p[i:i + a.shape[0], j:j + a.shape[1]]
    return s / (k * k)


circle_km2 = math.pi * (R / 1000) ** 2
rows = []
for site, kind in SITES.items():
    fs = sorted(glob.glob(f"cache/{site}/gunw_*.npz"))
    U = {}
    for f in fs:
        key = os.path.basename(f)[5:22]
        if key in SKIP_PAIRS.get(site, set()): continue
        c = np.load(f)["coh"]
        if np.isnan(c).mean() > 0.5: continue
        U[key] = c
    z = np.load(fs[0]); x, y = z["x"], z["y"]; XX, YY = np.meshgrid(x, y)
    px_ha = abs((x[1] - x[0]) * (y[1] - y[0])) / 1e4
    to_utm = pyproj.Transformer.from_crs(4326, int(z["epsg"]), always_xy=True)
    keys = sorted(U)
    valid_all = np.all(np.stack([np.isfinite(U[k]) for k in keys]), axis=0)
    cx = np.arange(x.min() + R, x.max() - R + 1, SPACING); cy = np.arange(y.min() + R, y.max() - R + 1, SPACING)
    for k in keys:
        others = np.nanmedian(np.stack([U[o] for o in keys if o != k]), axis=0)
        drop = (box(U[k] - others) < THR) & valid_all
        win_ha_km2 = float(drop.sum() * px_ha) / (valid_all.sum() * px_ha / 100)   # flagged ha per km2, whole window
        days = (np.datetime64(f"{k[9:13]}-{k[13:15]}-{k[15:17]}") - np.datetime64(f"{k[:4]}-{k[4:6]}-{k[6:8]}")).astype(int)
        ev = (site, k) in EVENT
        if ev and EVENT[(site, k)] is None: continue
        for X0 in cx:
            for Y0 in cy:
                circ = (XX - X0) ** 2 + (YY - Y0) ** 2 < R ** 2
                if valid_all[circ].mean() < 0.95: continue
                if ev:
                    pts = EVENT[(site, k)]
                    if any(math.hypot(X0 - p[0], Y0 - p[1]) < pts[2] for p in (to_utm.transform(*q) for q in pts[:2])):
                        continue
                lon, lat = pyproj.Transformer.from_crs(int(z["epsg"]), 4326, always_xy=True).transform(X0, Y0)
                rows.append(dict(site=site, kind=kind, pair=k, lon=round(lon, 4), lat=round(lat, 4),
                                 circle_valid_pct=round(100 * valid_all[circ].mean(), 1),
                                 pair_days=int(days), window_ha_per_km2=round(win_ha_km2, 2),
                                 flagged_ha=round(float(drop[circ].sum() * px_ha), 1),
                                 ratio_to_window=round(float(drop[circ].sum() * px_ha) / max(win_ha_km2 * circle_km2, 1.0), 2)))

with open(f"{OUT}/table.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)



def stats(sel, label):
    v = np.array([r["flagged_ha"] for r in sel]); n = len(v)
    out = {"label": label, "n_tests": n, "mean_ha": round(float(v.mean()), 1), "sd_ha": round(float(v.std(ddof=1)), 1),
           "median_ha": round(float(np.median(v)), 1), "p95_ha": round(float(np.percentile(v, 95)), 1),
           "p99_ha": round(float(np.percentile(v, 99)), 1), "max_ha": round(float(v.max()), 1),
           "z_ayni": round(float((AYNI_EVENT_HA - v.mean()) / v.std(ddof=1)), 1)}
    for T in (25, 50, 70, 100, AYNI_EVENT_HA):
        k = int((v >= T).sum())
        # exact one-sided 95% upper bound (Clopper-Pearson); for k = 0 this is about 3/n
        lo, hi = 0.0, 1.0
        for _ in range(60):
            mid = (lo + hi) / 2
            cdf = sum(math.comb(n, i) * mid ** i * (1 - mid) ** (n - i) for i in range(k + 1))
            lo, hi = (mid, hi) if cdf > 0.05 else (lo, mid)
        out[f"ge_{int(T)}ha"] = {"count": k, "rate": round(k / n, 4), "rate_upper95": round(hi, 4),
                                 "per_1000km2_per_pass_upper95": round(hi / circle_km2 * 1000, 2)}
    return out


RULES = {"A_any_pair": lambda r: True,
         "B_12day_pairs": lambda r: r["pair_days"] <= 12}
def alarm_C(r, T):   # 12-day pair, area >= T and at least twice what the same pair shows on average across the window
    return r["pair_days"] <= 12 and r["flagged_ha"] >= T and r["ratio_to_window"] >= 2


def rule_table(sel):
    out = {}
    n12 = [r for r in sel if r["pair_days"] <= 12]
    for T in (25, 50, 70, 100):
        out[f"T{T}"] = {"A_any_pair": f"{sum(r['flagged_ha'] >= T for r in sel)}/{len(sel)}",
                        "B_12day": f"{sum(r['flagged_ha'] >= T for r in n12)}/{len(n12)}",
                        "C_12day_and_2x_window": f"{sum(alarm_C(r, T) for r in n12)}/{len(n12)}"}
    return out


summary = {"radius_km": R / 1000, "threshold": THR, "smoothing_px": K, "spacing_km": SPACING / 1000,
           "circle_km2": round(circle_km2, 2), "ayni_event_ha": AYNI_EVENT_HA,
           "mountain": stats([r for r in rows if r["kind"] == "mountain"], "mountain windows (Ayni non-event pairs, Sarez, Rushan)"),
           "all": stats(rows, "all windows incl. Rogun and Nurek reservoirs"),
           "rules_mountain": rule_table([r for r in rows if r["kind"] == "mountain"]),
           "rules_all": rule_table(rows),
           "ayni_event": {"village_ha": AYNI_EVENT_HA, "window_ha": 143.4, "window_km2": 64.0,
                          "ratio_to_window": round(AYNI_EVENT_HA / (143.4 / 64.0 * circle_km2), 2), "pair_days": 12},
           "per_site": {s: stats([r for r in rows if r["site"] == s], s) for s in SITES}}
json.dump(summary, open(f"{OUT}/summary.json", "w"), indent=1)
json.dump(summary, open("site/data/false_alarm.json", "w"), indent=1)
print(json.dumps({k: summary[k] for k in ("rules_mountain", "rules_all", "ayni_event")}, indent=1))
print("mountain z", summary["mountain"]["z_ayni"], "all z", summary["all"]["z_ayni"], "mountain n", summary["mountain"]["n_tests"], "all n", summary["all"]["n_tests"])
for s, v in summary["per_site"].items():
    print(s, v["n_tests"], "mean", v["mean_ha"], "p95", v["p95_ha"], "max", v["max_ha"], ">=70:", v["ge_70ha"]["count"], ">=126:", v["ge_126ha"]["count"])

fig, ax = plt.subplots(figsize=(9, 4.6), constrained_layout=True)
bins = np.arange(0, max(140, max(r["flagged_ha"] for r in rows) + 10), 5)
for kind, col in (("mountain", "#2a9d8f"), ("reservoir", "#8d99ae")):
    ax.hist([r["flagged_ha"] for r in rows if r["kind"] == kind], bins=bins, color=col, alpha=.85,
            label=f"{kind} windows, no reported event (n={sum(r['kind'] == kind for r in rows)})")
ax.axvline(AYNI_EVENT_HA, color="#e76f51", lw=2.5); ax.text(AYNI_EVENT_HA + 2, ax.get_ylim()[1] * .8, "Ayni mudflow\n126 ha", color="#e76f51")
ax.set_xlabel("flagged area in a 2.5 km circle (ha), one image pair (12 or 24 days)"); ax.set_ylabel("number of tests"); ax.set_yscale("log")
ax.legend(frameon=False); ax.set_title("NISAR coherence-drop test: background in Tajik mountains vs the Ayni event")
fig.savefig(f"{OUT}/spatial_noise_distribution.png", dpi=130)
