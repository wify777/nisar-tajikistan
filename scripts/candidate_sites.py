"""For candidate places in Tajikistan, count NISAR GCOV acquisitions (distinct dates) per track/direction.
Uses the public NASA CMR catalog, no login needed. Usage: python candidate_sites.py"""
import requests, re, collections, json
SITES = {  # name: (lon, lat)   approximate points, to be refined
 "Nurek reservoir":        (69.50, 38.50),
 "Rogun / Vakhsh upper":   (69.75, 38.72),
 "Kayrakkum reservoir":    (69.80, 40.27),
 "Lake Sarez":             (72.65, 38.25),
 "Lake Karakul":           (73.55, 39.02),
 "Vakhsh valley fields":   (68.80, 37.85),
 "Hissar valley fields":   (68.60, 38.55),
 "Fedchenko glacier":      (72.20, 38.85),
 "Dushanbe":               (68.78, 38.56),
 "Khujand":                (69.62, 40.28),
}
COLL = ["NISAR_L2_GCOV_V1", "NISAR_L2_GCOV_PROVISIONAL_V1", "NISAR_L2_GCOV_BETA_V1"]
pat = re.compile(r"GCOV_(\d{3})_(\d{3})_([AD])_(\d{3})_(\d{4})_([A-Z]{4})_[A-Z]_(\d{8})T")
out = {}
for name,(lon,lat) in SITES.items():
    per = collections.defaultdict(set); n=0
    for c in COLL:
        page=1
        while True:
            r = requests.get("https://cmr.earthdata.nasa.gov/search/granules.json",
                params={"short_name":c,"point":f"{lon},{lat}","page_size":200,"page_num":page},timeout=60).json()["feed"]["entry"]
            if not r: break
            for e in r:
                m = pat.search(e["title"])
                if not m: continue
                cyc,trk,dr,frm,mode,pol,date = m.groups()
                per[(trk,dr,frm,pol)].add(date); n+=1
            if len(r)<200: break
            page+=1
    ranked = sorted(per.items(), key=lambda kv: -len(kv[1]))[:3]
    out[name]= {"granules":n, "best": [{"track":k[0],"dir":k[1],"frame":k[2],"pol":k[3],"dates":len(v),"first":min(v),"last":max(v)} for k,v in ranked]}
    print(f"\n{name}  ({lat},{lon})  granules: {n}")
    for k,v in ranked: print(f"   track {k[0]} {k[1]} frame {k[2]} pol {k[3]}: {len(v):2d} dates  {min(v)} .. {max(v)}")
json.dump(out, open("candidate_sites.json","w"), indent=1)
