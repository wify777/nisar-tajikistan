"""Extract a small window of every NISAR GCOV acquisition and GUNW pair for one track/frame/mode
at a site and cache them as .npz (no full downloads).
Usage: python extract_series.py <site> <lon> <lat> <half_km> <track> <dir> <frame> <gcov_mode> <gunw_mode> [start end] [--workers N]
Example: python extract_series.py ayni 68.978 39.346 4 012 A 021 2005 2000"""
import sys, os, re, json, requests, numpy as np, pyproj, concurrent.futures as cf
sys.path.insert(0, "scripts"); from nisar_io import open_h5
a = [x for x in sys.argv[1:] if not x.startswith("--")]
workers = int(sys.argv[sys.argv.index("--workers")+1]) if "--workers" in sys.argv else 4
a = [x for x in a if not (sys.argv.index(x) > 0 and sys.argv[sys.argv.index(x)-1] == "--workers")]
site, lon, lat, half, trk, dr, frm, gmode, umode = a[0], float(a[1]), float(a[2]), float(a[3])*1000, *a[4:9]
start, end = (a[9], a[10]) if len(a) > 10 else ("2025-11-01", "2026-12-31")
out = f"cache/{site}"; os.makedirs(out, exist_ok=True)

def urls(prod, mode):
    res = {}
    for c in [f"NISAR_L2_{prod}_V1", f"NISAR_L2_{prod}_PROVISIONAL_V1", f"NISAR_L2_{prod}_BETA_V1"]:
        page = 1
        while True:
            r = requests.get("https://cmr.earthdata.nasa.gov/search/granules.umm_json", params={"short_name": c, "point": f"{lon},{lat}",
                "temporal": f"{start}T00:00:00Z,{end}T23:59:59Z", "page_size": 100, "page_num": page}, timeout=60).json()["items"]
            for it in r:
                ur = it["umm"]["GranuleUR"]
                if not re.search(rf"_{trk}_{dr}_{frm}_", ur) or f"_{mode}_" not in ur: continue
                d = re.findall(r"_(20\d{6})T", ur)
                key = d[0] if prod == "GCOV" else f"{d[0]}_{d[2]}"
                u = [x["URL"] for x in it["umm"]["RelatedUrls"] if x["Type"] == "GET DATA" and x["URL"].startswith("https") and x["URL"].endswith(".h5")]
                mat = "V" if "_V1" in c and "PROVISIONAL" not in c and "BETA" not in c else ("P" if "PROVISIONAL" in c else "B")
                # prefer validated > provisional > beta for the same date
                if u and (key not in res or "VPB".index(mat) < "VPB".index(res[key][1])): res[key] = (u[0], mat)
            if len(r) < 100: break
            page += 1
    return dict(sorted(res.items()))

def window(h, G):
    epsg = int(h[G+"projection"][()])
    tr = pyproj.Transformer.from_crs(4326, epsg, always_xy=True); X, Y = tr.transform(lon, lat)
    x = h[G+"xCoordinates"][:]; y = h[G+"yCoordinates"][:]
    c0, c1 = np.searchsorted(x, X-half), np.searchsorted(x, X+half); r0, r1 = np.searchsorted(-y, -(Y+half)), np.searchsorted(-y, -(Y-half))
    return epsg, (r0, r1, c0, c1), x[c0:c1], y[r0:r1]

def do_gcov(key, url, mat):
    f = f"{out}/gcov_{key}.npz"
    if os.path.exists(f): return key, "cached"
    h = open_h5(url); G = "science/LSAR/GCOV/grids/frequencyA/"
    epsg, (r0, r1, c0, c1), x, y = window(h, G)
    np.savez_compressed(f, hh=h[G+"HHHH"][r0:r1, c0:c1], hv=h[G+"HVHV"][r0:r1, c0:c1], x=x, y=y, epsg=epsg, maturity=mat, url=url)
    return key, "ok"

def do_gunw(key, url, mat):
    f = f"{out}/gunw_{key}.npz"
    if os.path.exists(f): return key, "cached"
    h = open_h5(url); G = "science/LSAR/GUNW/grids/frequencyA/wrappedInterferogram/"
    if G+"projection" not in h: G2 = "science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram/"; epsg = int(h[G2+"projection"][()])
    else: epsg = None
    tr_epsg = epsg or int(h[G+"projection"][()])
    tr = pyproj.Transformer.from_crs(4326, tr_epsg, always_xy=True); X, Y = tr.transform(lon, lat)
    x = h[G+"xCoordinates"][:]; y = h[G+"yCoordinates"][:]
    c0, c1 = np.searchsorted(x, X-half), np.searchsorted(x, X+half); r0, r1 = np.searchsorted(-y, -(Y+half)), np.searchsorted(-y, -(Y-half))
    np.savez_compressed(f, coh=h[G+"HH/coherenceMagnitude"][r0:r1, c0:c1], x=x[c0:c1], y=y[r0:r1], epsg=tr_epsg, maturity=mat, url=url)
    return key, "ok"

g = urls("GCOV", gmode); u = urls("GUNW", umode)
print(f"{site}: {len(g)} GCOV dates, {len(u)} GUNW pairs", flush=True)
json.dump({"site": site, "lon": lon, "lat": lat, "half_m": half, "track": f"{trk}{dr}", "frame": frm,
           "gcov": {k: v for k, v in g.items()}, "gunw": {k: v for k, v in u.items()}}, open(f"{out}/index.json", "w"), indent=1)
jobs = [("gcov", k, *v) for k, v in g.items()] + [("gunw", k, *v) for k, v in u.items()]
with cf.ThreadPoolExecutor(workers) as ex:
    futs = {ex.submit(do_gcov if t == "gcov" else do_gunw, k, url, m): (t, k) for t, k, url, m in jobs}
    for fu in cf.as_completed(futs):
        t, k = futs[fu]
        try: print(t, *fu.result(), flush=True)
        except Exception as e: print(t, k, "ERROR", repr(e)[:200], flush=True)
print("DONE", site, flush=True)
