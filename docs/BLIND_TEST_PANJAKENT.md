# Blind test: Panjakent (Rashnai Poyon) mudflow, 11 July 2026, ~16:30
Written 2026-11-15 07:29 UTC BEFORE extracting or looking at any NISAR data for this place.

Event: Rashnai Poyon village, Shing jamoat, Panjakent district (Asia-Plus, 16 Jul 2026, KChS figures):
5 houses destroyed, 4 damaged, mud and water in 63 homes and plots, 2 bridges, 1.3 km road.
Location: 39.2326 N, 67.8004 E (OpenStreetMap village node).

Method, unchanged from Ayni (scripts/pair_drop_test.py): GUNW coherence, each pair minus the median of all other
pairs, 5x5 smoothing, drop > 0.3, area inside a 2.5 km circle centred on the village. Window 8 x 8 km.
No parameter will be changed after seeing the data.

Detection, decided now, for each orbit separately:
  D1. the pair spanning 11 July has the largest flagged area of all pairs in the circle, AND
  D2. it is >= 50 ha, AND
  D3. it is >= 2x what the same pair flags on average across the whole window (our "yellow" rule).
Orbits: 012A (9 -> 21 Jul), 113A (4 -> 16 Jul), 121D (4 -> 16 Jul), as far as data can be read.
Whatever the result, it goes on the site.

## Result (added after running, nothing above was changed)
| Orbit | Pair spanning 11 Jul | Flagged in 2.5 km circle | Largest of all pairs? | Ratio to window average | Verdict |
|---|---|---|---|---|---|
| 012A ascending | 9 -> 21 Jul | 3.2 ha | no (largest 76.8 ha, 19 Sep -> 1 Oct) | - | not detected |
| 113A ascending | 4 -> 16 Jul | 15.2 ha | no (largest 35.6 ha, 26 Sep -> 8 Oct) | - | not detected |
| 121D descending | 4 -> 16 Jul | 110.8 ha | yes (next 62.6 ha, a 36-day pair) | 2.4x | **detected** |

Detected on 1 of 3 orbits. Geometry (Copernicus DEM 30 m): on 121D, 64% of the flagged area is on slopes facing west
(towards the descending satellite), against 31% of the circle; the largest patch, 48 ha, is 860 m east of the village at
about 1,740 m, on a west-facing slope. The two ascending orbits look from the east and see these slopes from behind;
their few flags are on east-facing slopes. Optical confirmation of the 121D patches has not been done yet.
