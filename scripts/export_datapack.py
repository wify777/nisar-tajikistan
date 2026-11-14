"""Export the cached NISAR windows as GeoTIFF + CSV so teammates can analyse them in QGIS/Python.
Writes datapack/<site>/{gcov,coherence}/*.tif, sources.csv, results/*.json and datapack/points.geojson.
Usage: python scripts/export_datapack.py"""
import glob, os, json, shutil, csv, numpy as np, rasterio
from rasterio.transform import from_origin

SITES = {"ayni": "ayni", "nurek": "nurek", "sarez": "sarez", "rushan_d": "rushan_092D"}
OUT = "datapack"

def write_tif(path, arr, x, y, epsg):
    dx, dy = x[1] - x[0], y[1] - y[0]
    if dy > 0:                      # make it north-up
        arr, y, dy = arr[::-1], y[::-1], -dy
    tr = from_origin(x[0] - dx / 2, y[0] + abs(dy) / 2, dx, abs(dy))
    with rasterio.open(path, "w", driver="GTiff", height=arr.shape[0], width=arr.shape[1], count=1,
                       dtype="float32", crs=f"EPSG:{epsg}", transform=tr, nodata=np.nan, compress="deflate") as d:
        d.write(arr.astype("float32"), 1)

shutil.rmtree(OUT, ignore_errors=True)
for src, name in SITES.items():
    o = f"{OUT}/{name}"; os.makedirs(f"{o}/gcov"); os.makedirs(f"{o}/coherence")
    rows = []
    for f in sorted(glob.glob(f"cache/{src}/*.npz")):
        z = np.load(f); b = os.path.basename(f)[:-4]; epsg = int(z["epsg"])
        if b.startswith("gcov_"):
            d = b[5:]
            for pol in ("hh", "hv"):
                a = z[pol].astype("float32"); a[~(a > 0)] = np.nan
                write_tif(f"{o}/gcov/{d}_{pol.upper()}.tif", a, z["x"], z["y"], epsg)
            rows.append(["gcov", d, "", str(z["maturity"]), str(z["url"])])
        else:
            d1, d2 = b[5:13], b[14:22]
            a = z["coh"].astype("float32"); a[~np.isfinite(a) | (a <= 0)] = np.nan
            write_tif(f"{o}/coherence/coh_{d1}_{d2}.tif", a, z["x"], z["y"], epsg)
            rows.append(["gunw", d1, d2, str(z["maturity"]), str(z["url"])])
    with open(f"{o}/sources.csv", "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["product", "date1", "date2", "maturity", "nisar_url"]); w.writerows(rows)
    res = f"site/data/{'rushan' if src == 'rushan_d' else src}"
    if os.path.isdir(res):
        os.makedirs(f"{o}/results")
        for j in glob.glob(f"{res}/*.json"): shutil.copy(j, f"{o}/results/")
    print(name, len(rows), "files")

pts = [("Dargh village", 68.9814, 39.3474), ("Kazdon village", 68.975, 39.346),
       ("Ayni change zone centre (r=2.5 km test circle)", 68.978, 39.349),
       ("Usoi dam", 72.5894, 38.2676), ("Lake Sarez seed point", 72.6652, 38.2291),
       ("Barrushon village", 71.4809, 37.9504), ("Derushon village", 71.4315, 37.9259),
       ("Nurek window centre (18x18 km)", 69.42, 38.43)]
gj = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"name": n},
      "geometry": {"type": "Point", "coordinates": [lo, la]}} for n, lo, la in pts]}
json.dump(gj, open(f"{OUT}/points.geojson", "w"), indent=1)
