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


## Follow-up (15 Nov 2026): why the ascending orbits missed it

Added after the result, so this is an explanation, not part of the blind test. `scripts/detectability.py` combines the Copernicus DEM (30 m) with the line-of-sight vectors stored in the GUNW metadata (012A: radar at azimuth 73°, incidence 45°; 113A: 75°, 35°; 121D: 290°, 44°) and marks pixels in radar shadow, layover or a grazing view (local incidence > 70°), and pixels whose usual coherence (median of the 12-day pairs) is below 0.5, where a 0.3 drop cannot happen because coherence rarely falls below 0.2.

| Orbit | Changed slopes (111 ha, found by 121D) watchable | Rest of the 2.5 km circle watchable |
|---|---|---|
| 012A ascending | 23% (shadow 23%, grazing view 40%: slopes seen from behind) | 67% |
| 113A ascending | 31% (shadow 9%, grazing view 26%, low usual coherence) | 64% |
| 121D descending | 85% (12% layover: these slopes face it; partly expected, the slopes were defined by 121D) | 73% |

Watchable part of the changed slopes in 012A and 113A: about 25 and 34 ha, below the 50 ha minimum even if all of it had fired. In the event pairs of the ascending orbits, coherence on that watchable part fell by 0.10 (012A) and 0.19 (113A) against 0.02 and 0.06 on the hidden part. Three orbits together can watch 94% of the circle.
