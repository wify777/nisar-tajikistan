"""Compare 20 m coherence from several NISAR GUNW pairs in a small window.
Usage: python gunw_coherence.py <name> <lon> <lat> <half_km> <url1> <url2> ... (first = control pair, the event pair is marked by --event N)"""
import sys, json, re, numpy as np, pyproj, matplotlib
matplotlib.use("Agg"); import matplotlib.pyplot as plt
sys.path.insert(0, "scripts"); from nisar_io import open_h5
args = sys.argv[1:]; ev = int(args[args.index("--event")+1]) if "--event" in args else 1
args = [a for i,a in enumerate(args) if a != "--event" and (i == 0 or args[i-1] != "--event")]
name, lon, lat, half = args[0], float(args[1]), float(args[2]), float(args[3])*1000
labels = [a.split(",") for a in args[4:] if a.count(",") == 2]; urls = [a for a in args[4:] if a.startswith("http")]
G = "science/LSAR/GUNW/grids/frequencyA/wrappedInterferogram/"
cohs, titles = [], []
for url in urls:
    h = open_h5(url)
    epsg = int(h[G+"projection"][()]) if G+"projection" in h else int(h["science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/projection"][()])
    tr = pyproj.Transformer.from_crs(4326, epsg, always_xy=True); X, Y = tr.transform(lon, lat)
    x = h[G+"xCoordinates"][:]; y = h[G+"yCoordinates"][:]
    c0, c1 = np.searchsorted(x, X-half), np.searchsorted(x, X+half); r0, r1 = np.searchsorted(-y, -(Y+half)), np.searchsorted(-y, -(Y-half))
    cohs.append(h[G+"HH/coherenceMagnitude"][r0:r1, c0:c1]); d = re.findall(r"_(20\d{6})T", url); titles.append(f"{d[0]} -> {d[2]}")
    xs, ys = x[c0:c1], y[r0:r1]; print(titles[-1], cohs[-1].shape, "mean coh", np.nanmean(cohs[-1]).round(3))
assert len({c.shape for c in cohs}) == 1, f"windows differ in shape: {[c.shape for c in cohs]} (pairs must come from the same frame)"
ext = [xs[0], xs[-1], ys[-1], ys[0]]; pts = [(n, *tr.transform(float(lo), float(la))) for lo, la, n in labels]
diff = cohs[ev] - cohs[0]
fig, ax = plt.subplots(1, len(cohs)+1, figsize=(5*(len(cohs)+1), 5), constrained_layout=True)
for i, c in enumerate(cohs):
    im = ax[i].imshow(c, extent=ext, cmap="magma", vmin=0, vmax=1); ax[i].set_title(("EVENT pair " if i == ev else "control " if i == 0 else "")+titles[i], fontsize=10); fig.colorbar(im, ax=ax[i], shrink=0.8)
im = ax[-1].imshow(diff, extent=ext, cmap="RdBu", vmin=-0.6, vmax=0.6); ax[-1].set_title("coherence change: event - control", fontsize=10); fig.colorbar(im, ax=ax[-1], shrink=0.8)
for a in ax:
    a.set_xticks([]); a.set_yticks([])
    for n, px, py in pts: a.plot(px, py, "o", mfc="none", mec="cyan", ms=10); a.annotate(n, (px, py), color="cyan", fontsize=8, xytext=(6, 6), textcoords="offset points")
fig.suptitle(f"NISAR GUNW HH coherence (20 m), {name}, provisional", fontsize=11)
png = f"analysis/{name}_coherence.png"; fig.savefig(png, dpi=105)
s = {"pairs": titles, "mean": [round(float(np.nanmean(c)),3) for c in cohs], "frac_drop_gt_0.3": round(float(np.nanmean(diff < -0.3)),4)}
json.dump(s, open(f"analysis/{name}_coherence.json","w"), indent=1); print(s); print("saved", png)
np.save(f"analysis/{name}_coh_event.npy", cohs[ev]); np.save(f"analysis/{name}_coh_control.npy", cohs[0])
