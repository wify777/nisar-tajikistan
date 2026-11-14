/* NISAR Tajikistan: static explorer. Data are pre-processed into site/data/<story>/ by scripts/make_story.py. */
(function () {
  "use strict";
  var UI = {
    en: { brand: "NISAR Tajikistan", brandSub: "Radar views of a moving landscape",
      introTitle: "Seeing the ground move through clouds and darkness",
      introText: "NISAR, the NASA-ISRO radar satellite, images Tajikistan about every 12 days, day or night, in any weather. We compare its images over time to show where the surface changed and explain what the change most likely means.",
      layer: "Radar layer", date: "Date", pair: "Image pair", opacity: "Opacity", showZone: "Show detected change zone",
      readTitle: "How to read a radar image", limTitle: "What this data can and cannot tell", credTitle: "Data, tools and AI use",
      r1t: "Dark = smooth or water", r1: "Calm water and smooth ground reflect the radar pulse away from the satellite, like a mirror, so they look dark.",
      r2t: "Bright = rough or wet", r2: "Rocks, debris, buildings and wet soil send more energy back, so they look bright. A jump in brightness can mean new debris or wetter ground.",
      r3t: "HH and HV", r3: "HH is mostly the ground surface. HV appears when the signal bounces many times inside vegetation or rough material. Comparing them helps separate surface from volume changes.",
      r4t: "Coherence", r4: "Coherence (0 to 1) shows how similar the ground stayed between two passes. If soil and stones are moved or washed away, coherence drops toward 0.",
      footer: "Open source (MIT). Built for NASA Space Apps Challenge 2026, Dushanbe, challenge \"Dancing with the SARs\".",
      L: { hh: "HH brightness", hv: "HV brightness", dhh: "HH change since first image", coh: "Coherence between two passes", cohchange: "Coherence loss across the event" },
      soon: "coming soon", zone: "change zone", ref: "reference area", event: "event",
      chartHH: "Median HH brightness (dB): change zone vs reference area", chartCoh: "Median coherence per image pair: change zone vs reference area",
      legendDb: "dB", legendLow: "low", legendHigh: "high", sources: "Sources" },
    ru: { brand: "NISAR Таджикистан", brandSub: "Радарный взгляд на подвижную землю",
      introTitle: "Видеть, как меняется земля, сквозь облака и темноту",
      introText: "Радарный спутник NISAR (NASA и ISRO) снимает Таджикистан примерно раз в 12 дней, днём и ночью, в любую погоду. Мы сравниваем снимки во времени, показываем, где изменилась поверхность, и объясняем, что это скорее всего значит.",
      layer: "Радарный слой", date: "Дата", pair: "Пара снимков", opacity: "Прозрачность", showZone: "Показать найденную зону изменений",
      readTitle: "Как читать радарный снимок", limTitle: "Что эти данные могут и не могут сказать", credTitle: "Данные, инструменты и ИИ",
      r1t: "Тёмное = гладкое или вода", r1: "Спокойная вода и гладкая земля отражают импульс радара в сторону, как зеркало, поэтому выглядят тёмными.",
      r2t: "Светлое = шероховатое или влажное", r2: "Камни, наносы, здания и влажная почва возвращают больше энергии и выглядят светлыми. Скачок яркости может означать свежие наносы или намокание.",
      r3t: "HH и HV", r3: "HH показывает в основном поверхность земли. HV возникает, когда сигнал многократно отражается в растительности или шероховатом материале. Сравнение помогает отличить изменения поверхности от изменений объёма.",
      r4t: "Когерентность", r4: "Когерентность (от 0 до 1) показывает, насколько земля осталась той же между двумя пролётами. Если грунт и камни сдвинуло или смыло, когерентность падает к 0.",
      footer: "Открытый код (MIT). Сделано для NASA Space Apps Challenge 2026, Душанбе, задача «Dancing with the SARs».",
      L: { hh: "Яркость HH", hv: "Яркость HV", dhh: "Изменение HH с первого снимка", coh: "Когерентность между двумя пролётами", cohchange: "Потеря когерентности через событие" },
      soon: "скоро", zone: "зона изменений", ref: "контрольная зона", event: "событие",
      chartHH: "Медиана яркости HH (дБ): зона изменений и контрольная зона", chartCoh: "Медиана когерентности по парам снимков: зона и контроль",
      legendDb: "дБ", legendLow: "низкая", legendHigh: "высокая", sources: "Источники" }
  };
  var LAYERS = {
    hh: { time: "dates", file: function (k) { return "hh_" + k; }, legend: ["linear-gradient(90deg,#000,#fff)", "-25", "0", "dB"] },
    hv: { time: "dates", file: function (k) { return "hv_" + k; }, legend: ["linear-gradient(90deg,#000,#fff)", "-32", "-8", "dB"] },
    dhh: { time: "dates", file: function (k) { return "dhh_" + k; }, legend: ["linear-gradient(90deg,#053061,#f7f7f7,#67001f)", "-6", "+6", "dB"] },
    coh: { time: "pairs", file: function (k) { return "coh_" + k; }, legend: ["linear-gradient(90deg,#000004,#b73779,#fcfdbf)", "0", "1", ""] },
    cohchange: { time: null, file: function (k, s) { return "cohchange_" + s.eventPair; }, legend: ["linear-gradient(90deg,#67001f,#f7f7f7,#053061)", "-0.6", "+0.6", ""] },
    water: { time: "dates", file: function (k) { return "water_" + k; }, legend: ["linear-gradient(90deg,rgba(40,140,255,0.2),rgb(40,140,255))", "", "", ""] }
  };
  UI.en.L.water = "Water detected by radar"; UI.ru.L.water = "Вода по данным радара";
  UI.en.chartWater = "Water area detected by radar (km²)"; UI.ru.chartWater = "Площадь воды по радару (км²)";
  UI.en.water = "water area"; UI.ru.water = "площадь воды";
  var state = { lang: "en", data: null, story: null, meta: null, series: null, layer: "cohchange", idx: 0, opacity: 0.85, zone: true };
  var map, chart;
  var $ = function (id) { return document.getElementById(id); };
  function t(k) { return UI[state.lang][k]; }
  function fmtDate(d) { return d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8); }
  function fmtPair(p) { var a = p.split("_"); return fmtDate(a[0]) + " → " + fmtDate(a[1]); }

  function applyStatic() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) { var v = UI[state.lang][el.getAttribute("data-i18n")]; if (typeof v === "string") el.textContent = v; });
    $("lang-en").classList.toggle("on", state.lang === "en"); $("lang-ru").classList.toggle("on", state.lang === "ru");
    var lim = $("limits-list"); lim.innerHTML = "";
    state.data.limits[state.lang].forEach(function (s) { var li = document.createElement("li"); li.textContent = s; lim.appendChild(li); });
    var cr = $("credits-list"); cr.innerHTML = "";
    state.data.credits[state.lang].forEach(function (c) {
      var li = document.createElement("li");
      if (c[1]) { var a = document.createElement("a"); a.href = c[1]; a.target = "_blank"; a.rel = "noopener"; a.textContent = c[0]; li.appendChild(a); } else li.textContent = c[0];
      cr.appendChild(li);
    });
  }

  function renderTabs() {
    var box = $("story-tabs"); box.innerHTML = "";
    state.data.stories.forEach(function (s) {
      var b = document.createElement("button"); b.type = "button"; b.role = "tab";
      b.textContent = s.title[state.lang] + (s.ready ? "" : " · " + t("soon"));
      b.disabled = !s.ready; b.classList.toggle("on", state.story && s.id === state.story.id);
      b.addEventListener("click", function () { if (s.ready) loadStory(s); });
      box.appendChild(b);
    });
  }

  function renderStoryText() {
    var s = state.story;
    $("story-title").textContent = s.title[state.lang];
    $("story-meta").textContent = s.meta[state.lang];
    var f = $("findings"); f.innerHTML = "";
    s.findings[state.lang].forEach(function (b) {
      var h = document.createElement("h3"); h.textContent = b.h; f.appendChild(h);
      var p = document.createElement("p"); p.textContent = b.p; if (b.conf) p.className = "conf"; f.appendChild(p);
      if (b.src) {
        var ps = document.createElement("p"); ps.textContent = t("sources") + ": ";
        b.src.forEach(function (x, i) { var a = document.createElement("a"); a.href = x[1]; a.target = "_blank"; a.rel = "noopener"; a.textContent = x[0]; ps.appendChild(a); if (i < b.src.length - 1) ps.appendChild(document.createTextNode(" · ")); });
        f.appendChild(ps);
      }
    });
    var sel = $("layer-select"), cur = state.layer; sel.innerHTML = "";
    storyLayers().forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = UI[state.lang].L[k]; sel.appendChild(o); });
    sel.value = cur;
    $("zone-toggle").parentElement.hidden = !(state.meta && state.meta.zone_pixels > 0);
  }

  function storyLayers() { return state.story.layers || Object.keys(LAYERS).filter(function (k) { return k !== "water"; }); }
  function timeKeys() { var L = LAYERS[state.layer]; return L.time ? state.series[L.time] : []; }
  function defaultIdx() {
    var keys = timeKeys(), s = state.story;
    if (!s.eventPair) return Math.max(0, keys.length - 1);
    if (LAYERS[state.layer].time === "pairs") { var i = keys.indexOf(s.eventPair); return i < 0 ? 0 : i; }
    if (LAYERS[state.layer].time === "dates") { var after = s.eventPair.split("_")[1], j = keys.indexOf(after); return j < 0 ? 0 : j; }
    return 0;
  }

  function imgUrl() { var L = LAYERS[state.layer], keys = timeKeys(); return "data/" + state.story.id + "/layers/" + L.file(keys[state.idx], state.story) + ".png"; }

  var mapReady = false, pendingMap = false;
  function updateRaster() {
    updatePanel();
    if (!mapReady) { pendingMap = true; return; }
    updateMapLayers();
  }
  function updateMapLayers() {
    var src = map.getSource("radar"), url = imgUrl(), c = state.meta.corners;
    if (src) src.updateImage({ url: url, coordinates: c });
    else {
      map.addSource("radar", { type: "image", url: url, coordinates: c });
      map.addLayer({ id: "radar", type: "raster", source: "radar", paint: { "raster-opacity": state.opacity, "raster-fade-duration": 0 } });
      if (state.meta.zone_pixels > 0) {
        map.addSource("zone", { type: "image", url: "data/" + state.story.id + "/layers/zone.png", coordinates: c });
        map.addLayer({ id: "zone", type: "raster", source: "zone", paint: { "raster-opacity": 0.9, "raster-fade-duration": 0 } });
      }
    }
    map.setPaintProperty("radar", "raster-opacity", state.opacity);
    if (map.getLayer("zone")) map.setLayoutProperty("zone", "visibility", state.zone ? "visible" : "none");
  }
  function updatePanel() {
    var L = LAYERS[state.layer], keys = timeKeys(), sl = $("time-slider");
    sl.disabled = !L.time; sl.max = Math.max(0, keys.length - 1); sl.value = state.idx;
    $("time-label").textContent = L.time === "pairs" ? t("pair") : t("date");
    var label = !L.time ? fmtPair(state.story.eventPair) : (L.time === "pairs" ? fmtPair(keys[state.idx]) : fmtDate(keys[state.idx]));
    var isEvent = !!state.story.eventPair && (L.time === "pairs" ? keys[state.idx] === state.story.eventPair : !L.time);
    $("time-value").textContent = label + (isEvent ? "  · " + t("event") : "");
    var lg = L.legend;
    $("legend").innerHTML = "<strong>" + UI[state.lang].L[state.layer] + "</strong><div class=\"bar\" style=\"background:" + lg[0] + "\"></div><div class=\"ends\"><span>" + lg[1] + " " + (lg[3] ? t("legendDb") : "") + "</span><span>" + lg[2] + " " + (lg[3] ? t("legendDb") : "") + "</span></div>";
    updateChart();
  }

  function updateChart() {
    var L = LAYERS[state.layer], s = state.series, ev = state.story.eventPair;
    var css = getComputedStyle(document.documentElement), ink = css.getPropertyValue("--muted").trim(), line = css.getPropertyValue("--line").trim(), acc = css.getPropertyValue("--warn").trim();
    var waterMode = !!state.water && (state.layer === "water" || state.layer === "hh" || state.layer === "hv" || state.layer === "dhh");
    var pairsMode = !waterMode && L.time !== "dates";
    var labels, datasets, sel;
    if (waterMode) {
      labels = state.water.dates.map(fmtDate); sel = state.idx;
      datasets = [{ label: t("water"), data: state.water.water_km2, borderColor: "#2a8cff", backgroundColor: "#2a8cff", tension: 0.2, pointRadius: labels.map(function (_, i) { return i === sel ? 6 : 3; }) }];
    } else {
      labels = pairsMode ? s.pairs.map(fmtPair) : s.dates.map(fmtDate);
      var zone = pairsMode ? s.coh_zone : s.hh_zone, ref = pairsMode ? s.coh_ref : s.hh_ref;
      var evIdx = !ev ? -1 : (pairsMode ? s.pairs.indexOf(ev) : s.dates.indexOf(ev.split("_")[1]));
      sel = L.time ? state.idx : evIdx;
      var lb = (state.story.labels && state.story.labels[state.lang]) || { zone: t("zone"), ref: t("ref") };
      datasets = [{ label: lb.zone, data: zone, borderColor: acc, backgroundColor: acc, tension: 0.2, pointRadius: labels.map(function (_, i) { return i === sel ? 6 : 3; }) },
        { label: lb.ref, data: ref, borderColor: ink, backgroundColor: ink, borderDash: [4, 3], tension: 0.2, pointRadius: 2 }];
    }
    var cfg = {
      type: "line",
      data: { labels: labels, datasets: datasets },
      options: { responsive: true, animation: false, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: ink, boxWidth: 12 } } },
        scales: { x: { ticks: { color: ink, maxRotation: 60, minRotation: 40, font: { size: 9 } }, grid: { color: line } },
                  y: { ticks: { color: ink }, grid: { color: line }, suggestedMin: pairsMode ? 0 : undefined, suggestedMax: pairsMode ? 1 : undefined } } }
    };
    if (chart) chart.destroy();
    if (window.Chart) chart = new Chart($("chart"), cfg);
    $("chart-note").textContent = waterMode ? t("chartWater") : (pairsMode ? t("chartCoh") : t("chartHH"));
  }

  var chart2;
  function drawPairTest() {
    var pt = state.pairTest, box = $("chart2-box"), note = $("chart2-note");
    if (chart2) { chart2.destroy(); chart2 = null; }
    box.hidden = note.hidden = !pt;
    if (!pt || !window.Chart) return;
    var css = getComputedStyle(document.documentElement), ink = css.getPropertyValue("--muted").trim(), line = css.getPropertyValue("--line").trim(), acc = css.getPropertyValue("--warn").trim();
    chart2 = new Chart($("chart2"), { type: "bar",
      data: { labels: pt.pairs.map(fmtPair), datasets: [{ data: pt.near_ha, backgroundColor: pt.pairs.map(function (p) { return p === state.story.eventPair ? acc : ink; }) }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: ink, maxRotation: 60, minRotation: 40, font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: ink }, grid: { color: line }, title: { display: true, text: "ha", color: ink } } } } });
    note.textContent = state.lang === "ru"
      ? "Проверка без подгонки: площадь сильной потери когерентности (на 0.3 ниже медианы всех остальных пар) в радиусе " + pt.radius_km + " км от сёл, по каждой паре снимков. Цветом выделена пара через событие."
      : "Unbiased check: area of strong coherence loss (0.3 below the median of all other pairs) within " + pt.radius_km + " km of the villages, for every image pair. The pair across the event is highlighted.";
  }
  function loadStory(s) {
    state.story = s;
    var j = function (f) { return fetch("data/" + s.id + "/" + f).then(function (r) { return r.json(); }); };
    Promise.all([j("meta.json"), j("series.json"), s.water ? j("water.json") : Promise.resolve(null), s.pairTest ? j("pair_test.json") : Promise.resolve(null)])
      .then(function (res) {
        state.meta = res[0]; state.series = res[1]; state.water = res[2]; state.pairTest = res[3];
        drawPairTest();
        state.layer = s.defaultLayer || storyLayers()[0];
        state.idx = defaultIdx();
        renderTabs(); renderStoryText();
        if (mapReady) {
          map.flyTo({ center: s.center, zoom: s.zoom, duration: 800 });
          if (map.getLayer("zone")) { map.removeLayer("zone"); map.removeSource("zone"); }
          if (map.getLayer("radar")) { map.removeLayer("radar"); map.removeSource("radar"); }
        }
        updateRaster();
      });
  }

  function initMap() {
    map = new maplibregl.Map({
      container: "map",
      style: { version: 8, sources: { s2: { type: "raster", tileSize: 256, maxzoom: 15,
        tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg"],
        attribution: "Sentinel-2 cloudless 2023 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2023)" } },
        layers: [{ id: "s2", type: "raster", source: "s2" }] },
      center: [70.8, 38.6], zoom: 6.3, attributionControl: { compact: true }
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    var onReady = function () {
      if (mapReady) return;
      mapReady = true;
      if (state.story) {
        map.jumpTo({ center: state.story.center, zoom: state.story.zoom });
        if (pendingMap) { pendingMap = false; updateMapLayers(); }
      }
      state.data.stories.forEach(function (s) {
        var el = document.createElement("button"); el.type = "button"; el.className = "pin"; el.title = s.title[state.lang];
        el.style.cssText = "width:16px;height:16px;border-radius:50%;border:2px solid #fff;cursor:pointer;background:" + (s.ready ? "#e4572e" : "#8a9a94");
        el.addEventListener("click", function () { if (s.ready) loadStory(s); });
        new maplibregl.Marker({ element: el }).setLngLat(s.center).addTo(map);
      });
    };
    map.on("style.load", onReady);
    map.on("load", onReady);
    if (map.isStyleLoaded()) onReady();
  }

  function bind() {
    $("lang-en").addEventListener("click", function () { state.lang = "en"; applyStatic(); renderTabs(); if (state.story) { renderStoryText(); updateRaster(); drawPairTest(); } });
    $("lang-ru").addEventListener("click", function () { state.lang = "ru"; applyStatic(); renderTabs(); if (state.story) { renderStoryText(); updateRaster(); drawPairTest(); } });
    $("layer-select").addEventListener("change", function (e) { state.layer = e.target.value; state.idx = defaultIdx(); updateRaster(); });
    $("time-slider").addEventListener("input", function (e) { state.idx = +e.target.value; updateRaster(); });
    $("opacity-slider").addEventListener("input", function (e) { state.opacity = e.target.value / 100; if (map.getLayer("radar")) map.setPaintProperty("radar", "raster-opacity", state.opacity); });
    $("zone-toggle").addEventListener("change", function (e) { state.zone = e.target.checked; if (map.getLayer("zone")) map.setLayoutProperty("zone", "visibility", state.zone ? "visible" : "none"); });
  }

  fetch("data/stories.json").then(function (r) { return r.json(); }).then(function (d) {
    state.data = d; applyStatic(); renderTabs(); bind(); initMap();
    var first = d.stories.filter(function (s) { return s.ready; })[0];
    if (first) loadStory(first);
  });
})();
