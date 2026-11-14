"""Extract Sentinel-2 TCI (True Color) crops for Ayni and Rushan before and after mudflows."""
import os, sys, rasterio, numpy as np, pyproj, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from rasterio.windows import from_bounds
from PIL import Image

os.makedirs("/Users/akhmadbek/nasa/analysis", exist_ok=True)

def crop_s2(url, min_lon, min_lat, max_lon, max_lat):
    with rasterio.open(url) as src:
        tr = pyproj.Transformer.from_crs(4326, src.crs, always_xy=True)
        minx, miny = tr.transform(min_lon, min_lat)
        maxx, maxy = tr.transform(max_lon, max_lat)
        # Ensure correct order
        left, right = min(minx, maxx), max(minx, maxx)
        bottom, top = min(miny, maxy), max(miny, maxy)
        win = from_bounds(left, bottom, right, top, src.transform)
        arr = src.read(window=win)
        # arr is (3, H, W) RGB uint8
        img = np.moveaxis(arr, 0, -1)
        return img, (left, right, bottom, top), tr

# 1. AYNI: Dargh & Kazdon
print("Processing Ayni...")
url_ayni_before = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/42/S/VJ/2026/7/S2A_42SVJ_20260709_1_L2A/TCI.tif"
url_ayni_after = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/42/S/VJ/2026/7/S2C_42SVJ_20260714_0_L2A/TCI.tif"

# Area around Dargh/Kazdon and the ravine (39.327–39.365 N, 68.961–69.005 E)
min_lon, min_lat, max_lon, max_lat = 68.955, 39.320, 69.015, 39.375

img_b, bounds_b, tr_ayni = crop_s2(url_ayni_before, min_lon, min_lat, max_lon, max_lat)
img_a, bounds_a, _ = crop_s2(url_ayni_after, min_lon, min_lat, max_lon, max_lat)

# Save individual images
Image.fromarray(img_b).save("/Users/akhmadbek/nasa/analysis/ayni_s2_before_20260709.png")
Image.fromarray(img_a).save("/Users/akhmadbek/nasa/analysis/ayni_s2_after_20260714.png")

# Make side-by-side plot with points
pts_ayni = [
    ("Dargh (39.3474, 68.9814)", 68.9814, 39.3474),
    ("Kazdon (39.3460, 68.9750)", 68.9750, 39.3460),
    ("NISAR Anomaly Center (39.3552, 68.9712)", 68.9712, 39.3552)
]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 7), constrained_layout=True)
ax1.imshow(img_b, extent=[min_lon, max_lon, min_lat, max_lat])
ax1.set_title("Sentinel-2 True Color — BEFORE: 2026-07-09\n(2 days before mudflow)", fontsize=11, fontweight="bold")
ax2.imshow(img_a, extent=[min_lon, max_lon, min_lat, max_lat])
ax2.set_title("Sentinel-2 True Color — AFTER: 2026-07-14\n(3 days after mudflow)", fontsize=11, fontweight="bold")

for ax in (ax1, ax2):
    for label, lon, lat in pts_ayni:
        ax.plot(lon, lat, "o", mfc="red", mec="white", ms=8)
        ax.annotate(label, (lon, lat), color="yellow", fontsize=9, fontweight="bold",
                    xytext=(5, 5), textcoords="offset points",
                    bbox=dict(boxstyle="round,pad=0.2", fc="black", alpha=0.6))
    # Draw rectangle of NISAR anomaly zone
    from matplotlib.patches import Rectangle
    rect = Rectangle((68.961, 39.327), 69.005 - 68.961, 39.365 - 39.327,
                     linewidth=2, edgecolor="cyan", facecolor="none", linestyle="--")
    ax.add_patch(rect)
    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")

fig.suptitle("Ayni Mudflow Verification (July 11, 2026) — Copernicus Sentinel-2 L2A\nCyan box = NISAR GCOV (+3..+6 dB) & GUNW Coherence Drop Zone", fontsize=12)
fig.savefig("/Users/akhmadbek/nasa/analysis/ayni_s2_comparison.png", dpi=150)
plt.close(fig)
print("Saved ayni_s2_comparison.png")

# 2. RUSHAN: Barrushon & Derushon
print("Processing Rushan...")
url_rushan_before = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/42/S/YH/2026/7/S2B_42SYH_20260716_0_L2A/TCI.tif"
url_rushan_after = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/42/S/YH/2026/7/S2B_42SYH_20260726_0_L2A/TCI.tif"

# Barrushon: 37.9504, 71.4809; Derushon: 37.9259, 71.4315
min_lon, min_lat, max_lon, max_lat = 71.41, 37.91, 71.51, 37.97

img_rb, bounds_rb, _ = crop_s2(url_rushan_before, min_lon, min_lat, max_lon, max_lat)
img_ra, bounds_ra, _ = crop_s2(url_rushan_after, min_lon, min_lat, max_lon, max_lat)

Image.fromarray(img_rb).save("/Users/akhmadbek/nasa/analysis/rushan_s2_before_20260716.png")
Image.fromarray(img_ra).save("/Users/akhmadbek/nasa/analysis/rushan_s2_after_20260726.png")

pts_rushan = [
    ("Barrushon (37.9504, 71.4809)", 71.4809, 37.9504),
    ("Derushon (37.9259, 71.4315)", 71.4315, 37.9259)
]

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 7), constrained_layout=True)
ax1.imshow(img_rb, extent=[min_lon, max_lon, min_lat, max_lat])
ax1.set_title("Sentinel-2 True Color — BEFORE: 2026-07-16\n(4 days before mudflow)", fontsize=11, fontweight="bold")
ax2.imshow(img_ra, extent=[min_lon, max_lon, min_lat, max_lat])
ax2.set_title("Sentinel-2 True Color — AFTER: 2026-07-26\n(6 days after mudflow)", fontsize=11, fontweight="bold")

for ax in (ax1, ax2):
    for label, lon, lat in pts_rushan:
        ax.plot(lon, lat, "o", mfc="red", mec="white", ms=8)
        ax.annotate(label, (lon, lat), color="yellow", fontsize=9, fontweight="bold",
                    xytext=(5, 5), textcoords="offset points",
                    bbox=dict(boxstyle="round,pad=0.2", fc="black", alpha=0.6))
    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")

fig.suptitle("Rushan Mudflow Verification (July 20, 2026) — Copernicus Sentinel-2 L2A", fontsize=12)
fig.savefig("/Users/akhmadbek/nasa/analysis/rushan_s2_comparison.png", dpi=150)
plt.close(fig)
print("Saved rushan_s2_comparison.png")
print("DONE ALL!")
