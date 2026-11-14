# NISAR Tajikistan

How the NASA-ISRO **NISAR** L-band radar sees surface change in Tajikistan.
Built for the **NASA Space Apps Challenge 2026** (Dushanbe), challenge **"Dancing with the SARs"**.

**Live site:** https://wify777.github.io/nisar-tajikistan/

> Project name is a working title.

## What it does
A static web app (`site/`) with an interactive map, a date slider and charts. For each place it shows NISAR radar layers over time and explains what changed, why we think it changed, and how sure we are.

- **Ayni, 11 July 2026 mudflow** (Dargh and Kazdon): coherence on ~75 ha of slopes and gullies above the villages fell from 0.89 to 0.44 only in the image pair spanning the event, then returned to 0.88-0.98; HH brightness rose 1.4 dB and stayed higher. An unbiased test over all 8 image pairs gives 126 ha of strong coherence loss near the villages for the event pair versus 0-26 ha for the others.
- **Nurek reservoir**: water area in an 18x18 km section grew from 24.8 km² (27 June) to 31.6 km² (26 August), stayed at 30-32 km² until late October and was 29.2 km² on 6 November.
- **Lake Sarez and the Usoi dam**: visible lake area stays at 23.7-28.0 km² with no trend; coherence on the dam (0.69-0.82) is always higher than around it, i.e. no sign of surface disturbance in the record.
- **Rushan, 20 July 2026 mudflow**: not detected on two different orbits (0-0.8 ha). We show it as an honest example of what the radar can miss.

Optical cross-checks (Sentinel-2) and water-mask checks are in `analysis/`.

## Data
- NISAR L2 **GCOV** (backscatter, HH and HV, 20 m) and **GUNW** (interferograms, coherence 20 m), provisional products, from ASF DAAC. Only small windows are read remotely with HTTP range requests; full files (1.4-7 GB) are never downloaded.
- Copernicus Sentinel-2 L2A (AWS Open Data) for optical checks; Sentinel-2 cloudless 2023 by EOX as basemap.
- Event reports: Asia-Plus, IFRC DREF MDRTJ038, Sentinel Asia (links on the site).

## Reproduce
```bash
python3 -m venv .venv && .venv/bin/pip install numpy h5py fsspec aiohttp requests pyproj matplotlib pillow rasterio
# store your own Earthdata token (never commit it) in ~/.nasa/earthdata_token
.venv/bin/python scripts/extract_series.py ayni 68.978 39.346 4 012 A 021 2005 2000
.venv/bin/python scripts/make_story.py ayni --event-pair 20260709_20260721 --control-pair 20260627_20260709 --zone-radius-km 2.5 --zone-lon 68.978 --zone-lat 39.349
python3 -m http.server 8770 --directory site
```

Key scripts:
- `scripts/nisar_io.py`: opens remote NISAR HDF5 files with an Earthdata token (read from a local file, never printed).
- `scripts/extract_series.py`: caches a window of every acquisition and interferogram pair for one track.
- `scripts/make_story.py`: builds web layers (PNG with corner coordinates) and time series.
- `scripts/water_series.py`: water extent per date (Otsu threshold on HH, largest connected dark body).
- `scripts/event_coverage.py`, `scripts/candidate_sites.py`: which NISAR images exist before and after each event.

## Limitations
Provisional data; short record (from June 2026, some tracks from November 2025); 12-day revisit; radar shadow and layover in steep terrain; coherence also drops with rain, snow and vegetation. Details on the site.

## Use of AI
We used AI assistants (Claude and others) to search sources, write processing code and draft texts. All numbers are produced by the scripts in this repository from NISAR data; sources are linked for checking.

## License
MIT. Data remain under their providers' terms (NASA/ASF, Copernicus, EOX).
