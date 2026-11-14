"""Charts for the demo slides (PNG, transparent). Usage: python scripts/demo_charts.py"""
import json, matplotlib
matplotlib.use("Agg"); import matplotlib.pyplot as plt
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 22, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.edgecolor": "#8a8f88", "xtick.color": "#4a4f49", "ytick.color": "#4a4f49", "axes.labelcolor": "#4a4f49"})
INK, WARM, MUTED, BLUE = "#1b1d1a", "#c2410c", "#b9b4aa", "#1d5fbf"
fmt = lambda d: f"{int(d[6:8])} {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][int(d[4:6])-1]}"

pt = json.load(open("site/data/ayni/pair_test.json"))
lab = [fmt(p[:8]) + "–\n" + fmt(p[9:]) for p in pt["pairs"]]
col = [WARM if p == "20260709_20260721" else MUTED for p in pt["pairs"]]
fig, ax = plt.subplots(figsize=(13, 6.5))
b = ax.bar(range(len(lab)), pt["near_ha"], color=col, width=0.7)
for i, v in enumerate(pt["near_ha"]):
    ax.text(i, v + 2.5, f"{v:g}", ha="center", fontsize=20, color=WARM if col[i] == WARM else "#4a4f49", fontweight="bold" if col[i] == WARM else "normal")
ax.set_xticks(range(len(lab))); ax.set_xticklabels(lab, fontsize=15)
ax.set_ylabel("hectares of strong coherence loss\nwithin 2.5 km of the villages", fontsize=17)
ax.set_ylim(0, 145); ax.grid(axis="y", color="#e2ddd3"); ax.set_axisbelow(True)
fig.tight_layout(); fig.savefig("demo/img/ayni_pairs.png", dpi=110, transparent=True); plt.close(fig)

w = json.load(open("site/data/nurek/water.json"))
fig, ax = plt.subplots(figsize=(13, 6))
x = range(len(w["dates"])); ax.plot(x, w["water_km2"], color=BLUE, lw=4, marker="o", ms=10)
ax.set_xticks(list(x)); ax.set_xticklabels([fmt(d) for d in w["dates"]], fontsize=15, rotation=0)
ax.set_ylabel("open water, km²", fontsize=18); ax.set_ylim(22, 34); ax.grid(axis="y", color="#e2ddd3")
ax.annotate("24.8", (0, w["water_km2"][0]), textcoords="offset points", xytext=(0, -34), ha="center", color=BLUE, fontsize=20, fontweight="bold")
i = w["water_km2"].index(max(w["water_km2"][:6])); ax.annotate(f"{w['water_km2'][i]:.1f}", (i, w["water_km2"][i]), textcoords="offset points", xytext=(0, 16), ha="center", color=BLUE, fontsize=20, fontweight="bold")
fig.tight_layout(); fig.savefig("demo/img/nurek_water.png", dpi=110, transparent=True); plt.close(fig)
print("ok")
