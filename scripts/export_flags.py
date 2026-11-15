"""Export per-pixel test flags so the site can run the alarm test at any clicked spot.

For each story window: the same flag as everywhere (pair minus median of all other pairs, 5x5 smoothing, drop > 0.3).
One RGBA PNG per story: bit i of the red channel = flagged in pair i (max 8 pairs); alpha 0 = no valid data.
All windows are exported at the full 20 m resolution (the PNGs are 5-60 KB). The pooling option is kept but unused.
Writes site/data/<story>/flags.png and flags.json. Usage: python scripts/export_flags.py
"""
import glob, os, json, numpy as np, pyproj
from PIL import Image

STORIES = {"ayni": ("ayni", 1), "rushan": ("rushan_d", 1), "sarez": ("sarez", 1), "nurek": ("nurek", 1), "rogun": ("rogun", 1)}
SKIP = {"rushan_d": {"20260620_20260714", "20260714_20260831", "20260831_20260924"}}
THR = -0.3


def box(a, k=5):
    a = np.nan_to_num(a); p = np.pad(a, k // 2, mode="edge"); s = np.zeros(a.shape)
    for i in range(k):
        for j in range(k): s += p[i:i + a.shape[0], j:j + a.shape[1]]
    return s / (k * k)


for story, (site, pool) in STORIES.items():
    U = {}
    for f in sorted(glob.glob(f"cache/{site}/gunw_*.npz")):
        k = os.path.basename(f)[5:22]
        if k in SKIP.get(site, set()): continue
        c = np.load(f)["coh"]
        if np.isnan(c).mean() > 0.5: continue
        U[k] = c
    keys = sorted(U)[:8]
    z = np.load(sorted(glob.glob(f"cache/{site}/gunw_*.npz"))[0]); x, y, epsg = z["x"], z["y"], int(z["epsg"])
    valid = np.all(np.stack([np.isfinite(U[k]) for k in keys]), axis=0)
    bits = np.zeros(valid.shape, np.uint8); dens = []
    for i, k in enumerate(keys):
        d = (box(U[k] - np.nanmedian(np.stack([U[o] for o in keys if o != k]), axis=0)) < THR) & valid
        bits |= (d.astype(np.uint8) << i); dens.append(float(d.sum()) / max(valid.sum(), 1))
    dx = abs(x[1] - x[0])
    if pool > 1:
        H2, W2 = valid.shape[0] // pool, valid.shape[1] // pool
        b = bits[:H2 * pool, :W2 * pool].reshape(H2, pool, W2, pool)
        bits = np.bitwise_or.reduce(np.bitwise_or.reduce(b, axis=3), axis=1)
        valid = valid[:H2 * pool, :W2 * pool].reshape(H2, pool, W2, pool).all(axis=(1, 3))
        dx *= pool
    H, W = bits.shape
    rgba = np.zeros((H, W, 4), np.uint8); rgba[..., 0] = bits; rgba[..., 3] = np.where(valid, 255, 0)
    os.makedirs(f"site/data/{story}", exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(f"site/data/{story}/flags.png", optimize=True)
    inv = pyproj.Transformer.from_crs(epsg, 4326, always_xy=True)
    x0, y0 = x.min() - abs(x[1] - x[0]) / 2, y.max() + abs(y[1] - y[0]) / 2     # NW pixel edge
    corner = lambda cx, cy: [round(v, 6) for v in inv.transform(cx, cy)]
    meta = {"w": W, "h": H, "pixel_m": dx, "pooled": pool > 1,
            "nw": corner(x0, y0), "ne": corner(x0 + W * dx, y0), "sw": corner(x0, y0 - H * dx),
            "pairs": [[f"{k[:4]}-{k[4:6]}-{k[6:8]}", f"{k[9:13]}-{k[13:15]}-{k[15:17]}"] for k in keys],
            "window_density": [round(v, 5) for v in dens], "radius_m": 2500, "min_ha": 50, "min_ratio": 2, "max_days": 12,
            "note": "flag = pair coherence more than 0.3 below the median of all other pairs after 5x5 smoothing" +
                    ("; 40 m cells, a cell counts as flagged if any 20 m pixel is, so areas are slightly overstated" if pool > 1 else "")}
    json.dump(meta, open(f"site/data/{story}/flags.json", "w"), indent=1)
    print(story, site, W, H, dx, "pairs", len(keys), "png KB", round(os.path.getsize(f"site/data/{story}/flags.png") / 1024, 1))
