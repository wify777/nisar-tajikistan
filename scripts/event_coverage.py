"""For each documented event, find the nearest NISAR acquisitions before and after, per track.
Public CMR catalog only (no login). Writes event_coverage.json."""
import requests, re, json, collections, datetime as dt
EVENTS = [  # id, name, lon, lat, event date (YYYY-MM-DD) or None for chronic sites
 ("ayni",     "Ayni: Dargh & Kazdon mudflow",        68.9814, 39.3474, "2026-07-11"),
 ("panjakent","Panjakent: Rashnai Poyon mudflow",    67.8004, 39.2326, "2026-07-11"),
 ("rushan",   "Rushan: Barrushon & Dehrushon",       71.4809, 37.9504, "2026-07-20"),
 ("vanj",     "Vanj: Vravz mudflow (infrastructure)",71.2770, 38.3229, "2026-07-19"),
 ("kulob",    "Kulob city flood (May)",              69.7739, 37.9081, "2026-05-01"),
 ("usoi",     "Usoi dam / Lake Sarez",               72.5894, 38.2676, None),
 ("rogun",    "Rogun dam & reservoir",               69.7716, 38.6820, None),
]
PRODUCTS = {"GCOV":["NISAR_L2_GCOV_V1","NISAR_L2_GCOV_PROVISIONAL_V1","NISAR_L2_GCOV_BETA_V1"],
            "GUNW":["NISAR_L2_GUNW_V1","NISAR_L2_GUNW_PROVISIONAL_V1","NISAR_L2_GUNW_BETA_V1"]}
pat = re.compile(r"_(\d{3})_(\d{3})_([AD])_(\d{3})_")
def acq(colls, lon, lat):
    per = collections.defaultdict(set)
    for c in colls:
        mat = "V" if c.endswith("_V1") and "PROVISIONAL" not in c and "BETA" not in c else ("P" if "PROVISIONAL" in c else "B")
        page = 1
        while True:
            e = requests.get("https://cmr.earthdata.nasa.gov/search/granules.json",
                 params={"short_name":c,"point":f"{lon},{lat}","page_size":200,"page_num":page},timeout=60).json()["feed"]["entry"]
            for x in e:
                m = pat.search(x["title"]); trk = m.group(2)+m.group(3) if m else "?"
                per[trk].add((x["time_start"][:10], mat))
            if len(e) < 200: break
            page += 1
    return per
out = []
for eid,name,lon,lat,ev in EVENTS:
    rec = {"id":eid,"name":name,"lon":lon,"lat":lat,"event":ev,"products":{}}
    print(f"\n== {name}  ({lat}, {lon})  event: {ev or 'chronic'}")
    for p,colls in PRODUCTS.items():
        per = acq(colls, lon, lat); rows=[]
        for trk, s in sorted(per.items(), key=lambda kv:-len(kv[1])):
            ds = sorted(set(d for d,_ in s)); mats = "".join(sorted(set(m for _,m in s)))
            r = {"track":trk,"n":len(ds),"first":ds[0],"last":ds[-1],"maturity":mats}
            if ev:
                e = dt.date.fromisoformat(ev)
                bef = [d for d in ds if dt.date.fromisoformat(d) < e]; aft = [d for d in ds if dt.date.fromisoformat(d) >= e]
                r["before"] = bef[-1] if bef else None; r["after"] = aft[0] if aft else None
                r["gap_before_days"] = (e-dt.date.fromisoformat(bef[-1])).days if bef else None
                r["gap_after_days"] = (dt.date.fromisoformat(aft[0])-e).days if aft else None
            rows.append(r)
        rec["products"][p] = rows
        for r in rows[:3]:
            extra = f" | before {r['before']} (-{r['gap_before_days']}d)  after {r['after']} (+{r['gap_after_days']}d)" if ev else ""
            print(f"  {p} track {r['track']} [{r['maturity']}] {r['n']:2d} dates {r['first']}..{r['last']}{extra}")
    out.append(rec)
json.dump(out, open("event_coverage.json","w"), indent=1)
