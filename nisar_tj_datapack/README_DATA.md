# NISAR Tajikistan data pack

These are small windows cut from NASA-ISRO NISAR products (ASF DAAC), all at **20 m**. They are the exact inputs behind the numbers on https://wify777.github.io/nisar-tajikistan/.
They open in QGIS (drag and drop) or Python (`rasterio`).

All rasters use **EPSG:32642** (WGS 84 / UTM 42N) and are north-up. No-data is NaN.

| Folder | Place | Window (lon / lat) | Orbit | Time (UTC) | Dates |
|---|---|---|---|---|---|
| `ayni/` | Dargh and Kazdon, 11 Jul 2026 mudflow | 68.9316–69.0244 / 39.3100–39.3821 (8x8 km) | track 012, ascending, frame 021 | 00:32 | 11 images, 27 Jun – 6 Nov 2026 |
| `nurek/` | Nurek reservoir | 69.3165–69.5237 / 38.3491–38.5106 (18x18 km) | 012 A, frame 021 | 00:32 | 11 images |
| `sarez/` | Lake Sarez and Usoi dam | 72.5588–72.7011 / 38.1981–38.3018 (12x12 km) | 084 A, frame 021 | 00:23 | 12 images |
| `rushan_092D/` | Barrushon and Derushon, 20 Jul 2026 mudflow | 71.3900–71.5300 / 37.8974–38.0026 (12x12 km) | 092 D, frame 069 | 14:10 | 6 images, 20 Jun – 31 Aug |

## Files
- `gcov/<date>_HH.tif` and `gcov/<date>_HV.tif` hold radar backscatter from NISAR L2 GCOV, frequency A.
  - Values are **linear power** (gamma-naught, terrain-corrected).
  - Convert to decibels with `dB = 10*log10(value)`.
  - Water is usually below about −12 dB in HH.
- `coherence/coh_<date1>_<date2>.tif` holds interferometric coherence (0–1) from NISAR L2 GUNW (`coherenceMagnitude`, HH).
  - Close to 1 means the surface stayed the same between the two dates.
  - A drop means the surface was disturbed (debris, erosion, water, snow, vegetation growth, wet soil).
- `sources.csv` lists the original NISAR file URL and maturity for every raster (`P` = provisional, `B` = beta). Downloading the originals needs a free NASA Earthdata login.
- `results/` holds the numbers the website shows:
  - `series.json`: mean HH/HV per date in the change zone and the reference area; mean coherence per pair.
  - `water.json`: water area per date.
  - `pair_test.json`: the unbiased change test.
  - `meta.json`: window corners and URLs.
  - `dam_coherence.json`: Usoi dam versus surroundings.
- `points.geojson` holds the villages, the dam and the test circle centres.

## How the website numbers were made
- **Change test (`pair_test.json`)**, run separately for every coherence pair:
  1. Take the per-pixel median of **all other** pairs.
  2. Subtract it from this pair.
  3. Smooth the difference with a 5x5 moving mean.
  4. Count pixels below **−0.3**.
  5. Report the area in hectares (1 pixel = 0.04 ha). Report it twice: inside a 2.5 km circle around the test point, and for the whole window.

  Ayni result: 126 ha for 9–21 July (the mudflow pair) against 0–26 ha for every other pair.
- **Water area (`water.json`)**, run separately for every date:
  1. Smooth HH (converted to dB) with a 5x5 moving mean.
  2. Compute an Otsu threshold.
  3. Keep the largest connected dark body (Sarez: the body that contains the seed point).
  4. Drop a buffer of 0.8 km (Sarez 2.5 km) next to no-data edges.

Code: https://github.com/wify777/nisar-tajikistan (`scripts/`).

## Credit
Contains NISAR data (NASA/ISRO), provisional products, accessed via ASF DAAC, 2026.
