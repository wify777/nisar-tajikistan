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
    dhh: { time: "dates", file: function (k) { return "dhh_" + k; }, legend: ["linear-gradient(90deg,#053061,rgba(247,247,247,.15),#67001f)", "-6", "+6", "dB"] },
    coh: { time: "pairs", file: function (k) { return "coh_" + k; }, legend: ["linear-gradient(90deg,#000004,#b73779,#fcfdbf)", "0", "1", ""] },
    cohchange: { time: null, file: function (k, s) { return "cohchange_" + s.eventPair; }, legend: ["linear-gradient(90deg,#67001f,rgba(247,247,247,.15),#053061)", "-0.6", "+0.6", ""] },
    water: { time: "dates", file: function (k) { return "water_" + k; }, legend: ["linear-gradient(90deg,rgba(40,140,255,0.2),rgb(40,140,255))", "", "", ""] }
  };
  Object.assign(UI.en, {
    navStories: "Stories", navExplore: "Explore", navMethod: "Method", navData: "Data",
    kicker: "NASA Space Apps 2026 · Dancing with the SARs · Dushanbe",
    f1: "days between passes", f2: "L-band wavelength, sees through cloud", f3: "pixels, every number reproducible",
    ctaStories: "See the four stories", ctaMethod: "How we checked",
    heroCap: "Ayni, radar pair 9 → 21 July 2026 compared with the pair before. Red: the ground stopped matching between passes (coherence loss). Blue: it matched better than before. Yellow: the change zone on the slopes above Dargh and Kazdon, where a mudflow hit on 11 July.",
    storiesTitle: "Four places, four honest answers",
    storiesText: "Each story says what happened, what the radar shows, how we tested it and how sure we are, including the event the radar missed.",
    methodTitle: "How we turn radar into answers", methodText: "No black box: four steps, all in our open code.",
    m1t: "Read only what we need", m1: "NISAR files are 1.4 to 7 GB. We read small windows around each place straight from NASA's archive, every date on the same orbit.",
    m2t: "Compare every pair of dates", m2: "Brightness shows roughness and water; coherence shows whether the ground stayed the same between two passes 12 days apart.",
    m3t: "Test against all other dates", m3: "A change only counts if it stands out against the median of all other pairs, so we do not fool ourselves with one lucky image.",
    m4t: "Check with reality", m4: "We compare with news and Red Cross reports and with optical Sentinel-2 images, and we say how sure we are.",
    repo: "Open code and method on GitHub →", showZone: "Change zone", explore: "Open on the map"
  });
  Object.assign(UI.ru, {
    navStories: "Истории", navExplore: "Карта", navMethod: "Метод", navData: "Данные",
    kicker: "NASA Space Apps 2026 · Dancing with the SARs · Душанбе",
    f1: "дней между пролётами", f2: "длина волны L-диапазона, видит сквозь облака", f3: "пиксели, каждое число можно проверить",
    ctaStories: "Четыре истории", ctaMethod: "Как мы проверяли",
    heroCap: "Айни, пара снимков 9 → 21 июля 2026 в сравнении с парой до неё. Красное: земля перестала совпадать между пролётами (потеря когерентности). Синее: совпадает лучше, чем раньше. Жёлтое: зона изменений на склонах над Даргом и Каздоном, куда 11 июля сошёл сель.",
    storiesTitle: "Четыре места, четыре честных ответа",
    storiesText: "В каждой истории: что произошло, что показывает радар, как мы это проверили и насколько уверены. Включая событие, которое радар не увидел.",
    methodTitle: "Как мы превращаем радар в ответы", methodText: "Без чёрного ящика: четыре шага, всё в открытом коде.",
    m1t: "Читаем только нужное", m1: "Файлы NISAR весят от 1.4 до 7 ГБ. Мы читаем небольшие окна вокруг каждого места прямо из архива NASA, все даты на одной орбите.",
    m2t: "Сравниваем каждую пару дат", m2: "Яркость показывает шероховатость и воду; когерентность показывает, осталась ли земля той же между двумя пролётами с разницей 12 дней.",
    m3t: "Проверяем против всех остальных дат", m3: "Изменение засчитывается, только если оно выделяется на фоне медианы всех остальных пар. Так мы не обманываем себя одним удачным снимком.",
    m4t: "Сверяем с реальностью", m4: "Сравниваем с новостями и отчётами Красного Креста и с оптическими снимками Sentinel-2 и говорим, насколько уверены.",
    repo: "Открытый код и метод на GitHub →", showZone: "Зона изменений", explore: "Открыть на карте"
  });
  UI.en.L.water = "Water detected by radar"; UI.ru.L.water = "Вода по данным радара";
  UI.en.chartWater = "Water area detected by radar (km²)"; UI.ru.chartWater = "Площадь воды по радару (км²)";
  UI.en.water = "water area"; UI.ru.water = "площадь воды";
  var state = { lang: "en", data: null, story: null, meta: null, series: null, layer: "cohchange", idx: 0, opacity: 0.85, zone: true };
  var map, chart, ASSET_V = "5";
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

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function renderCards() {
    var box = $("story-cards"); box.innerHTML = "";
    state.data.stories.forEach(function (s) {
      var b = el("button", "scard tone-" + (s.tone || "stable")); b.type = "button";
      b.classList.toggle("on", !!state.story && state.story.id === s.id);
      var img = el("img"); img.src = "img/" + s.id + ".jpg"; img.alt = ""; img.loading = "lazy"; img.width = 600; img.height = 450; b.appendChild(img);
      var body = el("div", "scard-body");
      body.appendChild(el("span", "verdict", s.verdict ? s.verdict[state.lang] : ""));
      body.appendChild(el("h3", null, s.title[state.lang]));
      body.appendChild(el("span", "scard-kind", s.kind ? s.kind[state.lang] : ""));
      body.appendChild(el("span", "scard-stat", s.stat || ""));
      body.appendChild(el("span", "scard-label", s.statLabel ? s.statLabel[state.lang] : ""));
      b.appendChild(body);
      b.setAttribute("aria-label", s.title[state.lang] + ". " + t("explore"));
      b.addEventListener("click", function () { if (s.ready) { loadStory(s); $("explore").scrollIntoView({ behavior: "smooth" }); } });
      box.appendChild(b);
    });
  }

  function renderStoryText() {
    var s = state.story;
    $("story-title").textContent = s.title[state.lang];
    $("story-meta").textContent = s.meta[state.lang];
    $("story-kind").textContent = s.kind ? s.kind[state.lang] : "";
    var d = document.querySelector(".detail"); d.className = "detail tone-" + (s.tone || "stable");
    $("detail-verdict").textContent = s.verdict ? s.verdict[state.lang] : "";
    $("detail-stat").textContent = s.stat || "";
    $("detail-stat-label").textContent = s.statLabel ? s.statLabel[state.lang] : "";
    var f = $("findings"); f.innerHTML = "";
    s.findings[state.lang].forEach(function (b) {
      var box = el("div", "finding" + (b.conf ? " conf" : "") + (b.check ? " check" : ""));
      box.appendChild(el("h3", null, b.h)); box.appendChild(el("p", null, b.p));
      if (b.src) {
        var ps = el("p", "src", t("sources") + ": ");
        b.src.forEach(function (x, i) { var a = el("a", null, x[0]); a.href = x[1]; a.target = "_blank"; a.rel = "noopener"; ps.appendChild(a); if (i < b.src.length - 1) ps.appendChild(document.createTextNode(" · ")); });
        box.appendChild(ps);
      }
      f.appendChild(box);
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

  function imgUrl() { var L = LAYERS[state.layer], keys = timeKeys(); return "data/" + state.story.id + "/layers/" + L.file(keys[state.idx], state.story) + ".png?v=" + ASSET_V; }

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
        map.addSource("zone", { type: "image", url: "data/" + state.story.id + "/layers/zone.png?v=" + ASSET_V, coordinates: c });
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
    var css = getComputedStyle(document.documentElement), ink = css.getPropertyValue("--muted").trim(), line = css.getPropertyValue("--line").trim(), acc = css.getPropertyValue("--warm").trim();
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
    var css = getComputedStyle(document.documentElement), ink = css.getPropertyValue("--muted").trim(), line = css.getPropertyValue("--line").trim(), acc = css.getPropertyValue("--warm").trim();
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
    var j = function (f) { return fetch("data/" + s.id + "/" + f, { cache: "no-cache" }).then(function (r) { return r.json(); }); };
    Promise.all([j("meta.json"), j("series.json"), s.water ? j("water.json") : Promise.resolve(null), s.pairTest ? j("pair_test.json") : Promise.resolve(null)])
      .then(function (res) {
        state.meta = res[0]; state.series = res[1]; state.water = res[2]; state.pairTest = res[3];
        drawPairTest();
        state.layer = s.defaultLayer || storyLayers()[0];
        state.idx = defaultIdx();
        renderTabs(); renderCards(); renderStoryText();
        if (mapReady) {
          placePlaces();
          map.flyTo({ center: s.center, zoom: s.zoom, duration: 800 });
          if (map.getLayer("zone")) { map.removeLayer("zone"); map.removeSource("zone"); }
          if (map.getLayer("radar")) { map.removeLayer("radar"); map.removeSource("radar"); }
        }
        updateRaster();
      });
  }

  var placeMarkers = [];
  function placePlaces() {
    placeMarkers.forEach(function (m) { m.remove(); }); placeMarkers = [];
    (state.story.places || []).forEach(function (p) {
      var e = el("div", "place", p[0]);
      placeMarkers.push(new maplibregl.Marker({ element: e, anchor: "left", offset: [-4, 0] }).setLngLat([p[1], p[2]]).addTo(map));
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
        placePlaces();
        if (pendingMap) { pendingMap = false; updateMapLayers(); }
      }
      state.data.stories.forEach(function (s) {
        var p = el("button", "pin"); p.type = "button"; p.title = s.title[state.lang]; p.setAttribute("aria-label", s.title[state.lang]);
        p.style.background = "var(--t-" + (s.tone || "stable") + ")";
        p.addEventListener("click", function () { if (s.ready) loadStory(s); });
        new maplibregl.Marker({ element: p }).setLngLat(s.center).addTo(map);
      });
    };
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
    map.on("style.load", onReady);
    map.on("load", onReady);
    if (map.isStyleLoaded()) onReady();
  }

  function bind() {
    $("lang-en").addEventListener("click", function () { state.lang = "en"; applyStatic(); renderTabs(); renderCards(); if (state.story) { renderStoryText(); updateRaster(); drawPairTest(); } });
    $("lang-ru").addEventListener("click", function () { state.lang = "ru"; applyStatic(); renderTabs(); renderCards(); if (state.story) { renderStoryText(); updateRaster(); drawPairTest(); } });
    $("layer-select").addEventListener("change", function (e) { state.layer = e.target.value; state.idx = defaultIdx(); updateRaster(); });
    $("time-slider").addEventListener("input", function (e) { state.idx = +e.target.value; updateRaster(); });
    $("opacity-slider").addEventListener("input", function (e) { state.opacity = e.target.value / 100; if (map.getLayer("radar")) map.setPaintProperty("radar", "raster-opacity", state.opacity); });
    $("zone-toggle").addEventListener("change", function (e) { state.zone = e.target.checked; if (map.getLayer("zone")) map.setLayoutProperty("zone", "visibility", state.zone ? "visible" : "none"); });
  }

  fetch("data/stories.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
    state.data = d; applyStatic(); renderTabs(); renderCards(); bind(); initMap();
    var first = d.stories.filter(function (s) { return s.ready; })[0];
    if (first) loadStory(first);
  });
})();
