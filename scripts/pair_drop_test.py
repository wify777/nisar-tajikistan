"""Unbiased change test: for every GUNW pair, the area (ha) where smoothed coherence is >0.3 below the
median of ALL OTHER pairs, inside a circle around a point and in the whole window.
Usage: python pair_drop_test.py <site> <lon> <lat> <radius_km>"""
import sys, glob, os, json, numpy as np, pyproj
site, lon, lat, rad = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])*1000
fs = sorted(glob.glob(f"cache/{site}/gunw_*.npz")); U = {os.path.basename(f)[5:22]: np.load(f)["coh"] for f in fs}
z = np.load(fs[0]); x, y = z["x"], z["y"]; XX, YY = np.meshgrid(x, y); px = abs((x[1]-x[0])*(y[1]-y[0]))/1e4
zx, zy = pyproj.Transformer.from_crs(4326, int(z["epsg"]), always_xy=True).transform(lon, lat); near = (XX-zx)**2+(YY-zy)**2 < rad**2
def box(a, k=5):
    a = np.nan_to_num(a); p = np.pad(a, k//2, mode="edge"); s = np.zeros(a.shape)
    for i in range(k):
        for j in range(k): s += p[i:i+a.shape[0], j:j+a.shape[1]]
    return s/(k*k)
keys = sorted(U); res = {"site": site, "radius_km": rad/1000, "pairs": [], "near_ha": [], "window_ha": []}
for k in keys:
    others = np.nanmedian(np.stack([U[o] for o in keys if o != k]), axis=0)
    drop = box(U[k]-others) < -0.3
    res["pairs"].append(k); res["near_ha"].append(round(float(drop[near].sum()*px), 1)); res["window_ha"].append(round(float(drop.sum()*px), 1))
    print(f"{k}: near {res['near_ha'][-1]:7.1f} ha | window {res['window_ha'][-1]:7.1f} ha")
os.makedirs(f"site/data/{site}", exist_ok=True); json.dump(res, open(f"site/data/{site}/pair_test.json", "w"), indent=1)
