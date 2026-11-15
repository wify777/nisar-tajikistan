"""Outline of the detected change zone, drawn from the same mask the yellow fill uses.

The site fills the zone with a semi-transparent yellow raster (layers/zone.png). On a photo
that reads as loose patches. This writes a 2-pixel ring around the same mask, so the zone
gets a measured edge without any new geometry and without touching the numbers.

Input : data/<place>/layers/zone.png   (alpha > 0 = zone pixel, 400x400 or 600x600)
Output: data/<place>/layers/zone-edge.png  (same grid, ring only)

Run: python scripts/zone_edge.py
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "data")
COLOR = (255, 209, 102)  # #ffd166, the tone the site already uses for the change zone
GROW = 5                 # 5x5 max filter: a 2-pixel ring, visible at the story zoom


def ring_for(path_in, path_out):
    im = Image.open(path_in).convert("RGBA")
    a = np.array(im)[:, :, 3]
    mask = Image.fromarray(((a > 0) * 255).astype(np.uint8), mode="L")
    grown = mask.filter(ImageFilter.MaxFilter(GROW))
    ring = np.array(grown) > 0
    ring &= np.array(mask) == 0
    out = np.zeros((ring.shape[0], ring.shape[1], 4), dtype=np.uint8)
    out[ring] = (COLOR[0], COLOR[1], COLOR[2], 235)
    Image.fromarray(out, mode="RGBA").save(path_out)
    return int(ring.sum())


def main():
    total = 0
    for place in sorted(os.listdir(ROOT)):
        src = os.path.join(ROOT, place, "layers", "zone.png")
        if not os.path.exists(src):
            continue
        dst = os.path.join(ROOT, place, "layers", "zone-edge.png")
        n = ring_for(src, dst)
        total += n
        print("%-8s ring %5d px -> %s" % (place, n, os.path.basename(dst)))
    print("done, %d ring pixels" % total)


if __name__ == "__main__":
    sys.exit(main())
