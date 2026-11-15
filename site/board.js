/* Alarm board: the "From map to action" rule run on every watched place and image pair (data/alarm_board.json). */
(function () {
  "use strict";
  var T = {
    en: { yellow: "yellow alarm", green: "green", long: "pair longer than 12 days, not used for alarms", nodata: "not enough data",
          event: "pair spans a reported mudflow", ha: "ha flagged", x: "× the area average",
          mon: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
          watch: "watchable", watchTip: "Share of the 2.5 km circle this orbit can watch: slope open to the radar and usual coherence above 0.5" },
    ru: { yellow: "жёлтый сигнал", green: "зелёный", long: "пара длиннее 12 дней, для сигналов не используется", nodata: "мало данных",
          event: "пара охватывает известный сель", ha: "га с флагом", x: "× от среднего по области",
          mon: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
          watch: "видно", watchTip: "Доля круга 2,5 км, за которой эта орбита может следить: склон открыт радару и обычная когерентность выше 0,5" }
  };
  var data = null, det = null, host = document.getElementById("board");
  if (!host) return;
  function d(s, L) { var p = s.split("-"); return (+p[2]) + " " + L.mon[+p[1] - 1]; }
  function render() {
    if (!data) return;
    var lang = document.documentElement.lang === "ru" ? "ru" : "en", L = T[lang];
    host.innerHTML = "";
    data.rows.forEach(function (r, i) {
      var row = document.createElement("div"); row.className = "brow";
      var name = document.createElement("div"); name.className = "bname"; name.textContent = r.name[lang];
      var v = det && det.villages[i];
      if (v) { var w = document.createElement("small"); w.className = "bwatch"; w.textContent = L.watch + " " + Math.round(v.watchable * 100) + "%"; w.title = L.watchTip; name.appendChild(w); }
      row.appendChild(name);
      var cells = document.createElement("div"); cells.className = "bcells"; cells.setAttribute("role", "list");
      r.cells.forEach(function (c) {
        var el = document.createElement("span");
        el.className = "bcell b-" + c.status + (c.event ? " b-event" : "");
        el.setAttribute("role", "listitem");
        var txt = d(c.from, L) + " → " + d(c.to, L) + ": " + Math.round(c.ha) + " " + L.ha + ", " + (lang === "ru" ? c.ratio.toFixed(1).replace(".", ",") : c.ratio.toFixed(1)) + L.x +
          " · " + L[c.status] + (c.event ? " · " + L.event : "");
        el.title = txt; el.setAttribute("aria-label", txt);
        el.textContent = c.status === "nodata" ? "–" : Math.round(c.ha);
        var lab = document.createElement("small"); lab.textContent = d(c.to, L); el.appendChild(lab);
        cells.appendChild(el);
      });
      row.appendChild(cells); host.appendChild(row);
    });
  }
  fetch("data/alarm_board.json?v=2", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) { data = j; render(); });
  fetch("data/detectability.json?v=1", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) { det = j; render(); }, function () {});
  new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
