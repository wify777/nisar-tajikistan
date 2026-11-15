"""Cut a small window from two remote NISAR GCOV files and compare HH/HV backscatter.
Usage: python gcov_change.py <name> <lon> <lat> <half_km> <url_before> <url_after> [label_lon,label_lat,name ...]"""
import sys, json, numpy as np, pyproj, matplotlib
matplotlib.use("Agg"); import matplotlib.pyplot as plt
sys.path.insert(0, "scripts"); from nisar_io import open_h5
name, lon, lat, half = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])*1000
urls = sys.argv[5:7]; labels = [a.split(",") for a in sys.argv[7:]]
G = "science/LSAR/GCOV/grids/frequencyA/"
out = {}
for tag, url in zip(["before", "after"], urls):
    h = open_h5(url); epsg = int(h[G+"projection"][()])
    tr = pyproj.Transformer.from_crs(4326, epsg, always_xy=True); X, Y = tr.transform(lon, lat)
    x = h[G+"xCoordinates"][:]; y = h[G+"yCoordinates"][:]
    c0, c1 = np.searchsorted(x, X-half), np.searchsorted(x, X+half)
    r0, r1 = np.searchsorted(-y, -(Y+half)), np.searchsorted(-y, -(Y-half))
    hh = h[G+"HHHH"][r0:r1, c0:c1]; hv = h[G+"HVHV"][r0:r1, c0:c1]
    out[tag] = dict(hh=hh, hv=hv, x=x[c0:c1], y=y[r0:r1], epsg=epsg, tr=tr,
                    date=url.split("_")[-6][:8] if False else [p for p in url.split("_") if p[:3]=="202"][0][:8])
    print(tag, out[tag]["date"], "window px:", hh.shape, "valid:", np.isfinite(hh).mean().round(3))
b, a = out["before"], out["after"]
assert np.allclose(b["x"], a["x"]) and np.allclose(b["y"], a["y"]), "grids differ"
db = lambda v: 10*np.log10(np.where(v > 0, v, np.nan))
d_hh = db(a["hh"]) - db(b["hh"]); d_hv = db(a["hv"]) - db(b["hv"])
ext = [b["x"][0], b["x"][-1], b["y"][-1], b["y"][0]]
pts = [(n, *b["tr"].transform(float(lo), float(la))) for lo, la, n in labels]
fig, ax = plt.subplots(2, 3, figsize=(15, 9.5), constrained_layout=True)
panels = [(db(b["hh"]), f"HH before {b['date']}", "gray", (-25, 0)), (db(a["hh"]), f"HH after {a['date']}", "gray", (-25, 0)),
          (d_hh, "HH change, dB (after - before)", "RdBu_r", (-6, 6)),
          (db(b["hv"]), f"HV before {b['date']}", "gray", (-32, -8)), (db(a["hv"]), f"HV after {a['date']}", "gray", (-32, -8)),
          (d_hv, "HV change, dB (after - before)", "RdBu_r", (-6, 6))]
for axi, (img, t, cm, (lo, hi)) in zip(ax.flat, panels):
    im = axi.imshow(img, extent=ext, cmap=cm, vmin=lo, vmax=hi); axi.set_title(t, fontsize=10)
    for n, px, py in pts: axi.plot(px, py, "o", mfc="none", mec="yellow", ms=10); axi.annotate(n, (px, py), color="yellow", fontsize=8, xytext=(6, 6), textcoords="offset points")
    axi.set_xticks([]); axi.set_yticks([]); fig.colorbar(im, ax=axi, shrink=0.75)
fig.suptitle(f"NISAR GCOV L-band, {name}: provisional data, 20 m pixels, window {2*half/1000:.0f} km", fontsize=11)
png = f"analysis/{name}_gcov_change.png"; fig.savefig(png, dpi=110)
def stat(v): v = v[np.isfinite(v)]; return dict(mean=round(float(v.mean()),2), p5=round(float(np.percentile(v,5)),2), p95=round(float(np.percentile(v,95)),2), frac_gt3=round(float((v>3).mean()),4), frac_lt_m3=round(float((v<-3).mean()),4))
s = {"name": name, "before": b["date"], "after": a["date"], "dHH": stat(d_hh), "dHV": stat(d_hv)}
# local stats in 600 m circles around labelled points
for n, px, py in pts:
    XX, YY = np.meshgrid(b["x"], b["y"]); m = (XX-px)**2 + (YY-py)**2 < 600**2
    mean = lambda v: round(float(np.nanmean(v[m])), 2) if np.isfinite(v[m]).any() else None   # null, not invalid NaN, in JSON
    s[f"near_{n}"] = {"dHH_mean": mean(d_hh), "dHV_mean": mean(d_hv)}
json.dump(s, open(f"analysis/{name}_gcov_change.json", "w"), indent=1); print(json.dumps(s, indent=1)); print("saved", png)
