"""Water extent per date from cached NISAR GCOV windows (HH, 20 m).
Method: smooth HH (5x5), threshold in dB chosen by Otsu on the pooled histogram of all dates, keep only the largest
connected dark body (the reservoir/lake) to exclude scattered radar shadows. Area = pixels x 400 m2.
Usage: python water_series.py <site> [--seed-lon LON --seed-lat LAT | --seeds "LON,LAT;LON,LAT"] [--threshold-db DB] [--edge-buffer-km KM]   (seed = a point that is always water)"""
import sys, glob, os, json, numpy as np, pyproj
import matplotlib as mpl; mpl.use("Agg")
from PIL import Image
site = sys.argv[1]; a = sys.argv
slon = float(a[a.index("--seed-lon")+1]) if "--seed-lon" in a else None; slat = float(a[a.index("--seed-lat")+1]) if "--seed-lat" in a else None
open_px = int(a[a.index("--open-px")+1]) if "--open-px" in a else 0
buf_px = int(float(a[a.index("--edge-buffer-km")+1])*1000/20) if "--edge-buffer-km" in a else 40
fs = sorted(glob.glob(f"cache/{site}/gcov_*.npz")); D = {os.path.basename(f)[5:13]: np.load(f) for f in fs}
dates = sorted(D); x, y = D[dates[0]]["x"], D[dates[0]]["y"]; epsg = int(D[dates[0]]["epsg"])
def box(v, k=5):
    v = np.nan_to_num(v, nan=np.nanmedian(v)); p = np.pad(v, k//2, mode="edge"); s = np.zeros(v.shape)
    for i in range(k):
        for j in range(k): s += p[i:i+v.shape[0], j:j+v.shape[1]]
    return s/(k*k)
HH = {d: box(10*np.log10(np.where(D[d]["hh"] > 0, D[d]["hh"], np.nan))) for d in dates}
pool = np.concatenate([HH[d][::4, ::4].ravel() for d in dates]); pool = pool[np.isfinite(pool)]
hist, edges = np.histogram(pool, bins=200, range=(-35, 5)); mids = (edges[:-1]+edges[1:])/2
w0 = np.cumsum(hist); w1 = w0[-1]-w0; m0 = np.cumsum(hist*mids)/np.maximum(w0, 1); m1 = (np.sum(hist*mids)-np.cumsum(hist*mids))/np.maximum(w1, 1)
thr = float(mids[np.argmax(w0*w1*(m0-m1)**2)])
if "--threshold-db" in a: thr = float(a[a.index("--threshold-db")+1])   # fixed threshold when water is too small a share of the window for Otsu
def label_largest(mask, seed_rc=None):
    # simple flood fill labelling (4-connectivity) without scipy
    lab = np.zeros(mask.shape, np.int32); cur = 0; sizes = {}
    for r0 in range(mask.shape[0]):
        for c0 in np.nonzero(mask[r0] & (lab[r0] == 0))[0]:
            if lab[r0, c0]: continue
            cur += 1; stack = [(r0, c0)]; lab[r0, c0] = cur; n = 0
            while stack:
                r, c = stack.pop(); n += 1
                for rr, cc in ((r+1, c), (r-1, c), (r, c+1), (r, c-1)):
                    if 0 <= rr < mask.shape[0] and 0 <= cc < mask.shape[1] and mask[rr, cc] and not lab[rr, cc]:
                        lab[rr, cc] = cur; stack.append((rr, cc))
            sizes[cur] = n
    if not sizes: return mask & False
    if isinstance(seed_rc, list):   # several seeds along a long, narrow reservoir: keep every body that touches one
        keep = {lab[rc] for rc in seed_rc if lab[rc]}
        return np.isin(lab, list(keep)) if keep else mask & False
    keep = lab[seed_rc] if seed_rc and lab[seed_rc] else max(sizes, key=sizes.get)
    return lab == keep
seed = None
if slon is not None:
    sx, sy = pyproj.Transformer.from_crs(4326, epsg, always_xy=True).transform(slon, slat)
    seed = (int(np.argmin(abs(y-sy))), int(np.argmin(abs(x-sx))))
if "--seeds" in a:   # "lon,lat;lon,lat;..."
    T = pyproj.Transformer.from_crs(4326, epsg, always_xy=True); seed = []
    for pt in a[a.index("--seeds")+1].split(";"):
        sx, sy = T.transform(*map(float, pt.split(","))); seed.append((int(np.argmin(abs(y-sy))), int(np.argmin(abs(x-sx)))))
out = {"threshold_db": round(thr, 2), "dates": [], "water_km2": [], "method": "Otsu threshold on smoothed HH (5x5), largest connected dark body / seeded body"}
O = f"site/data/{site}/layers"; os.makedirs(O, exist_ok=True)
def dilate(m, n):
    out = m.copy()
    for _ in range(n):
        o = out.copy(); o[1:] |= out[:-1]; o[:-1] |= out[1:]; o[:, 1:] |= out[:, :-1]; o[:, :-1] |= out[:, 1:]; out = o
    return out
skipped = []
valid_dates = []
for d in dates:
    raw = D[d]["hh"]
    if (raw > 0).mean() < 0.5: skipped.append(d); continue
    valid_dates.append(d)
out["skipped_no_data"] = skipped
out["edge_buffer_m"] = buf_px*20
for d in valid_dates:
    nod = box((~(D[d]["hh"] > 0)).astype(float), 25) > 0.8   # only solid no-data areas (swath edge), not single dark pixels
    edge = dilate(nod, buf_px)   # exclude a buffer next to the swath edge
    dark = (HH[d] < thr) & ~edge
    if open_px: dark = dilate(~dilate(~dark, open_px), open_px)   # morphological opening: cut thin bridges to dark slopes
    m = label_largest(dark, seed)
    out["dates"].append(d); out["water_km2"].append(round(float(m.sum())*abs((x[1]-x[0])*(y[1]-y[0]))/1e6, 2))
    rgba = np.zeros(m.shape+(4,), np.uint8); rgba[m] = (40, 140, 255, 200); im = Image.fromarray(rgba)
    if max(im.size) > 600: im = im.resize((round(im.size[0]*600/max(im.size)), round(im.size[1]*600/max(im.size))), Image.NEAREST)
    im.save(f"{O}/water_{d}.png", optimize=True)
json.dump(out, open(f"site/data/{site}/water.json", "w"), indent=1)
print("threshold dB:", out["threshold_db"]); [print(d, a) for d, a in zip(out["dates"], out["water_km2"])]
