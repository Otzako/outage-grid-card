class OutageGridCard extends HTMLElement {
  setConfig(c) {
    if (!c.entity) throw new Error("Укажите entity (calendar.*)");
    this._c = c;
    this._day = 0;
    this._events = [];
    this._last = 0;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._render();
  }

  set hass(h) {
    this._hass = h;
    if (Date.now() - this._last > 300000) {
      this._last = Date.now();
      this._load();
    }
  }

  async _load() {
    const s = new Date(); s.setHours(0, 0, 0, 0);
    const e = new Date(s); e.setDate(e.getDate() + 2);
    try {
      const url = `calendars/${this._c.entity}?start=${encodeURIComponent(s.toISOString())}&end=${encodeURIComponent(e.toISOString())}`;
      const r = await this._hass.callApi("GET", url);
      this._events = r.map(ev => ({
        s: new Date(ev.start.dateTime || ev.start.date || ev.start),
        e: new Date(ev.end.dateTime || ev.end.date || ev.end),
      })).sort((a, b) => a.s - b.s);
      this._err = null;
    } catch (err) {
      this._err = String(err.message || err);
    }
    this._updated = new Date();
    this._render();
  }

  _pad(n) { return String(n).padStart(2, "0"); }
  _hm(d) { return `${this._pad(d.getHours())}:${this._pad(d.getMinutes())}`; }
  _dur(min) {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return `${h} год${m ? " " + m + " хв" : ""}`;
  }

  _render() {
    if (!this.shadowRoot || !this._c) return;
    const now = new Date();
    const base = new Date(); base.setHours(0, 0, 0, 0);
    const dayStart = new Date(base); dayStart.setDate(base.getDate() + this._day);
    const BLUE = "#2f4a7d", YEL = "#f6d365";
    let totalMin = 0;

    let cells = "";
    for (let h = 0; h < 24; h++) {
      const hs = new Date(dayStart); hs.setHours(h, 0, 0, 0);
      const he = new Date(hs.getTime() + 3600000);
      const segs = [];
      for (const ev of this._events) {
        const a = Math.max(ev.s, hs), b = Math.min(ev.e, he);
        if (b > a) segs.push([(a - hs) / 36000, (b - hs) / 36000]); // в процентах
      }
      const offPct = segs.reduce((t, x) => t + (x[1] - x[0]), 0);
      totalMin += offPct * 0.6;
      let bg = BLUE;
      if (offPct >= 99.9) bg = YEL;
      else if (segs.length) {
        const st = []; let pos = 0;
        for (const [a, b] of segs) {
          st.push(`${BLUE} ${pos}% ${a}%`, `${YEL} ${a}% ${b}%`);
          pos = b;
        }
        st.push(`${BLUE} ${pos}% 100%`);
        bg = `linear-gradient(90deg, ${st.join(",")})`;
      }
      const cur = this._day === 0 && now >= hs && now < he ? "cur" : "";
      const light = offPct >= 99.9 || (offPct > 0 && bg === YEL) ? "#222" : "#fff";
      cells += `<div class="cell ${cur}" style="background:${bg};color:${offPct >= 99.9 ? "#222" : "#fff"}">${this._pad(h)}</div>`;
    }

    const offNow = this._events.find(ev => now >= ev.s && now < ev.e);
    const next = this._events.find(ev => ev.s > now);
    const dayName = d => (d < base.getTime() + 86400000 ? "Сьогодні" : "Завтра");
    let nextTxt = "Відключень не заплановано";
    if (offNow) nextTxt = `Світло з'явиться: ${dayName(offNow.e)} ${this._hm(offNow.e)}`;
    else if (next) nextTxt = `Наступне відключення: ${dayName(next.s)} ${this._hm(next.s)}–${this._hm(next.e)}`;

    const fmtDay = d => `${this._pad(d.getDate())}.${this._pad(d.getMonth() + 1)}`;
    const tomorrow = new Date(base); tomorrow.setDate(base.getDate() + 1);
    const title = this._c.title || "Графік відключень";

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { padding: 16px; }
        .title { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
        .status { display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:10px; }
        .dot { width:9px; height:9px; border-radius:50%; background:${offNow ? "#e53935" : "#4caf50"}; }
        .tabs { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
        .tab { text-align:center; padding:10px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;
               background:var(--secondary-background-color); color:var(--primary-text-color); }
        .tab.on { background:#0288d1; color:#fff; }
        .grid { display:grid; grid-template-columns:repeat(6,1fr); gap:6px; }
        .cell { text-align:center; padding:10px 0; border-radius:8px; font-weight:600; font-size:14px; box-sizing:border-box; }
        .cell.cur { outline:2px solid #26c6da; }
        .sum { font-weight:600; font-size:13px; margin-top:14px; }
        .next { font-size:13px; margin-top:6px; color:var(--secondary-text-color); }
        .foot { display:flex; justify-content:space-between; margin-top:12px; font-size:11px; color:var(--secondary-text-color); }
        .btn { cursor:pointer; color:#0288d1; }
        .err { color:#e53935; font-size:12px; margin-bottom:8px; }
      </style>
      <ha-card>
        <div class="title">${title}</div>
        ${this._err ? `<div class="err">Помилка: ${this._err}</div>` : ""}
        <div class="status"><span class="dot"></span>${offNow ? "Світла немає (за графіком)" : "Світло є (за графіком)"}</div>
        <div class="tabs">
          <div class="tab ${this._day === 0 ? "on" : ""}" data-d="0">Сьогодні · ${fmtDay(base)}</div>
          <div class="tab ${this._day === 1 ? "on" : ""}" data-d="1">Завтра · ${fmtDay(tomorrow)}</div>
        </div>
        <div class="grid">${cells}</div>
        <div class="sum">Заплановано без світла: ${this._dur(totalMin)}</div>
        <div class="next">${nextTxt}</div>
        <div class="foot">
          <span>Оновлено: ${this._updated ? this._hm(this._updated) : "—"}</span>
          <span class="btn" data-r="1">↻ Оновити</span>
        </div>
      </ha-card>`;

    this.shadowRoot.querySelectorAll(".tab").forEach(t =>
      t.addEventListener("click", () => { this._day = Number(t.dataset.d); this._render(); }));
    this.shadowRoot.querySelector("[data-r]").addEventListener("click", () => this._load());
  }

  getCardSize() { return 8; }
}

customElements.define("outage-grid-card", OutageGridCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "outage-grid-card", name: "Outage Grid Card" });
