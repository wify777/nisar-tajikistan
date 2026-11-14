"""Incidence angle and line-of-sight direction at each data-pack site, read from the NISAR GCOV radarGrid cube.
Writes datapack/<site>/geometry.json. Usage: python scripts/site_geometry.py"""
import sys, csv, json, glob, numpy as np, rasterio
sys.path.insert(0, "scripts"); from nisar_io import open_h5
for s in ["ayni", "nurek", "sarez", "rushan_092D"]:
    u = [r for r in csv.DictReader(open(f"datapack/{s}/sources.csv")) if r["product"] == "gcov"][0]["nisar_url"]
    b = rasterio.open(sorted(glob.glob(f"datapack/{s}/gcov/*_HH.tif"))[0]).bounds
    cx, cy = (b.left + b.right) / 2, (b.bottom + b.top) / 2
    h = open_h5(u, block_mb=1); g = h["science/LSAR/GCOV/metadata/radarGrid"]; i = h["science/LSAR/identification"]
    x, y, z = g["xCoordinates"][()], g["yCoordinates"][()], g["heightAboveEllipsoid"][()]
    ix, iy = int(np.abs(x - cx).argmin()), int(np.abs(y - cy).argmin()); iz = len(z) // 2
    inc = float(g["incidenceAngle"][iz, iy, ix]); lx = float(g["losUnitVectorX"][iz, iy, ix]); ly = float(g["losUnitVectorY"][iz, iy, ix])
    # LOS unit vector points from target to sensor; azimuth (deg clockwise from north) of the direction towards the satellite
    az_to_sat = float(np.degrees(np.arctan2(lx, ly)) % 360)
    out = {"look_direction": i["lookDirection"][()].decode(), "pass": i["orbitPassDirection"][()].decode(),
           "incidence_deg": round(inc, 1), "height_m": float(z[iz]),
           "azimuth_towards_satellite_deg": round(az_to_sat, 1),
           "note": "Slopes facing towards the satellite (aspect near azimuth_towards_satellite) are compressed (foreshortening/layover if slope > incidence). Slopes facing away are darker, shadow if slope > 90 - incidence."}
    json.dump(out, open(f"datapack/{s}/geometry.json", "w"), indent=1); print(s, out["pass"], out["incidence_deg"], out["azimuth_towards_satellite_deg"])
