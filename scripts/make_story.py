"""Turn cached NISAR windows of one site into web-ready layers (PNG + corner coordinates) and a time series JSON.
Usage: python make_story.py <site> [--event-pair D1_D2 --control-pair D1_D2] [--zone-radius-km R --zone-lon LON --zone-lat LAT]
Outputs: site/data/<site>/{layers/*.png, series.json, meta.json}"""
import sys, os, glob, json, numpy as np, pyproj, matplotlib
matplotlib.use("Agg"); import matplotlib as mpl
from PIL import Image
args = sys.argv[1:]; site = args[0]
def opt(k, d=None): return args[args.index(k)+1] if k in args else d
ev_pair, ctl_pair = opt("--event-pair"), opt("--control-pair")
zr = float(opt("--zone-radius-km", "2.5"))*1000; zlon, zlat = opt("--zone-lon"), opt("--zone-lat")
C = f"cache/{site}"; O = f"site/data/{site}"; os.makedirs(O+"/layers", exist_ok=True)
idx = json.load(open(f"{C}/index.json"))
gc = sorted(glob.glob(f"{C}/gcov_*.npz")); gu = sorted(glob.glob(f"{C}/gunw_*.npz"))
d0 = np.load(gc[0]); epsg = int(d0["epsg"]); x, y = d0["x"], d0["y"]
inv = pyproj.Transformer.from_crs(epsg, 4326, always_xy=True)
dx = x[1]-x[0]; dy = y[1]-y[0]
corners = [inv.transform(x[0]-dx/2, y[0]-dy/2), inv.transform(x[-1]+dx/2, y[0]-dy/2), inv.transform(x[-1]+dx/2, y[-1]+dy/2), inv.transform(x[0]-dx/2, y[-1]+dy/2)]
corners = [[round(a, 6), round(b, 6)] for a, b in corners]   # TL, TR, BR, BL (MapLibre image source order)
def box(a, k=3):
    valid = np.isfinite(a)       # NaN is only filled to run the filter; no-data pixels stay no-data in the result
    a = np.nan_to_num(a, nan=np.nanmedian(a)); p = np.pad(a, k//2, mode="edge"); s = np.zeros(a.shape)
    for i in range(k):
        for j in range(k): s += p[i:i+a.shape[0], j:j+a.shape[1]]
    out = s/(k*k); out[~valid] = np.nan
    return out
db = lambda v: 10*np.log10(np.where(v > 0, v, np.nan))
def save(arr, name, cmap, lo, hi, alpha=None):
    n = np.clip((arr-lo)/(hi-lo), 0, 1); rgba = (mpl.colormaps[cmap](n)*255).astype(np.uint8)
    if alpha is not None: rgba[..., 3] = (np.clip(alpha, 0, 1)*255).astype(np.uint8)
    rgba[~np.isfinite(arr)] = 0
    im = Image.fromarray(rgba)
    if max(im.size) > 600: im = im.resize((round(im.size[0]*600/max(im.size)), round(im.size[1]*600/max(im.size))), Image.LANCZOS)
    im.save(f"{O}/layers/{name}.png", optimize=True)
G = {os.path.basename(f)[5:13]: np.load(f) for f in gc}
dates = sorted(G); first = dates[0]
U = {os.path.basename(f)[5:22]: np.load(f) for f in gu}
pairs = sorted(U)
for k in list(G.values())+list(U.values()):
    assert np.allclose(k["x"], x) and np.allclose(k["y"], y), "grid mismatch"
# zone mask: smoothed coherence drop (event - control) < -0.3, within zr of the zone centre
XX, YY = np.meshgrid(x, y); zone = None
if ev_pair and ctl_pair:
    drop = box(U[ev_pair]["coh"] - U[ctl_pair]["coh"], 5)
    fwd = pyproj.Transformer.from_crs(4326, epsg, always_xy=True); zx, zy = fwd.transform(float(zlon), float(zlat))
    zone = (drop < -0.3) & ((XX-zx)**2 + (YY-zy)**2 < zr**2)
    ref = (~zone) & (box(U[ctl_pair]["coh"], 5) > 0.5)
    save(np.where(zone, 1.0, np.nan), "zone", "autumn", 0, 1, alpha=np.where(zone, 0.55, 0))
    save(drop, f"cohchange_{ev_pair}", "RdBu", -0.6, 0.6)
series = {"dates": [], "hh_zone": [], "hh_ref": [], "hv_zone": [], "hv_ref": [], "pairs": [], "coh_zone": [], "coh_ref": [], "maturity": {}}
for d in dates:
    hh, hv = box(db(G[d]["hh"])), box(db(G[d]["hv"]))
    save(hh, f"hh_{d}", "gray", -25, 0); save(hv, f"hv_{d}", "gray", -32, -8)
    save(box(db(G[d]["hh"]) - db(G[first]["hh"])), f"dhh_{d}", "RdBu_r", -6, 6)
    series["dates"].append(d); series["maturity"][d] = str(G[d]["maturity"])
    if zone is not None:
        series["hh_zone"].append(round(float(np.nanmedian(hh[zone])), 2)); series["hh_ref"].append(round(float(np.nanmedian(hh[ref])), 2))
        series["hv_zone"].append(round(float(np.nanmedian(hv[zone])), 2)); series["hv_ref"].append(round(float(np.nanmedian(hv[ref])), 2))
for p in pairs:
    c = box(U[p]["coh"]); save(c, f"coh_{p}", "magma", 0, 1)
    series["pairs"].append(p)
    if zone is not None:
        series["coh_zone"].append(round(float(np.nanmedian(U[p]["coh"][zone])), 3)); series["coh_ref"].append(round(float(np.nanmedian(U[p]["coh"][ref])), 3))
meta = {"site": site, "corners": corners, "epsg": epsg, "pixel_m": float(abs(dx)), "track": idx["track"], "frame": idx["frame"],
        "first_date": first, "event_pair": ev_pair, "control_pair": ctl_pair, "zone_pixels": int(zone.sum()) if zone is not None else 0,
        "zone_ha": round(float(zone.sum())*abs(dx*dy)/1e4, 1) if zone is not None else 0,
        "gcov_urls": {d: str(G[d]["url"]) for d in dates}, "gunw_urls": {p: str(U[p]["url"]) for p in pairs},
        "speckle_filter": "3x3 boxcar for display; 5x5 for zone detection"}
json.dump(series, open(f"{O}/series.json", "w"), indent=1); json.dump(meta, open(f"{O}/meta.json", "w"), indent=1)
print(json.dumps({k: series[k] for k in ["dates", "hh_zone", "hh_ref", "pairs", "coh_zone", "coh_ref"]}, indent=0))
print("zone ha:", meta["zone_ha"], "| layers:", len(os.listdir(O+"/layers")), "| size MB:", round(sum(os.path.getsize(f"{O}/layers/"+f) for f in os.listdir(O+"/layers"))/1e6, 1))
