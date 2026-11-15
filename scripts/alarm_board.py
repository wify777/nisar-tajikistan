"""Alarm board: run the "From map to action" rule on every watched place and every 12-day image pair we have.

Rule (docs/RESPONSE_WORKFLOW.md): coherence of the pair minus the median of all other pairs of the same window,
5x5 smoothing, drop > 0.3; flagged area inside a 2.5 km circle around the place.
  yellow = 12-day pair AND >= 50 ha AND >= 2x the flagged density of the same pair over the whole window
  green  = otherwise;  "long" = pair longer than 12 days (not used for alarms);  "nodata" = circle < 90% valid
Known events (news / Red Cross reports) are marked on the pair that spans them.
Writes site/data/alarm_board.json. Usage: python scripts/alarm_board.py
"""
import glob, os, json, math, numpy as np, pyproj

R = 2500.0; THR = -0.3; MIN_HA = 50.0; MIN_RATIO = 2.0
PLACES = [  # name_en, name_ru, cache window, lon, lat
    ("Dargh (Ayni)", "Дарг (Айни)", "ayni", 68.9814, 39.3474),
    ("Kazdon (Ayni)", "Каздон (Айни)", "ayni", 68.975, 39.346),
    ("Rashnai Poyon (Panjakent), orbit 012A", "Рашнаи Поён (Пенджикент), орбита 012A", "panjakent", 67.8004, 39.2326),
    ("Rashnai Poyon (Panjakent), orbit 113A", "Рашнаи Поён (Пенджикент), орбита 113A", "panjakent_113a", 67.8004, 39.2326),
    ("Rashnai Poyon (Panjakent), orbit 121D", "Рашнаи Поён (Пенджикент), орбита 121D", "panjakent_121d", 67.8004, 39.2326),
    ("Barrushon (Rushan)", "Баррушон (Рушан)", "rushan_d", 71.4809, 37.9504),
    ("Derushon (Rushan)", "Дерушон (Рушан)", "rushan_d", 71.432, 37.926),
    ("Usoi dam (Sarez)", "Усойский завал (Сарез)", "sarez", 72.5894, 38.2676),
]
EVENTS = {"ayni": "2026-07-11", "panjakent": "2026-07-11", "panjakent_113a": "2026-07-11", "panjakent_121d": "2026-07-11",
          "rushan_d": "2026-07-20"}
SKIP = {"rushan_d": {"20260620_20260714", "20260714_20260831", "20260831_20260924"}}


def box(a, k=5):
    a = np.nan_to_num(a); p = np.pad(a, k // 2, mode="edge"); s = np.zeros(a.shape)
    for i in range(k):
        for j in range(k): s += p[i:i + a.shape[0], j:j + a.shape[1]]
    return s / (k * k)


def iso(s): return f"{s[:4]}-{s[4:6]}-{s[6:8]}"


cache = {}
def window(site):
    if site in cache: return cache[site]
    fs = sorted(glob.glob(f"cache/{site}/gunw_*.npz"))
    U = {}
    for f in fs:
        k = os.path.basename(f)[5:22]
        if k in SKIP.get(site, set()): continue
        c = np.load(f)["coh"]
        if np.isnan(c).mean() > 0.5: continue
        U[k] = c
    z = np.load(fs[0]); x, y = z["x"], z["y"]
    valid = np.all(np.stack([np.isfinite(U[k]) for k in U]), axis=0)
    drops = {}
    for k in U:
        others = np.nanmedian(np.stack([U[o] for o in U if o != k]), axis=0)
        drops[k] = (box(U[k] - others) < THR) & valid
    cache[site] = (x, y, int(z["epsg"]), valid, drops); return cache[site]


rows = []
for en, ru, site, lon, lat in PLACES:
    if not glob.glob(f"cache/{site}/gunw_*.npz"): print("no data for", site); continue
    x, y, epsg, valid, drops = window(site)
    XX, YY = np.meshgrid(x, y); px_ha = abs((x[1] - x[0]) * (y[1] - y[0])) / 1e4
    cx, cy = pyproj.Transformer.from_crs(4326, epsg, always_xy=True).transform(lon, lat)
    circ = (XX - cx) ** 2 + (YY - cy) ** 2 < R ** 2
    cells = []
    for k in sorted(drops):
        a, b = iso(k[:8]), iso(k[9:])
        days = (np.datetime64(b) - np.datetime64(a)).astype(int)
        ha = float(drops[k][circ].sum() * px_ha)
        win_density = float(drops[k].sum()) / max(valid.sum(), 1)
        ratio = ha / max(win_density * circ.sum() * px_ha, 1.0)
        cov = float(valid[circ].mean())
        ev = EVENTS.get(site); spans = bool(ev and a < ev <= b)
        if cov < 0.9: status = "nodata"
        elif days > 12: status = "long"
        elif ha >= MIN_HA and ratio >= MIN_RATIO: status = "yellow"
        else: status = "green"
        cells.append({"from": a, "to": b, "days": int(days), "ha": round(ha, 1), "ratio": round(ratio, 2), "status": status, "event": spans})
    # is the event pair the largest of all pairs here? (blind-test criterion D1)
    ev_cells = [c for c in cells if c["event"]]
    top = max(cells, key=lambda c: c["ha"]) if cells else None
    rows.append({"name": {"en": en, "ru": ru}, "site": site, "lon": lon, "lat": lat, "cells": cells,
                 "event_pair_is_largest": bool(ev_cells and top and top["event"])})
    print(en, " | ".join(f"{c['from'][5:]}>{c['to'][5:]}:{c['ha']:.0f}ha/{c['ratio']:.1f}x/{c['status']}{'*' if c['event'] else ''}" for c in cells))

json.dump({"rule": {"radius_km": R / 1000, "drop": THR, "min_ha": MIN_HA, "min_ratio": MIN_RATIO, "max_days": 12},
           "rows": rows}, open("site/data/alarm_board.json", "w"), indent=1, ensure_ascii=False)
