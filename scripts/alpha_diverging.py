"""Make the 'no change' (white) part of diverging layers transparent so the landscape shows through.
Idempotent: alpha is set from colour saturation, keeping existing no-data transparency.
Usage: python scripts/alpha_diverging.py"""
import glob, numpy as np
from PIL import Image
for f in glob.glob("site/data/*/layers/cohchange_*.png") + glob.glob("site/data/*/layers/dhh_*.png"):
    a = np.array(Image.open(f).convert("RGBA")).astype(float)
    sat = (a[..., :3].max(-1) - a[..., :3].min(-1)) / 255
    a[..., 3] = np.where(a[..., 3] > 0, np.clip(sat * 2.0, 0, 1) * 245 + 10, 0)
    Image.fromarray(a.astype("uint8")).save(f, optimize=True)
print("done")
