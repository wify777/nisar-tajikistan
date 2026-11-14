"""Story thumbnails: a NISAR layer composited over the Sentinel-2 cloudless basemap (EOX tiles).
Writes site/img/<story>.jpg. Usage: python scripts/make_thumbs.py"""
import io, json, math, os, requests, numpy as np
from PIL import Image

TILE = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg"
STORIES = {"ayni": "cohchange_20260709_20260721.png", "sarez": "water_20260831.png",
           "nurek": "water_20260826.png", "rushan": "cohchange_20260714_20260726.png"}
OUT_W = 1200

def merc(lon, lat, z):
    n = 2 ** z * 256
    return (lon + 180) / 360 * n, (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n

def basemap(w, e, s, n, z):
    x0, y0 = merc(w, n, z); x1, y1 = merc(e, s, z)
    tx0, ty0, tx1, ty1 = int(x0 // 256), int(y0 // 256), int(x1 // 256), int(y1 // 256)
    mos = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            r = requests.get(TILE.format(z=z, x=tx, y=ty), timeout=30, headers={"User-Agent": "space-apps-thumbs"}); r.raise_for_status()
            mos.paste(Image.open(io.BytesIO(r.content)).convert("RGB"), ((tx - tx0) * 256, (ty - ty0) * 256))
    return mos.crop((int(x0 - tx0 * 256), int(y0 - ty0 * 256), int(x1 - tx0 * 256), int(y1 - ty0 * 256)))

os.makedirs("site/img", exist_ok=True)
for sid, layer in STORIES.items():
    meta = json.load(open(f"site/data/{sid}/meta.json")); c = np.array(meta["corners"])
    w, e, s, n = c[:, 0].min(), c[:, 0].max(), c[:, 1].min(), c[:, 1].max()
    span = e - w; z = max(10, min(14, int(math.log2(360 / span * OUT_W / 256))))
    base = basemap(w, e, s, n, z)
    H = round(OUT_W * base.height / base.width)
    base = base.resize((OUT_W, H), Image.LANCZOS)
    # the layer PNG spans the same lon/lat box (corners are nearly axis-aligned); stretch it in Mercator
    lay = Image.open(f"site/data/{sid}/layers/{layer}").convert("RGBA").resize((OUT_W, H), Image.BILINEAR)
    a = np.array(lay).astype(float)
    if layer.startswith("cohchange"):   # diverging map: white = no change, so let the landscape show through it
        sat = (a[..., :3].max(-1) - a[..., :3].min(-1)) / 255
        a[..., 3] = np.clip(sat * 2.0, 0, 1) * 235
    else:
        a[..., 3] *= 0.85
    lay = Image.fromarray(a.astype("uint8"))
    out = Image.alpha_composite(base.convert("RGBA"), lay)
    zp = f"site/data/{sid}/layers/zone.png"
    if os.path.exists(zp):
        out = Image.alpha_composite(out, Image.open(zp).convert("RGBA").resize((OUT_W, H), Image.NEAREST))
    out.convert("RGB").save(f"site/img/{sid}.jpg", quality=82, optimize=True, progressive=True)
    print(sid, out.size, z)
