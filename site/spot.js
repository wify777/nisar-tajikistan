/* "Test any spot": run the alarm rule in a 2.5 km circle around a clicked point, in the browser,
   from data/<story>/flags.png (bit i of red = flagged in pair i, alpha 0 = no data) and flags.json. */
(function () {
  "use strict";
  var T = {
    en: { outside: "This spot is outside the radar window of this story. Tap closer to the place.",
          edge: "Too close to the edge of the radar window: less than 90% of the 2.5 km circle has data.",
          head: "Test at this spot", yes: "Yellow alarm in", no: "No alarm in any 12-day pair.",
          pair: "pair", ha: "ha", x: "× area average", long: "24-day pair, not used",
          mon: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          rule: "Rule: at least 50 ha flagged in the circle and twice the average of the same pair over the whole window, 12-day pairs only." },
    ru: { outside: "Эта точка вне радарного окна этой истории. Нажмите ближе к месту.",
          edge: "Слишком близко к краю радарного окна: данные есть меньше чем для 90% круга 2,5 км.",
          head: "Тест в этой точке", yes: "Жёлтый сигнал в", no: "Сигнала нет ни в одной паре через 12 дней.",
          pair: "пара", ha: "га", x: "× от среднего", long: "пара через 24 дня, не используется",
          mon: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
          rule: "Правило: в круге не меньше 50 га с флагом и вдвое больше среднего для той же пары по всему окну, только пары через 12 дней." }
  };
  var cache = {}, out = document.getElementById("spot-out");
  if (!out) return;
  function load(id) {
    if (cache[id]) return cache[id];
    cache[id] = Promise.all([
      fetch("data/" + id + "/flags.json?v=1", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }),
      new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = "data/" + id + "/flags.png?v=1"; })
    ]).then(function (a) {
      var m = a[0], im = a[1], c = document.createElement("canvas"); c.width = m.w; c.height = m.h;
      var ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(im, 0, 0);
      m.px = ctx.getImageData(0, 0, m.w, m.h).data; return m;
    });
    return cache[id];
  }
  // lon/lat <-> grid (col,row) with an affine fit through the NW, NE and SW corners (windows are <= 26 km)
  function toGrid(m, lon, lat) {
    var ax = m.ne[0] - m.nw[0], ay = m.ne[1] - m.nw[1], bx = m.sw[0] - m.nw[0], by = m.sw[1] - m.nw[1];
    var px = lon - m.nw[0], py = lat - m.nw[1], det = ax * by - ay * bx;
    return [(px * by - py * bx) / det * m.w, (ax * py - ay * px) / det * m.h];
  }
  function toLonLat(m, c, r) {
    var u = c / m.w, v = r / m.h;
    return [m.nw[0] + u * (m.ne[0] - m.nw[0]) + v * (m.sw[0] - m.nw[0]), m.nw[1] + u * (m.ne[1] - m.nw[1]) + v * (m.sw[1] - m.nw[1])];
  }
  function day(s, L) { var p = s.split("-"); return (+p[2]) + " " + L.mon[+p[1] - 1]; }
  function show(m, lon, lat) {
    var L = T[window.NISAR.lang === "ru" ? "ru" : "en"], g = toGrid(m, lon, lat), map = window.NISAR.map;
    out.innerHTML = "";
    if (g[0] < 0 || g[1] < 0 || g[0] >= m.w || g[1] >= m.h) { out.textContent = L.outside; drawCircle(null); return; }
    var rad = m.radius_m / m.pixel_m, n = m.pairs.length, cnt = new Array(n).fill(0), tot = 0, val = 0;
    for (var r = Math.floor(g[1] - rad); r <= g[1] + rad; r++) for (var c = Math.floor(g[0] - rad); c <= g[0] + rad; c++) {
      if ((c - g[0]) * (c - g[0]) + (r - g[1]) * (r - g[1]) > rad * rad) continue;
      tot++;
      if (r < 0 || c < 0 || r >= m.h || c >= m.w) continue;
      var i = (r * m.w + c) * 4; if (m.px[i + 3] < 128) continue;
      val++; var b = m.px[i];
      for (var k = 0; k < n; k++) if (b & (1 << k)) cnt[k]++;
    }
    var ring = []; for (var a = 0; a <= 64; a++) { var t = a / 64 * 2 * Math.PI; ring.push(toLonLat(m, g[0] + rad * Math.cos(t), g[1] + rad * Math.sin(t))); }
    drawCircle(ring);
    if (val / tot < 0.9) { out.textContent = L.edge; return; }
    var pxHa = m.pixel_m * m.pixel_m / 1e4, alarms = [];
    var h = document.createElement("p"); h.className = "spot-head"; h.textContent = L.head + " (" + lat.toFixed(4) + " N, " + lon.toFixed(4) + " E)"; out.appendChild(h);
    var row = document.createElement("div"); row.className = "bcells";
    m.pairs.forEach(function (p, k) {
      var ha = cnt[k] * pxHa, ratio = ha / Math.max(m.window_density[k] * val * pxHa, 1);
      var days = Math.round((Date.parse(p[1]) - Date.parse(p[0])) / 864e5);
      var st = days > m.max_days ? "long" : (ha >= m.min_ha && ratio >= m.min_ratio ? "yellow" : "green");
      if (st === "yellow") alarms.push(day(p[0], L) + " → " + day(p[1], L));
      var el = document.createElement("span"); el.className = "bcell b-" + st;
      var txt = day(p[0], L) + " → " + day(p[1], L) + ": " + Math.round(ha) + " " + L.ha + ", " + (window.NISAR.lang === "ru" ? ratio.toFixed(1).replace(".", ",") : ratio.toFixed(1)) + L.x + (st === "long" ? " · " + L.long : "");
      el.title = txt; el.setAttribute("aria-label", txt); el.textContent = Math.round(ha);
      var lab = document.createElement("small"); lab.textContent = day(p[1], L); el.appendChild(lab); row.appendChild(el);
    });
    out.appendChild(row);
    var v = document.createElement("p"); v.className = "spot-verdict" + (alarms.length ? " on" : "");
    v.textContent = alarms.length ? L.yes + ": " + alarms.join(", ") : L.no; out.appendChild(v);
    var ru = document.createElement("p"); ru.className = "spot-rule"; ru.textContent = L.rule; out.appendChild(ru);
  }
  function drawCircle(ring) {
    var map = window.NISAR.map; if (!map || !map.getStyle()) return;
    var data = { type: "FeatureCollection", features: ring ? [{ type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: {} }] : [] };
    if (map.getSource("spot")) map.getSource("spot").setData(data);
    else {
      map.addSource("spot", { type: "geojson", data: data });
      map.addLayer({ id: "spot-line", type: "line", source: "spot", paint: { "line-color": "#ffffff", "line-width": 2.5, "line-dasharray": [2, 1.5] } });
    }
  }
  var last = null;
  function attach() {
    var N = window.NISAR;
    if (!N || !N.map || !N.ready) { setTimeout(attach, 400); return; }
    N.map.on("click", function (e) {
      var s = N.story; if (!s) return;
      last = [s.id, e.lngLat.lng, e.lngLat.lat];
      load(s.id).then(function (m) { show(m, e.lngLat.lng, e.lngLat.lat); }, function () { out.textContent = ""; });
    });
    // reset when the story changes; re-render on language change
    var title = document.getElementById("story-title");
    new MutationObserver(function () {
      var s = N.story;
      if (last && s && s.id !== last[0]) { last = null; out.innerHTML = ""; drawCircle(null); }
      else if (last && s) load(s.id).then(function (m) { show(m, last[1], last[2]); });
    }).observe(title, { childList: true, characterData: true, subtree: true });
  }
  attach();
})();
