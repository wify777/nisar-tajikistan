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
      introText: "Радарный спутник NISAR (NASA и ISRO) снимает Таджикистан примерно раз в 12 дней, днём и ночью, в любую погоду. Мы сравниваем снимки во времени, показываем, где изменилась поверхность, и объясняем, что это, скорее всего, значит.",
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
    water: { time: "dates", file: function (k) { return "water_" + k; }, legend: ["linear-gradient(90deg,rgba(40,140,255,0.2),rgb(40,140,255))", "", "", ""] },
    s2change: { time: null, file: function () { return "s2change"; }, legend: ["linear-gradient(90deg,#ff28c8,#ff28c8)", "", "", ""],
      corners: function (st) { return st.s2change && st.s2change.corners; },
      label: function (st) { return st.s2change.before + " → " + st.s2change.after + " · Sentinel-2"; } }
  };
  Object.assign(UI.en, {
    navStories: "Stories", navExplore: "Explore", navMethod: "Method", navData: "Data",
    kicker: "NASA Space Apps 2026 · Dancing with the SARs · Dushanbe",
    f1: "days between passes", f2: "L-band wavelength: sees through clouds", f3: "pixels, every number reproducible",
    ctaStories: "See the five stories", ctaMethod: "How we checked",
    heroCap: "Ayni, radar pair 9 → 21 July 2026 compared with the pair before. Red: the ground stopped matching between passes (coherence loss). Blue: it matched better than before. Yellow: the change zone on the slopes above Dargh and Kazdon, where a mudflow hit on 11 July.",
    storiesTitle: "Five places, five honest answers",
    storiesText: "Each story says what happened, what the radar shows, how we tested it and how sure we are, including the event the radar missed.",
    methodTitle: "How we turn radar into answers", methodText: "No black box: four steps, all in our open code.",
    m1t: "Read only what we need", m1: "NISAR files are 1.4 to 7 GB. We read small windows around each place straight from NASA's archive, every date on the same orbit. The same window can be cut out of any NISAR frame, so a new place in any country can be added with the same scripts.",
    m2t: "Compare every pair of dates", m2: "Brightness shows roughness and water; coherence shows whether the ground stayed the same between two passes 12 days apart.",
    m3t: "Test against all other dates", m3: "A change only counts if it stands out against the median of all other pairs, so we do not fool ourselves with one lucky image.",
    m4t: "Check with reality", m4: "We compare with news and Red Cross reports and with optical Sentinel-2 images, and we say how sure we are.",
    polTitle: "Polarizations: HH and HV",
    pol1: "HH is mostly the direct echo from the surface. Rough ground and rock look bright; calm water looks dark.",
    pol2: "At Ayni, HH brightness rose by 1.4 dB after the mudflow of 11 July and stayed higher afterwards.",
    pol3: "HV appears when the signal bounces several times inside vegetation and loose material.",
    pol4: "At Ayni, HV rose only on the first image after the event and was back to its earlier level by 14 August, so we rely on HH and coherence.",
    pol5: "We used HH and HV from the GCOV product, and HH from GUNW.",
    pol6: "VV and full polarization are not in the data over our sites.",
    repo: "Open code and method on GitHub →", showZone: "Change zone", explore: "Open on the map", f2v: "24 cm", f3v: "20 m",
    u1: "Pick a place: a card above, a pin on the map or a tab", u2: "Move the date slider and switch radar layers", u3: "Read the verdict and the checks under the map", u4: "Free, no sign-up, works on a phone",
    navAction: "In practice", actTitle: "From map to action",
    actText: "How a rescue service could use each new NISAR pass. A proposal built on our measurements, not yet agreed with the Committee of Emergency Situations.",
    a1t: "Green: log it", a1: "The 2.5 km circle around a village, road or canal shows no unusual coherence loss. Nothing to do.",
    a2t: "Yellow: check at a desk the same day", a2: "At least 50 ha of strong coherence loss in the circle, twice the average of the same image pair across the area, in a 12-day pair. In our five areas only 9 of 288 tests with no event passed this: about 3 alarms per 100 watched villages per pass.",
    a3t: "Red: send someone", a3: "Yellow plus any independent sign: a clear Landsat or Sentinel-2 view of fresh bare ground, heavy rain, a local report, or radar brightness that stays higher. One radar flag alone is not enough: a flag as large as Ayni's appears in about 1 of 80 tests where no mudflow happened.",
    actNote: "Reservoirs: if the water area jumps by more than 10% between passes, look for a clear Landsat or Sentinel-2 view within four days before reporting it. At Rogun this showed the autumn dips were a radar effect. Limits: the method shows change after it happened and misses narrow flows like Rushan.",
    actLink: "Full workflow with diagram (EN/RU) →",
    boardTitle: "The rule on our own data",
    boardText: "Each square is one pair of radar passes over a 2.5 km circle around the place. The number is the flagged area in hectares, the date is the second pass. Squares with a red outline span a reported mudflow.",
    bl1: "green", bl2: "yellow alarm", bl3: "pair longer than 12 days, not used", bl4: "reported mudflow in this pair",
    spotHint: "Tap anywhere inside the radar window to run our alarm test there.",
    blTitle: "Blind test: a second mudflow we never tuned on",
    blText: "The same storm sent a mudflow into Rashnai Poyon (Panjakent) on 11 July 2026, about 100 km west of Ayni: 5 houses destroyed, 4 damaged. Before looking at any radar data there, we wrote down the rule: the pair spanning 11 July must be the largest of all pairs, at least 50 ha, and twice the area average. Then we ran the unchanged Ayni test on all three orbits that cover the village.",
    btOrbit: "Orbit", btPair: "Pair across 11 July", btHa: "Flagged near the village", btRes: "Result",
    btAsc: "ascending", btAsc2: "ascending", btDesc: "descending", btP1: "9 → 21 Jul", btP2: "4 → 16 Jul", btP3: "4 → 16 Jul",
    btMiss: "not detected", btMiss2: "not detected", btHit: "detected",
    btH1: "3 ha", btH2: "15 ha", btH3: "111 ha",
    bwTitle: "Why only one orbit?",
    bwText: "The slopes that changed face west. The descending orbit looks at them from the west: 64% of its flagged area is on west-facing slopes, against 31% of the land around. The two ascending orbits look from the east and see those slopes from behind. We measured this with the terrain model and the line-of-sight vectors stored in the NISAR files: of the 111 ha that changed, only 23% can be watched from orbit 012A and 31% from 113A (the rest is in radar shadow, seen at a grazing angle, or has too low usual coherence), against about 65% of the land around the village. Lesson for any warning service: always check both orbit directions. Together the three orbits can watch 94% of the circle.",
    bwLink: "Rule written before the test, and the full result →",
    bwNote: "\"Watchable\" under each name: the share of the circle where this orbit could see a mudflow at all. The rest is hidden by terrain (radar shadow, layover, a grazing view) or has usual coherence below 0.5, so a 0.3 drop cannot happen there (coherence rarely falls below 0.2). Measured with the Copernicus terrain model and the line-of-sight vectors in the NISAR files."
  });
  Object.assign(UI.ru, {
    navStories: "Истории", navExplore: "Карта", navMethod: "Метод", navData: "Данные",
    kicker: "NASA Space Apps 2026 · Dancing with the SARs · Душанбе",
    f1: "дней между пролётами", f2: "длина волны L-диапазона: видит сквозь облака", f3: "пиксели, каждое число можно проверить",
    ctaStories: "Пять историй", ctaMethod: "Как мы проверяли",
    heroCap: "Айни, пара снимков 9 → 21 июля 2026 в сравнении с парой до неё. Красное: земля перестала совпадать между пролётами (потеря когерентности). Синее: совпадает лучше, чем раньше. Жёлтое: зона изменений на склонах над Даргом и Каздоном, куда 11 июля сошёл сель.",
    storiesTitle: "Пять мест, пять честных ответов",
    storiesText: "В каждой истории: что произошло, что показывает радар, как мы это проверили и насколько уверены. Включая событие, которое радар не увидел.",
    methodTitle: "Как мы превращаем радар в ответы", methodText: "Без чёрного ящика: четыре шага, всё в открытом коде.",
    m1t: "Читаем только нужное", m1: "Файлы NISAR весят от 1,4 до 7 ГБ. Мы читаем небольшие окна вокруг каждого места прямо из архива NASA, все даты на одной орбите. Такое же окно можно вырезать из любого кадра NISAR, поэтому новое место в любой стране добавляется теми же скриптами.",
    m2t: "Сравниваем каждую пару дат", m2: "Яркость показывает шероховатость и воду; когерентность показывает, осталась ли земля той же между двумя пролётами с разницей 12 дней.",
    m3t: "Проверяем против всех остальных дат", m3: "Изменение засчитывается, только если оно выделяется на фоне медианы всех остальных пар. Так мы не обманываем себя одним удачным снимком.",
    m4t: "Сверяем с реальностью", m4: "Сравниваем с новостями и отчётами Красного Креста и с оптическими снимками Sentinel-2 и говорим, насколько уверены.",
    polTitle: "Поляризация: HH и HV",
    pol1: "HH — в основном прямое отражение от поверхности. Шероховатая земля и скалы выглядят яркими, спокойная вода — тёмной.",
    pol2: "В Айни яркость HH выросла на 1,4 дБ после селя 11 июля и после этого осталась выше.",
    pol3: "HV возникает при многократном отражении сигнала в растительности и рыхлом материале.",
    pol4: "В Айни HV вырос только на первом снимке после события и к 14 августа вернулся к прежнему уровню, поэтому мы опираемся на HH и когерентность.",
    pol5: "Мы использовали HH и HV из продукта GCOV и HH из GUNW.",
    pol6: "VV и полной поляризации над нашими участками в данных нет.",
    repo: "Открытый код и метод на GitHub →", showZone: "Зона изменений", explore: "Открыть на карте", f2v: "24 см", f3v: "20 м",
    u1: "Выберите место: карточка выше, точка на карте или вкладка", u2: "Двигайте ползунок дат и переключайте радарные слои", u3: "Читайте вердикт и проверки под картой", u4: "Бесплатно, без регистрации, работает на телефоне",
    navAction: "На практике", actTitle: "От карты к действию",
    actText: "Как спасательная служба могла бы использовать каждый новый пролёт NISAR. Это предложение на основе наших измерений, с КЧС оно пока не согласовано.",
    a1t: "Зелёный: записать", a1: "В круге 2,5 км вокруг села, дороги или канала нет необычной потери когерентности. Ничего делать не нужно.",
    a2t: "Жёлтый: проверить за столом в тот же день", a2: "В круге не меньше 50 га сильной потери когерентности, вдвое больше среднего по всей области для той же пары снимков, пара через 12 дней. В наших пяти областях это прошли только 9 из 288 тестов без события: примерно 3 сигнала на 100 сёл под наблюдением за пролёт.",
    a3t: "Красный: отправить людей", a3: "Жёлтый плюс любой независимый признак: чистый снимок Landsat или Sentinel-2 со свежим голым грунтом, сильный дождь, сообщение с места или яркость радара, которая остаётся выше. Одного флага радара мало: флаг размером как в Айни встречается примерно в 1 из 80 тестов, где селя не было.",
    actNote: "Водохранилища: если площадь воды изменилась больше чем на 10% между пролётами, перед сообщением найдите чистый снимок Landsat или Sentinel-2 в пределах четырёх дней. На Рогуне так выяснилось, что осенние провалы — эффект радара. Ограничения: метод показывает изменение уже после события и пропускает узкие потоки, как в Рушане.",
    actLink: "Полный порядок работы со схемой (EN/RU) →",
    boardTitle: "Правило на наших собственных данных",
    boardText: "Каждый квадрат — одна пара пролётов радара над кругом 2,5 км вокруг места. Число — площадь с флагом в гектарах, дата — второй пролёт. Квадраты с красной рамкой охватывают известный сель.",
    bl1: "зелёный", bl2: "жёлтый сигнал", bl3: "пара длиннее 12 дней, не используется", bl4: "в этой паре был сель",
    spotHint: "Нажмите в любом месте внутри радарного окна, чтобы запустить там наш тест.",
    blTitle: "Слепой тест: второй сель, под который мы ничего не подстраивали",
    blText: "Тот же ливень 11 июля 2026 обрушил сель на Рашнаи Поён (Пенджикент), примерно в 100 км западнее Айни: 5 домов разрушено, 4 повреждено. До того как смотреть радарные данные по этому месту, мы записали правило: пара через 11 июля должна быть самой большой из всех пар, не меньше 50 га и вдвое больше среднего по области. Потом запустили неизменённый тест Айни на всех трёх орбитах, которые снимают это село.",
    btOrbit: "Орбита", btPair: "Пара через 11 июля", btHa: "Флаг у села", btRes: "Итог",
    btAsc: "восходящая", btAsc2: "восходящая", btDesc: "нисходящая", btP1: "9 → 21 июля", btP2: "4 → 16 июля", btP3: "4 → 16 июля",
    btMiss: "не обнаружен", btMiss2: "не обнаружен", btHit: "обнаружен",
    btH1: "3 га", btH2: "15 га", btH3: "111 га",
    bwTitle: "Почему только одна орбита?",
    bwText: "Склоны, которые изменились, смотрят на запад. Нисходящая орбита видит их с запада: 64% её флагов лежат на западных склонах, хотя таких склонов вокруг 31%. Две восходящие орбиты смотрят с востока и видят эти склоны со спины. Мы измерили это по модели рельефа и векторам визирования из файлов NISAR: из 111 га, которые изменились, с орбиты 012A можно следить только за 23%, с 113A за 31% (остальное в радарной тени, видно под скользящим углом или имеет слишком низкую обычную когерентность), а по остальной земле вокруг села около 65%. Урок для любой службы предупреждения: всегда проверять оба направления орбиты. Три орбиты вместе видят 94% круга.",
    bwLink: "Правило, записанное до теста, и полный результат →",
    bwNote: "«Видно» под каждым названием: доля круга, где эта орбита вообще могла бы заметить сель. Остальное скрыто рельефом (радарная тень, наложение, скользящий угол) или имеет обычную когерентность ниже 0.5, и падение на 0.3 там невозможно (ниже 0.2 когерентность почти не опускается). Измерено по модели рельефа Copernicus и векторам визирования из файлов NISAR."
  });
  UI.en.L.water = "Water detected by radar"; UI.en.L.s2change = "Optical change (Sentinel-2)"; UI.ru.L.s2change = "Оптические изменения (Sentinel-2)"; UI.ru.L.water = "Вода по данным радара";
  UI.en.chartWater = "Water area detected by radar (km²)"; UI.ru.chartWater = "Площадь воды по радару (км²)";
  UI.en.water = "water area"; UI.ru.water = "площадь воды";
  UI.en.readMore = "Full analysis"; UI.ru.readMore = "Полный разбор";
  var state = { lang: "en", data: null, story: null, meta: null, series: null, layer: "cohchange", idx: 0, opacity: 0.85, zone: true };
  var map, chart, ASSET_V = "8";
  var $ = function (id) { return document.getElementById(id); };
  function t(k) { return UI[state.lang][k]; }
  function fmtDate(d) { return d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8); }
  function fmtPair(p) { var a = p.split("_"); return fmtDate(a[0]) + " → " + fmtDate(a[1]); }
  function statText(s) { var v = s.stat; if (v == null) return ""; return typeof v === "string" ? v : (v[state.lang] || v.en || ""); }
  function fmtNum(v) { var s = String(v); return state.lang === "ru" ? s.replace(".", ",") : s; }

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
      var img = el("img"); img.src = "img/cards/" + s.id + ".jpg"; img.alt = ""; img.loading = "lazy"; img.width = 600; img.height = 450; b.appendChild(img);
      var body = el("div", "scard-body");
      body.appendChild(el("span", "verdict", s.verdict ? s.verdict[state.lang] : ""));
      body.appendChild(el("h3", null, s.title[state.lang]));
      body.appendChild(el("span", "scard-kind", s.kind ? s.kind[state.lang] : ""));
      body.appendChild(el("span", "scard-stat", statText(s)));
      body.appendChild(el("span", "scard-label", s.statLabel ? s.statLabel[state.lang] : ""));
      b.appendChild(body);
      b.setAttribute("aria-label", s.title[state.lang] + ". " + t("explore"));
      b.addEventListener("click", function () { if (s.ready) { loadStory(s); document.querySelector(".map-wrap").scrollIntoView({ behavior: "smooth", block: "start" }); } });
      box.appendChild(b);
    });
  }

  function renderStoryText() {
    var s = state.story;
    $("story-title").textContent = s.title[state.lang];
    if ($("analysis-title")) $("analysis-title").textContent = s.title[state.lang];
    $("story-meta").textContent = s.meta[state.lang];
    $("story-kind").textContent = s.kind ? s.kind[state.lang] : "";
    var d = document.querySelector(".detail"); d.className = "detail tone-" + (s.tone || "stable");
    $("detail-verdict").textContent = s.verdict ? s.verdict[state.lang] : "";
    $("detail-stat").textContent = statText(s);
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
    if (s.defaultDate && keys.indexOf(s.defaultDate) >= 0) return keys.indexOf(s.defaultDate);
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
    var Lc = LAYERS[state.layer], src = map.getSource("radar"), url = imgUrl(), c = (Lc.corners && Lc.corners(state.story)) || state.meta.corners;
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
    var label = L.label ? L.label(state.story) : !L.time ? fmtPair(state.story.eventPair) : (L.time === "pairs" ? fmtPair(keys[state.idx]) : fmtDate(keys[state.idx]));
    var isEvent = !L.label && !!state.story.eventPair && (L.time === "pairs" ? keys[state.idx] === state.story.eventPair : !L.time);
    $("time-value").textContent = label + (isEvent ? "  · " + t("event") : "");
    var lg = L.legend;
    $("legend").innerHTML = "<strong>" + UI[state.lang].L[state.layer] + "</strong><div class=\"bar\" style=\"background:" + lg[0] + "\"></div><div class=\"ends\"><span>" + fmtNum(lg[1]) + " " + (lg[3] ? t("legendDb") : "") + "</span><span>" + fmtNum(lg[2]) + " " + (lg[3] ? t("legendDb") : "") + "</span></div>";
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
                  y: { ticks: { color: ink, callback: function (v) { return fmtNum(v); } }, grid: { color: line }, suggestedMin: pairsMode ? 0 : undefined, suggestedMax: pairsMode ? 1 : undefined } } }
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
        scales: { x: { ticks: { color: ink, maxRotation: 60, minRotation: 40, font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: ink, callback: function (v) { return fmtNum(v); } }, grid: { color: line }, title: { display: true, text: state.lang === "ru" ? "га" : "ha", color: ink } } } } });
    note.textContent = state.lang === "ru"
      ? "Проверка без подгонки: площадь сильной потери когерентности (на 0,3 ниже медианы всех остальных пар) в радиусе " + fmtNum(pt.radius_km) + " км от сёл, по каждой паре снимков. Цветом выделена пара через событие."
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
          map.flyTo({ center: s.center, zoom: zoomFor(s), pitch: view3d ? PITCH : 0, bearing: view3d ? BEARING : 0, duration: REDUCED ? 0 : 1600, essential: true });
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

  var DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
  var PITCH = 52, BEARING = -14, ZOOM3D = 0.9, view3d = true;
  function zoomFor(s) { return s.zoom - (view3d ? ZOOM3D : 0); }
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function fitPadding() {
    if (!map) return;
    var wide = window.innerWidth > 1100, rail = document.querySelector(".rail"), panel = document.querySelector(".panel");
    var l = wide && rail ? rail.getBoundingClientRect().right : 0, r = wide && panel ? window.innerWidth - panel.getBoundingClientRect().left : 0;
    map.setPadding({ left: Math.max(0, l), right: Math.max(0, r), top: 0, bottom: 0 });
  }
  function toggle3d() {
    view3d = !view3d;
    var b = $("view-3d"); if (b) { b.setAttribute("aria-pressed", String(view3d)); b.textContent = view3d ? "3D" : "2D"; }
    map.setTerrain(view3d ? { source: "dem", exaggeration: 1.35 } : null);
    map.easeTo({ zoom: zoomFor(state.story), pitch: view3d ? PITCH : 0, bearing: view3d ? BEARING : 0, duration: REDUCED ? 0 : 900 });
  }
  function initMap() {
    map = new maplibregl.Map({
      container: "map",
      style: { version: 8, sources: { s2: { type: "raster", tileSize: 256, maxzoom: 15,
        tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg"],
        attribution: "Sentinel-2 cloudless 2023 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2023)" },
        dem: { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Terrain: Mapzen / AWS Terrain Tiles" },
        hs: { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 14 } },
        layers: [{ id: "s2", type: "raster", source: "s2" },
          { id: "hills", type: "hillshade", source: "hs", paint: { "hillshade-exaggeration": 0.28, "hillshade-shadow-color": "#05070a", "hillshade-highlight-color": "rgba(255,255,255,0.12)", "hillshade-accent-color": "#05070a" } }],
        terrain: { source: "dem", exaggeration: 1.35 } },
      center: [70.8, 38.6], zoom: 6.1, pitch: 0, maxPitch: 75, attributionControl: { compact: true }
    });
    fitPadding(); window.addEventListener("resize", fitPadding);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    var onReady = function () {
      if (mapReady) return;
      mapReady = true;
      if (state.story) {
        if (REDUCED) map.jumpTo({ center: state.story.center, zoom: zoomFor(state.story), pitch: PITCH, bearing: BEARING });
        else setTimeout(function () { map.flyTo({ center: state.story.center, zoom: zoomFor(state.story), pitch: PITCH, bearing: BEARING, duration: 5200, curve: 1.6, essential: true }); }, 700);
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
    if ($("view-3d")) $("view-3d").addEventListener("click", function () { if (map) toggle3d(); });
    $("zone-toggle").addEventListener("change", function (e) { state.zone = e.target.checked; if (map.getLayer("zone")) map.setLayoutProperty("zone", "visibility", state.zone ? "visible" : "none"); });
  }

  window.NISAR = { get map() { return map; }, get story() { return state.story; }, get lang() { return state.lang; }, get ready() { return mapReady; } };
  fetch("data/stories.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
    state.data = d; applyStatic(); renderTabs(); renderCards(); bind(); initMap();
    var first = d.stories.filter(function (s) { return s.ready; })[0];
    if (first) loadStory(first);
  });
})();
