"""30-second demo video with burned-in English captions (ffmpeg here has no libass, so captions are drawn with PIL
and overlaid). Also writes demo/NISAR_Tajikistan_demo.srt. Usage: python scripts/make_video.py"""
import os, subprocess
from PIL import Image, ImageDraw, ImageFont

D = "demo"; T = f"{D}/video_tmp"; os.makedirs(T, exist_ok=True)
FONT = "/Library/Fonts/Arial Unicode.ttf"
# (image, seconds, caption)
SEG = [
    ("frames/slide1.png", 3.5, "We are a team from Dushanbe, Tajikistan."),
    ("frames/slide2.png", 4.0, "Mudflows hit our mountain villages, and storm clouds hide the slopes from optical satellites."),
    ("img/site_top.png", 3.5, "NISAR Tajikistan turns raw NASA-ISRO NISAR radar files into a simple map anyone can read."),
    ("img/site_map_ayni.png", 5.5, "Ayni, July 2026: above two villages, radar coherence fell from 0.89 to 0.44, only across the mudflow."),
    ("frames/slide4.png", 4.0, "126 hectares changed in that image pair, versus 0 to 26 in every other pair."),
    ("frames/slide5.png", 4.0, "Four places, four honest answers, including the mudflow the radar missed."),
    ("frames/slide7.png", 5.5, "Next: a 'what changed' map after every 12-day NISAR pass. Open code, open data."),
]
W, H, FPS = 1920, 1080, 30

def fit(src, dst):
    im = Image.open(src).convert("RGB"); bg = Image.new("RGB", (W, H), (13, 18, 17))
    r = min(W / im.width, H / im.height); im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    bg.paste(im, ((W - im.width) // 2, (H - im.height) // 2)); bg.save(dst)

def caption(text, dst):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img); f = ImageFont.truetype(FONT, 46)
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) > 1500: lines.append(cur); cur = w
        else: cur = t
    lines.append(cur)
    lh = 62; h = lh * len(lines) + 36; y0 = H - 70 - h
    wmax = max(d.textlength(l, font=f) for l in lines) + 64
    d.rounded_rectangle(((W - wmax) / 2, y0, (W + wmax) / 2, y0 + h), radius=16, fill=(0, 0, 0, 185))
    for i, l in enumerate(lines):
        d.text((W / 2, y0 + 18 + i * lh + lh / 2), l, font=f, fill=(255, 255, 255, 255), anchor="mm")
    img.save(dst)

def ts(s):
    ms = round(s * 1000); return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"

parts, srt, t0 = [], [], 0.0
for i, (src, sec, cap) in enumerate(SEG):
    base, capf, out = f"{T}/b{i}.png", f"{T}/c{i}.png", f"{T}/p{i}.mp4"
    fit(f"{D}/{src}", base); caption(cap, capf)
    n = round(sec * FPS)
    vf = (f"[0:v]scale=3840:2160,zoompan=z='1+0.05*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={n}:s={W}x{H}:fps={FPS}[bg];"
          f"[bg][1:v]overlay=0:0,format=yuv420p,fade=t=in:st=0:d=0.3,fade=t=out:st={sec-0.3}:d=0.3[v]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", base, "-i", capf, "-filter_complex", vf, "-map", "[v]",
                    "-t", str(sec), "-r", str(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "20", out], check=True)
    parts.append(out); srt.append(f"{i+1}\n{ts(t0)} --> {ts(t0+sec)}\n{cap}\n"); t0 += sec

open(f"{T}/list.txt", "w").write("".join(f"file '{os.path.abspath(p)}'\n" for p in parts))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{T}/list.txt", "-c", "copy",
                "-movflags", "+faststart", f"{D}/NISAR_Tajikistan_demo.mp4"], check=True)
open(f"{D}/NISAR_Tajikistan_demo.srt", "w").write("\n".join(srt))
print("total seconds:", t0)
