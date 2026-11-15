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
      legendDb: "dB", legendLow: "low", legendHigh: "high", sources: "Sources", winLabel: "Radar window", winPx: "1 pixel", winM: "m" },
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
      legendDb: "дБ", legendLow: "низкая", legendHigh: "высокая", sources: "Источники", winLabel: "Окно радара", winPx: "1 пиксель", winM: "м" }
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
    navStories: "Stories", navExplore: "Map", navMethod: "Method", navData: "Limits and data", navAnalysis: "Analysis", navBlind: "Blind test",
    anKicker: "Full analysis · choose a place",
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
    actLink: "Full workflow with diagram →",
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
    bwNote: "«Видно» под каждым названием: доля круга, где эта орбита вообще могла бы заметить сель. Остальное скрыто рельефом (радарная тень, наложение, скользящий угол) или имеет обычную когерентность ниже 0,5, и падение на 0,3 там невозможно (ниже 0,2 когерентность почти не опускается). Измерено по модели рельефа Copernicus и векторам визирования из файлов NISAR."
  });
  UI.en.L.water = "Water detected by radar"; UI.en.L.s2change = "Optical change (Sentinel-2)"; UI.ru.L.s2change = "Оптические изменения (Sentinel-2)"; UI.ru.L.water = "Вода по данным радара";
  UI.en.chartWater = "Water area detected by radar (km²)"; UI.ru.chartWater = "Площадь воды по радару (км²)";
  UI.en.water = "water area"; UI.ru.water = "площадь воды";
  UI.en.readMore = "Full analysis"; UI.ru.readMore = "Полный разбор";
  UI.en.LD = {
    cohchange: "Red: the ground stopped matching between the two passes across the event (something moved). Blue: it matched better than in the pair before.",
    coh: "How well the ground matches itself between two passes 12 days apart. Bright = unchanged; dark = moved, wet, snow-covered or overgrown.",
    hh: "Strength of the radar echo. Bright = rough ground, rock, buildings. Dark = smooth ground or calm water.",
    hv: "Echo that changed polarization: bright where the signal bounces inside vegetation or loose material.",
    dhh: "Brightness compared with the first image. Red = brighter (rougher or wetter), blue = darker (smoother or flooded).",
    water: "Blue = open water found by the radar on this date (smooth water looks dark to radar).",
    s2change: "Magenta = ground that lost vegetation and got brighter in optical Sentinel-2 images: an independent check of the radar."
  };
  UI.ru.LD = UI.en.LD;
  UI.en.mapLoad = "Loading 3D terrain…"; UI.ru.mapLoad = "Загружаем 3D-рельеф…";
  var state = { lang: "en", data: null, story: null, meta: null, series: null, layer: "cohchange", idx: 0, opacity: 0.72, zone: true };
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
      b.setAttribute("aria-selected", String(!!(state.story && s.id === state.story.id)));
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

  // ---------- the radar window, drawn as an instrument footprint ----------
  // Every place is read from one 8, 18 or 26 km square of a NISAR frame. Until now nothing on
  // the map said where that square starts and stops, so the edge of the raster read as a seam
  // in the photo. The frame is the same square the numbers come from: a hairline plus four
  // corner ticks. Sizes are taken from data/<place>/meta.json, never typed by hand.
  var WIN_TICK = 0.06;   // tick length, as a part of the side
  var WIN_PX = 400;      // every display raster in data/*/layers is 400 x 400 pixels
  function kmBetween(a, b) {
    var dLat = (b[1] - a[1]) * Math.PI / 180, dLon = (b[0] - a[0]) * Math.PI / 180;
    return 6371.0088 * Math.hypot(dLat, dLon * Math.cos((a[1] + b[1]) / 2 * Math.PI / 180));
  }
  function windowSpec(meta) {
    var c = meta && meta.corners;
    if (!c || c.length !== 4) return null;
    var w = kmBetween(c[0], c[1]), h = kmBetween(c[0], c[3]);
    return { size: Math.round(w) + " × " + Math.round(h) + " km", px: Math.round(meta.pixel_m) };
  }
  function windowRing(c) {
    return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: c.concat([c[0]]) } };
  }
  function windowTicks(c) {
    var f = WIN_TICK, out = [];
    [[0, 1, 3], [1, 0, 2], [2, 1, 3], [3, 0, 2]].forEach(function (q) {
      var p = c[q[0]];
      [c[q[1]], c[q[2]]].forEach(function (o) {
        out.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [p, [p[0] + (o[0] - p[0]) * f, p[1] + (o[1] - p[1]) * f]] } });
      });
    });
    return { type: "FeatureCollection", features: out };
  }
  function frameWindow(c) {
    if (!map || !c || c.length !== 4) return;
    if (map.getSource("win")) { map.getSource("win").setData(windowRing(c)); map.getSource("win-t").setData(windowTicks(c)); return; }
    // above the radar layer, below nothing else: the frame must stay visible over the data
    map.addSource("win", { type: "geojson", data: windowRing(c) });
    map.addLayer({ id: "win-line", type: "line", source: "win", paint: { "line-color": "#02040a", "line-width": 3.2, "line-opacity": .45 } });
    map.addLayer({ id: "win-rule", type: "line", source: "win", paint: { "line-color": "#eaf2ff", "line-width": 1.35, "line-opacity": .8 } });
    map.addSource("win-t", { type: "geojson", data: windowTicks(c) });
    map.addLayer({ id: "win-tick", type: "line", source: "win-t", paint: { "line-color": "#ffffff", "line-width": 2.6, "line-opacity": .95 } });
  }

  // The area of the change zone is already in meta.zone_ha. A chip on the mask ties the number to
  // the shape: the centre is the centre of mass of the same PNG the map draws, not the window centre.
  var zoneTag = null;
  function placeZoneLabel() {
    if (zoneTag) { zoneTag.remove(); zoneTag = null; }
    var ha = state.meta && state.meta.zone_ha;
    if (!ha || ha < 5) return;            // below this the zone is not what the story is about
    var img = new Image(), id = state.story.id, cn = state.meta.corners;
    img.onload = function () {
      var cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
      var g = cv.getContext("2d"); g.drawImage(img, 0, 0);
      var d = g.getImageData(0, 0, img.width, img.height).data, sx = 0, sy = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 0) { var p = i / 4; sx += p % img.width; sy += (p - (p % img.width)) / img.width; n++; }
      }
      if (!n || !state.story || state.story.id !== id) return;
      var u = sx / n / (img.width - 1), v = sy / n / (img.height - 1);
      var lon = (1 - u) * (1 - v) * cn[0][0] + u * (1 - v) * cn[1][0] + u * v * cn[2][0] + (1 - u) * v * cn[3][0];
      var lat = (1 - u) * (1 - v) * cn[0][1] + u * (1 - v) * cn[1][1] + u * v * cn[2][1] + (1 - u) * v * cn[3][1];
      var tag = el("div", "zone-tag", Math.round(ha) + " ha");
      zoneTag = new maplibregl.Marker({ element: tag, anchor: "center", opacityWhenCovered: "0.4" }).setLngLat([lon, lat]).addTo(map);
    };
    img.src = "data/" + id + "/layers/zone.png?v=" + ASSET_V;
  }

  var mapReady = false, pendingMap = false, lastImg = "";
  function updateRaster() {
    updatePanel();
    if (!mapReady) { pendingMap = true; return; }
    updateMapLayers();
  }
  function updateMapLayers() {
    var Lc = LAYERS[state.layer], src = map.getSource("radar"), url = imgUrl(), c = (Lc.corners && Lc.corners(state.story)) || state.meta.corners;
    // one story switch can call this twice in the same tick; a second updateImage while the first
    // is still loading throws an AbortError into the console, so identical requests are skipped
    var imgKey = url + "|" + c.join(";");
    if (src) { if (imgKey !== lastImg) { lastImg = imgKey; src.updateImage({ url: url, coordinates: c }); } }
    else {
      lastImg = imgKey;
      map.addSource("radar", { type: "image", url: url, coordinates: c });
      map.addLayer({ id: "radar", type: "raster", source: "radar", paint: { "raster-opacity": state.opacity, "raster-fade-duration": 0 } });
      if (state.meta.zone_pixels > 0) {
        map.addSource("zone", { type: "image", url: "data/" + state.story.id + "/layers/zone.png?v=" + ASSET_V, coordinates: c });
        map.addLayer({ id: "zone", type: "raster", source: "zone", paint: { "raster-opacity": 0.9, "raster-fade-duration": 0 } });
        // the same mask, drawn as a 2-pixel ring (scripts/zone_edge.py): an edge instead of loose patches
        map.addSource("zone-edge", { type: "image", url: "data/" + state.story.id + "/layers/zone-edge.png?v=" + ASSET_V, coordinates: c });
        map.addLayer({ id: "zone-edge", type: "raster", source: "zone-edge", paint: { "raster-opacity": 1, "raster-fade-duration": 0 } });
        placeZoneLabel();
      }
    }
    map.setPaintProperty("radar", "raster-opacity", state.opacity);
    map.setLayoutProperty("radar", "visibility", cmpOn ? "none" : "visible");
    if (map.getLayer("zone")) map.setLayoutProperty("zone", "visibility", zoneVisible() ? "visible" : "none");
    if (map.getLayer("zone-edge")) map.setLayoutProperty("zone-edge", "visibility", zoneVisible() ? "visible" : "none");
    if (zoneTag) zoneTag.getElement().style.display = zoneVisible() ? "" : "none";
    frameWindow(c);
  }
  // the legend box is rebuilt from several places (layer change, water views), so the window
  // line is re-attached rather than written once
  function appendWindowSpec() {
    var box = $("legend"); if (!box) return;
    var old = box.querySelector(".legend-spec"); if (old) old.remove();
    var spec = windowSpec(state.meta); if (!spec) return;
    var sp = el("div", "legend-spec");
    sp.appendChild(el("span", "ls-k", t("winLabel")));
    sp.appendChild(el("span", "ls-v", spec.size + " · " + t("winPx") + " = " + spec.px + " " + t("winM")));
    box.appendChild(sp);
  }

  function updatePanel() {
    var L = LAYERS[state.layer], keys = timeKeys(), sl = $("time-slider");
    sl.disabled = !L.time; sl.max = Math.max(0, keys.length - 1); sl.value = state.idx;
    if ($("layer-help")) $("layer-help").textContent = (UI[state.lang].LD || {})[state.layer] || "";
    $("time-label").textContent = L.time === "pairs" ? t("pair") : t("date");
    var label = L.label ? L.label(state.story) : !L.time ? fmtPair(state.story.eventPair) : (L.time === "pairs" ? fmtPair(keys[state.idx]) : fmtDate(keys[state.idx]));
    var isEvent = !L.label && !!state.story.eventPair && (L.time === "pairs" ? keys[state.idx] === state.story.eventPair : !L.time);
    $("time-value").textContent = label + (isEvent ? "  · " + t("event") : "");
    var lg = L.legend;
    $("legend").innerHTML = "<strong>" + UI[state.lang].L[state.layer] + "</strong><div class=\"bar\" style=\"background:" + lg[0] + "\"></div><div class=\"ends\"><span>" + fmtNum(lg[1]) + " " + (lg[3] ? t("legendDb") : "") + "</span><span>" + fmtNum(lg[2]) + " " + (lg[3] ? t("legendDb") : "") + "</span></div>";
    appendWindowSpec();
    updateChart();  }

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
          if (map.getLayer("cmp")) { map.removeLayer("cmp"); map.removeSource("cmp"); }
        }
        cmpOn = false; cmpImgs = null; stopPlay();
        state.view = "change";
        updateRaster();
        applyView();
      });
  }

  var placeMarkers = [];
  function placePlaces() {
    placeMarkers.forEach(function (m) { m.remove(); }); placeMarkers = [];
    var pl = state.story.places || [];
    pl.forEach(function (p, i) {
      // put the label on the far side of the nearest neighbour, so close villages (Dargh, Kazdon) do not overlap
      var flip = pl.some(function (q, k) { return k !== i && Math.abs(q[2] - p[2]) < 0.01 && q[1] > p[1] && q[1] - p[1] < 0.03; });
      var e = el("div", "place" + (flip ? " flip" : ""), p[0]);
      placeMarkers.push(new maplibregl.Marker({ element: e, anchor: flip ? "right" : "left", offset: [flip ? 4 : -4, 0], opacityWhenCovered: "0.4" }).setLngLat([p[1], p[2]]).addTo(map));
    });
  }

  // ---------- four ways to look at a change: What changed / Before-After / Swipe / Timeline ----------
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dShort(d) { return (+d.slice(6, 8)) + " " + MON[+d.slice(4, 6) - 1]; }
  function kShort(k) { var a = k.split("_"); return a.length > 1 ? dShort(a[0]) + " → " + dShort(a[1]) : dShort(k); }
  var SHORT = { ayni: "Ayni", sarez: "Sarez", nurek: "Nurek", rogun: "Rogun", rushan: "Rushan" };
  var AFTER = { nurek: "20260826", rogun: "20260919" };
  var VIEWS = [["change", "What changed"], ["ba", "Before / After"], ["swipe", "Swipe"], ["time", "Timeline"]];
  var ICON = { play: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
               pause: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>' };
  state.view = "change"; state.ba = "after"; state.swipe = 0.5;
  var cmpOn = false, cmpKind = null, cmpImgs = null, cv = document.createElement("canvas"), playT = null, imgCache = {};

  function zoneVisible() { return state.zone && state.view === "change" && !cmpOn; }
  function isEvent() { return !!(state.story && state.story.eventPair); }
  function km2(key) { var w = state.water; if (!w) return null; var i = w.dates.indexOf(key); return i < 0 ? null : w.water_km2[i]; }
  // the "before" and "after" images this place compares
  function pairOf() {
    var s = state.story, se = state.series;
    if (isEvent()) { var i = se.pairs.indexOf(s.eventPair); return { layer: "coh", keys: se.pairs, b: Math.max(0, i - 1), a: i }; }
    var ks = se.dates, w = state.water, mx = ks.length - 1;
    if (w) { var best = -1; w.water_km2.forEach(function (v, i) { var j = ks.indexOf(w.dates[i]); if (j >= 0 && v > best) { best = v; mx = j; } }); }
    if (s.tone === "stable") mx = ks.length - 1;   // Sarez: first and last date, no trend to chase
    var fixed = AFTER[s.id] || s.defaultDate; if (fixed && ks.indexOf(fixed) >= 0) mx = ks.indexOf(fixed);   // the date the story's number refers to
    return { layer: "water", keys: ks, b: 0, a: mx };
  }
  function loadImg(u) {
    if (!imgCache[u]) imgCache[u] = new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = u; });
    return imgCache[u];
  }
  function layerUrl(layer, key) { return "data/" + state.story.id + "/layers/" + LAYERS[layer].file(key, state.story) + ".png?v=" + ASSET_V; }

  function stopPlay() {
    if (playT) { clearInterval(playT); playT = null; }
    var b = $("v-play"); if (b) { b.innerHTML = ICON.play; b.setAttribute("aria-label", "Play through the dates"); b.setAttribute("aria-pressed", "false"); }
  }
  function cmpLayerOff() {
    cmpOn = false;
    if (!map) return;
    if (map.getLayer("cmp")) map.setLayoutProperty("cmp", "visibility", "none");
    if (map.getLayer("swipe-line")) map.setLayoutProperty("swipe-line", "visibility", "none");
    if (map.getLayer("radar")) map.setLayoutProperty("radar", "visibility", "visible");
    if (map.getLayer("zone")) map.setLayoutProperty("zone", "visibility", zoneVisible() ? "visible" : "none");
  }
  // a canvas source only re-uploads while "playing": play for two frames after each redraw
  function nudge() {
    var src = map && map.getSource("cmp"); if (!src) return;
    src.play(); map.triggerRepaint();
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (map.getSource("cmp")) map.getSource("cmp").pause(); }); });
  }
  function drawCanvas() {
    if (!cmpImgs) return;
    var W = cv.width, H = cv.height, b = cmpImgs[0], a = cmpImgs[1], ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, W, H);
    if (cmpKind === "swipe") {
      var x = Math.round(state.swipe * W);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); ctx.drawImage(b, 0, 0, W, H); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(x, 0, W - x, H); ctx.clip(); ctx.drawImage(a, 0, 0, W, H); ctx.restore();
      return;
    }
    // water: gained (cyan), lost (amber), on both dates (blue)
    ctx.drawImage(b, 0, 0, W, H); var B = ctx.getImageData(0, 0, W, H).data;
    ctx.clearRect(0, 0, W, H); ctx.drawImage(a, 0, 0, W, H);
    var out = ctx.getImageData(0, 0, W, H), A = out.data;
    for (var i = 0; i < A.length; i += 4) {
      var wb = B[i + 3] > 0, wa = A[i + 3] > 0;
      if (wa && wb) { A[i] = 47; A[i + 1] = 111; A[i + 2] = 224; A[i + 3] = 150; }
      else if (wa) { A[i] = 64; A[i + 1] = 232; A[i + 2] = 255; A[i + 3] = 255; }
      else if (wb) { A[i] = 255; A[i + 1] = 178; A[i + 2] = 36; A[i + 3] = 255; }
      else A[i + 3] = 0;
    }
    ctx.putImageData(out, 0, 0);
  }
  function swipeLine() {
    if (!map || !state.meta) return;
    var c = state.meta.corners, f = state.swipe, on = cmpOn && cmpKind === "swipe";
    var top = [c[0][0] + f * (c[1][0] - c[0][0]), c[0][1] + f * (c[1][1] - c[0][1])], bot = [c[3][0] + f * (c[2][0] - c[3][0]), c[3][1] + f * (c[2][1] - c[3][1])];
    var data = { type: "Feature", geometry: { type: "LineString", coordinates: [top, bot] }, properties: {} };
    if (!map.getSource("swipe-line")) {
      map.addSource("swipe-line", { type: "geojson", data: data });
      map.addLayer({ id: "swipe-line", type: "line", source: "swipe-line", paint: { "line-color": "#ffffff", "line-width": 3 } });
    } else map.getSource("swipe-line").setData(data);
    map.setLayoutProperty("swipe-line", "visibility", on ? "visible" : "none");
  }
  function showCanvas(kind) {
    if (!mapReady) return;              // the map's ready handler applies the view again
    var P = pairOf(), sid = state.story.id, want = kind === "diff" ? "change" : "swipe";
    Promise.all([loadImg(layerUrl(P.layer, P.keys[P.b])), loadImg(layerUrl(P.layer, P.keys[P.a]))]).then(function (im) {
      if (!state.story || state.story.id !== sid || state.view !== want) return;
      cmpImgs = im; cmpKind = kind; cv.width = im[1].naturalWidth; cv.height = im[1].naturalHeight;
      drawCanvas();
      if (!map.getSource("cmp")) {
        map.addSource("cmp", { type: "canvas", canvas: cv, coordinates: state.meta.corners, animate: false });
        map.addLayer({ id: "cmp", type: "raster", source: "cmp", paint: { "raster-opacity": state.opacity, "raster-fade-duration": 0 } });
      }
      cmpOn = true;
      map.setLayoutProperty("cmp", "visibility", "visible"); map.setPaintProperty("cmp", "raster-opacity", state.opacity);
      if (map.getLayer("radar")) map.setLayoutProperty("radar", "visibility", "none");
      if (map.getLayer("zone")) map.setLayoutProperty("zone", "visibility", "none");
      nudge(); swipeLine();
    }, function () { cmpLayerOff(); });
  }

  function applyView() {
    if (!state.story || !state.series) return;
    stopPlay();
    var P = pairOf(), v = state.view;
    if (v === "swipe" || (v === "change" && !isEvent())) {
      state.layer = P.layer; state.idx = P.a;
      updatePanel();
      showCanvas(v === "swipe" ? "swipe" : "diff");
    } else {
      cmpLayerOff();
      if (v === "change") { if (LAYERS[state.layer].time) state.layer = state.story.defaultLayer || storyLayers()[0]; state.idx = defaultIdx(); }
      else if (v === "ba") { state.layer = P.layer; state.idx = state.ba === "before" ? P.b : P.a; }
      else if (v === "time" && !LAYERS[state.layer].time) { state.layer = P.layer; state.idx = P.a; }
      updateRaster();
    }
    $("layer-select").value = state.layer;
    renderViews(); renderDock();
  }

  function renderViews() {
    var bar = $("viewbar"); if (!bar || !state.data) return;
    bar.innerHTML = "";
    var pl = el("div", "vb-places"); pl.setAttribute("role", "group"); pl.setAttribute("aria-label", "Place");
    state.data.stories.forEach(function (s) {
      var on = !!(state.story && state.story.id === s.id);
      var b = el("button", "vb-place tone-" + (s.tone || "stable") + (on ? " on" : ""), SHORT[s.id] || s.title[state.lang]);
      b.type = "button"; b.title = s.title[state.lang]; b.setAttribute("aria-pressed", String(on));
      b.addEventListener("click", function () { if (s.ready && !on) loadStory(s); });
      pl.appendChild(b);
    });
    var md = el("div", "vb-modes"); md.setAttribute("role", "group"); md.setAttribute("aria-label", "How to view the change");
    VIEWS.forEach(function (v) {
      var on = state.view === v[0], b = el("button", "vb-mode" + (on ? " on" : ""), v[1]);
      b.type = "button"; b.setAttribute("aria-pressed", String(on));
      b.addEventListener("click", function () { if (state.view !== v[0]) { state.view = v[0]; applyView(); } });
      md.appendChild(b);
    });
    bar.appendChild(pl); bar.appendChild(md);
  }

  function legendHtml(rows, title) {
    return "<strong>" + title + "</strong><div class=\"lg-row\">" + rows.map(function (r) { return "<span><i class=\"lg-sw\" style=\"background:" + r[0] + "\"></i>" + r[1] + "</span>"; }).join("") + "</div>";
  }
  function markChips() {
    var keys = timeKeys(), d = $("dock-date");
    document.querySelectorAll("#dock .chip").forEach(function (c, i) { var on = i === state.idx; c.classList.toggle("on", on); c.setAttribute("aria-pressed", String(on)); if (on) c.scrollIntoView({ block: "nearest", inline: "nearest" }); });
    if (d) d.textContent = keys[state.idx] ? kShort(keys[state.idx]) : "";
    var k = $("dock-km"); if (k) { var v = km2(keys[state.idx]); k.textContent = v != null && state.layer === "water" ? v.toFixed(1) + " km² of water" : ""; }
  }
  function renderDock() {
    var d = $("dock"); if (!d || !state.story || !state.series) return;
    d.innerHTML = "";
    var P = pairOf(), v = state.view, ev = isEvent(), s = state.story, kb = P.keys[P.b], ka = P.keys[P.a];
    var cap = el("p", "dock-cap");
    if (v === "change") {
      if (ev && state.layer === "s2change") cap.textContent = "Magenta: ground that lost its vegetation and got brighter in optical Sentinel-2 images: an independent check of the radar.";
      else if (ev && s.tone === "missed") cap.textContent = "Red would mark ground that stopped matching between the radar passes across the mudflow (" + kShort(s.eventPair) + "). Here almost nothing stands out: this is the event the radar missed. Try Before / After.";
      else if (ev) cap.textContent = "Red: ground that stopped matching between the radar passes across the mudflow (" + kShort(s.eventPair) + "). Yellow: the change zone we measured above the villages. Try Before / After or Swipe.";
      else {
        var b0 = km2(kb), a0 = km2(ka), dd = (a0 != null && b0 != null) ? a0 - b0 : null;
        cap.textContent = s.tone === "stable"
          ? "Lake edge on " + dShort(kb) + " and " + dShort(ka) + ": cyan = water only on the later date, amber = only on the earlier one. The area moves between " + "23.7 and 28.0 km² with no trend (wind on the water)."
          : "Cyan: new water since " + dShort(kb) + (dd != null ? " (+" + dd.toFixed(1) + " km² by " + dShort(ka) + ")" : "") + ". Blue: water on both dates. Amber: water that is gone.";
        $("legend").innerHTML = legendHtml([["#40e8ff", "new"], ["#2f6fe0", "both dates"], ["#ffb224", "gone"]], "Water " + dShort(kb) + " → " + dShort(ka));
      }
      d.appendChild(cap);
    } else if (v === "ba") {
      var row = el("div", "dock-row");
      [["before", "Before", kb], ["after", ev ? "Across the event" : "After", ka]].forEach(function (x) {
        var on = state.ba === x[0], b = el("button", "ba-btn" + (on ? " on" : ""));
        b.type = "button"; b.setAttribute("aria-pressed", String(on));
        b.appendChild(document.createTextNode(x[1])); var sm = el("small", null, kShort(x[2])); b.appendChild(sm);
        b.addEventListener("click", function () { state.ba = x[0]; applyView(); });
        row.appendChild(b);
      });
      d.appendChild(row);
      var k = state.ba === "before" ? kb : ka;
      if (ev) cap.textContent = state.ba === "before"
        ? "Radar pair " + kShort(kb) + ", before the mudflow. Bright = the ground stayed the same between the two passes."
        : (s.tone === "missed" ? "Radar pair " + kShort(ka) + ", across the mudflow. Almost nothing went dark here: the flow channel is too narrow for the radar."
                               : "Radar pair " + kShort(ka) + ", across the mudflow. The slopes above the villages went dark: the ground there moved.");
      else cap.textContent = "Water seen by the radar on " + dShort(k) + (km2(k) != null ? ": " + km2(k).toFixed(1) + " km²." : ".") + " Switch between the two to see the difference.";
      d.appendChild(cap);
    } else if (v === "swipe") {
      var sr = el("div", "swipe-row");
      sr.appendChild(el("span", null, "◀ Before · " + kShort(kb)));
      var r = document.createElement("input"); r.type = "range"; r.min = 0; r.max = 100; r.value = Math.round(state.swipe * 100); r.id = "swipe-range";
      r.setAttribute("aria-label", "Drag to compare before and after");
      r.addEventListener("input", function () { state.swipe = r.value / 100; drawCanvas(); nudge(); swipeLine(); });
      sr.appendChild(r);
      sr.appendChild(el("span", null, (ev ? "Across · " : "After · ") + kShort(ka) + " ▶"));
      d.appendChild(sr);
      cap.textContent = "Drag the slider: left of the white line is before, right of it is after.";
      d.appendChild(cap);
    } else {
      var keys = timeKeys(), tr = el("div", "dock-row");
      var pb = el("button", "play"); pb.type = "button"; pb.id = "v-play"; pb.innerHTML = ICON.play; pb.setAttribute("aria-label", "Play through the dates"); pb.setAttribute("aria-pressed", "false");
      pb.addEventListener("click", function () {
        if (playT) { stopPlay(); return; }
        pb.innerHTML = ICON.pause; pb.setAttribute("aria-label", "Pause"); pb.setAttribute("aria-pressed", "true");
        playT = setInterval(function () { state.idx = (state.idx + 1) % keys.length; updateRaster(); markChips(); }, 1100);
      });
      tr.appendChild(pb);
      var info = el("div", "dock-info"); var big = el("strong", "dock-date"); big.id = "dock-date"; info.appendChild(big);
      var kmEl = el("span", "dock-km"); kmEl.id = "dock-km"; info.appendChild(kmEl); tr.appendChild(info);
      d.appendChild(tr);
      var chips = el("div", "chips"); chips.setAttribute("role", "group"); chips.setAttribute("aria-label", LAYERS[state.layer].time === "pairs" ? "Image pairs" : "Dates");
      var evKey = !ev ? null : (LAYERS[state.layer].time === "pairs" ? s.eventPair : s.eventPair.split("_")[1]);
      keys.forEach(function (k, i) {
        var c = el("button", "chip" + (k === evKey ? " ev" : ""), LAYERS[state.layer].time === "pairs" ? dShort(k.split("_")[1]) : dShort(k));
        c.type = "button"; c.title = kShort(k) + (k === evKey ? " (across the event)" : "");
        c.addEventListener("click", function () { stopPlay(); state.idx = i; updateRaster(); markChips(); });
        chips.appendChild(c);
      });
      d.appendChild(chips);
      cap.textContent = "Pick a date or press play. " + (evKey ? "The red date spans the reported event. " : "") + "Layer: " + UI[state.lang].L[state.layer] + " (change it in the panel).";
      d.appendChild(cap);
      markChips();
    }
    var mw = document.querySelector(".map-wrap"); if (mw) mw.style.setProperty("--dock-h", d.offsetHeight + "px");
    appendWindowSpec();
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
  function initMap(first) {
    map = new maplibregl.Map({
      container: "map",
      style: { version: 8, sources: { s2: { type: "raster", tileSize: 256, maxzoom: 15,
        tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg"],
        attribution: "Sentinel-2 cloudless 2023 by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2023)" },
        dem: { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Terrain: Mapzen / AWS Terrain Tiles" },
        hs: { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 14 },
        // Sentinel-2 is 10 m per pixel and turns to mush past zoom 6, so from there the base photo is
        // Esri World Imagery: sub-metre to a few metres, which is what a place needs when you fly in
        hi: { type: "raster", tileSize: 256, maxzoom: 17, tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
          attribution: "Detail imagery: Esri, Maxar, Earthstar Geographics" } },
      layers: [{ id: "bg", type: "background", paint: { "background-color": "#2a2f35" } },
        { id: "s2", type: "raster", source: "s2", maxzoom: 6 },
        { id: "hi", type: "raster", source: "hi", minzoom: 5, paint: { "raster-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0, 6, 1], "raster-saturation": 0.12, "raster-contrast": 0.12, "raster-brightness-max": 1, "raster-fade-duration": 200 } },
        { id: "hills", type: "hillshade", source: "hs", paint: { "hillshade-exaggeration": ["interpolate", ["linear"], ["zoom"], 7, 0.18, 11, 0.04], "hillshade-shadow-color": "#1b2430", "hillshade-highlight-color": "rgba(255,255,255,0.08)", "hillshade-accent-color": "#1b2430" } }],
      terrain: { source: "dem", exaggeration: 1.35 },
      sky: { "sky-color": "#4f7fb8", "horizon-color": "#c3d3e4", "fog-color": "#c7d3df", "sky-horizon-blend": 0.5, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.12, "atmosphere-blend": 0.8 } },
      // open already over the first story, a little higher and flatter: the tiles on screen are the ones the final view needs
      center: first ? first.center : [70.8, 38.6], zoom: first ? zoomFor(first) - 1.1 : 6.1, pitch: first ? 30 : 0, bearing: 0,
      maxPitch: 75, attributionControl: { compact: true }, fadeDuration: 150
    });
    var shown = false, show = function () {
      if (shown) return; shown = true;
      $("map").classList.add("in"); var ml = $("map-load"); if (ml) ml.classList.add("done");
      var at = document.querySelector(".maplibregl-ctrl-attrib"); if (at) at.classList.remove("maplibregl-compact-show");
    };
    map.once("idle", show); setTimeout(show, 6000);
    fitPadding(); window.addEventListener("resize", fitPadding);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    var onReady = function () {
      if (mapReady) return;
      mapReady = true;
      if (state.story) {
        if (REDUCED) map.jumpTo({ center: state.story.center, zoom: zoomFor(state.story), pitch: PITCH, bearing: BEARING });
        else map.once("idle", function () { map.easeTo({ center: state.story.center, zoom: zoomFor(state.story), pitch: PITCH, bearing: BEARING, duration: 2400, essential: true }); });
        placePlaces();
        if (pendingMap) { pendingMap = false; updateMapLayers(); }
        if (state.series) applyView();
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
    $("layer-select").addEventListener("change", function (e) {
      state.layer = e.target.value; state.idx = defaultIdx(); state.view = LAYERS[state.layer].time ? "time" : "change";
      stopPlay(); cmpLayerOff(); updateRaster(); renderViews(); renderDock();
    });
    $("time-slider").addEventListener("input", function (e) {
      state.idx = +e.target.value; if (state.view !== "time") { state.view = "time"; stopPlay(); cmpLayerOff(); renderViews(); }
      updateRaster(); renderDock();
    });
    $("opacity-slider").addEventListener("input", function (e) { state.opacity = e.target.value / 100; if (map.getLayer("radar")) map.setPaintProperty("radar", "raster-opacity", state.opacity); if (map.getLayer("cmp")) map.setPaintProperty("cmp", "raster-opacity", state.opacity); });
    if ($("view-3d")) $("view-3d").addEventListener("click", function () { if (map) toggle3d(); });
    $("zone-toggle").addEventListener("change", function (e) { state.zone = e.target.checked; if (map.getLayer("zone")) map.setLayoutProperty("zone", "visibility", zoneVisible() ? "visible" : "none"); });
  }

  window.NISAR = { get map() { return map; }, get story() { return state.story; }, get lang() { return state.lang; }, get ready() { return mapReady; } };
  fetch("data/stories.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (d) {
    var first = d.stories.filter(function (s) { return s.ready; })[0];
    state.data = d; applyStatic(); renderTabs(); renderCards(); bind(); initMap(first);
    if (first) loadStory(first);
  });
})();
