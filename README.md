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
- **Rogun reservoir (new, filling)**: in a 26x26 km window the open water grew from 16.0 km² (27 June) to 28.0 km² (19 September) as the reservoir rose; autumn values (19-27 km²) are mostly a radar effect: NASA HLS Landsat views four days before the 13 Oct and 6 Nov dips still show water on 90% and 96% of the 15 September water surface, while radar fell by about 30%. Same fixed water threshold as Nurek (-11.9 dB), seeds along the reservoir and a small morphological opening to cut thin links to dark slopes.
- **Rushan, 20 July 2026 mudflow**: not detected on two different orbits (0-0.8 ha). We show it as an honest example of what the radar can miss.

Optical cross-checks (Sentinel-2) and water-mask checks are in `analysis/`.

- **False alarm rate** (`scripts/false_alarm_rate.py`): the same Ayni test on 331 circle-and-pair combinations with no reported event (five areas, three orbits). 4 of 331 (1.2%) reach the Ayni level of 126 ha, all in the first image pair of the summer.
- **Proposed response workflow** (green / yellow / red alarms, EN/RU): [docs/RESPONSE_WORKFLOW.md](docs/RESPONSE_WORKFLOW.md).
- **Alarm board** (`scripts/alarm_board.py` → `site/data/alarm_board.json`, shown by `site/board.js`): the yellow-alarm rule run on every watched village and every image pair we have.
- **Test any spot** (`scripts/export_flags.py` → `site/data/<story>/flags.png`, run in the browser by `site/spot.js`): tap the map and the same rule runs in a 2.5 km circle around that point. Bit *i* of the PNG's red channel is the flag for pair *i*, and alpha 0 means no data.
- **Ayni optical check** (`scripts/ayni_optical_check.py`) and **radar vs optical water gap** (`scripts/water_gap.py`).

## Data
- NISAR L2 **GCOV** (backscatter, HH and HV, 20 m) and **GUNW** (interferograms, coherence 20 m), provisional products, from ASF DAAC. Only small windows are read remotely with HTTP range requests; full files (1.4-7 GB) are never downloaded.
- NASA HLS v2.0 (HLSL30 Landsat 8/9, HLSS30), LP DAAC, for the Rogun autumn check (`scripts/hls_water.py`).
- Copernicus Sentinel-2 L2A (AWS Open Data) for optical checks; Sentinel-2 cloudless 2023 by EOX as basemap.
- Event reports: Asia-Plus, IFRC DREF MDRTJ038, Sentinel Asia (links on the site).

## Reproduce
```bash
python3 -m venv .venv && .venv/bin/pip install numpy h5py fsspec aiohttp requests pyproj matplotlib pillow rasterio
# store your own Earthdata token (never commit it) in ~/.nasa/earthdata_token
.venv/bin/python scripts/extract_series.py ayni 68.978 39.346 4 012 A 021 2005 2000
.venv/bin/python scripts/make_story.py ayni --event-pair 20260709_20260721 --control-pair 20260627_20260709 --zone-radius-km 2.5 --zone-lon 68.978 --zone-lat 39.349
.venv/bin/python scripts/extract_series.py rogun 69.86 38.79 13 012 A 021 2005 2000
.venv/bin/python scripts/make_story.py rogun
.venv/bin/python scripts/water_series.py rogun --threshold-db -11.9 --open-px 2 --seeds "69.7755,38.699;69.7989,38.7146;69.8085,38.7308;69.8524,38.7647;69.868,38.797;69.929,38.8457"
.venv/bin/python scripts/optical_water.py rogun --seeds "<same seeds>"   # Sentinel-2 water area on the same grid
.venv/bin/python scripts/alpha_diverging.py     # make 'no change' transparent in change layers
.venv/bin/python scripts/make_thumbs.py         # story images over the Sentinel-2 cloudless basemap
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
