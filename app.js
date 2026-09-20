// =====================================================================
//  RePrograma · aplicación
// =====================================================================
import { CONFIG } from './config.js';
import { createStore } from './store.js';
import {
  MODES, STEPS, SEMAFORO, PHASES, phaseById, IDEAS, EXERCISES, PLAN21, PLAN21_BLOCKS,
  ANCHORS, MILESTONES, KEYWORDS, OFFICIAL_URL, LIVE_URL
} from './content.js';

/* ---------- Utilidades ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayKey = () => keyOf(new Date());
const parseKey = (k) => { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const diffDays = (a, b) => Math.round((parseKey(a) - parseKey(b)) / 86400000);
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtClock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };
const hash = (str) => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; };
const isAudio = (u) => /\.(mp3|m4a|aac|wav|ogg)(\?.*)?$/i.test(u);

/* ---------- Estado ---------- */
let store = null;
let user = null;
let S = { profile: null, days: {}, entries: [], links: [] };
const ui = {
  tab: 'hoy', authMode: 'signin', authErr: '', pendingName: '',
  drafts: { entry: '', hecho: '', gracias: '' }, draftPhase: null,
  dur: 10, noClock: false, shownEntries: 15, allEntries: false,
  notice: null, safety: false, idea: null, entryIdea: null, anchor: -1
};
const TIMER_KEY = 'reprograma.timer.v1';
let timer = loadTimer();

function loadTimer() { try { return JSON.parse(localStorage.getItem(TIMER_KEY)) || null; } catch (e) { return null; } }
function saveTimer() { try { if (timer) localStorage.setItem(TIMER_KEY, JSON.stringify(timer)); else localStorage.removeItem(TIMER_KEY); } catch (e) { /* sin almacenamiento */ } }

function newProfile(name) {
  return { name: name || '', mode: 'programa', week: 1, weekStart: todayKey(), future: '', plan21: null, seen: {}, ideaToday: null, createdAt: Date.now() };
}
const mode = () => (S.profile && S.profile.mode) || 'programa';
const defaultDur = (m) => (m === 'programa' ? 30 : 10);
const dayRec = (k) => S.days[k] || { state: null, coherence: null, redirects: 0, stops: 0, sessions: [] };
function dayW(k) {
  if (!S.days[k]) S.days[k] = { state: null, coherence: null, redirects: 0, stops: 0, sessions: [] };
  const d = S.days[k];
  if (!d.sessions) d.sessions = [];
  if (d.stops == null) d.stops = 0;
  if (d.redirects == null) d.redirects = 0;
  return d;
}

/* ---------- Guardado ---------- */
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { t.hidden = true; }, 3500);
}
function fail(e) { console.error(e); toast('No se pudo guardar. Revisa tu conexión o tus reglas de Firestore.'); }
const pProfile = () => { try { return store.saveProfile(S.profile).catch(fail); } catch (e) { fail(e); } };
const pDay = (k) => { try { return store.saveDay(k, S.days[k]).catch(fail); } catch (e) { fail(e); } };

/* ---------- Modo y tema ---------- */
const THEME_COLOR = { programa: '#070C1C', vacio: '#000000', gratitud: '#F5E6C8' };
function applyMode(m) {
  document.documentElement.setAttribute('data-mode', m);
  const meta = $('#theme-color'); if (meta) meta.setAttribute('content', THEME_COLOR[m] || '#070C1C');
}

/* ---------- Recordatorios inteligentes ---------- */
function practiceSet() {
  const s = {};
  Object.keys(S.days).forEach((k) => { const d = S.days[k]; if ((d.sessions && d.sessions.length) || d.redirects > 0) s[k] = 1; });
  S.entries.forEach((e) => { s[keyOf(new Date(e.ts))] = 1; });
  return s;
}
function streak(set) {
  let k = todayKey(); if (!set[k]) k = addDays(k, -1);
  let n = 0; while (set[k]) { n++; k = addDays(k, -1); }
  return n;
}
function patterns() {
  const since = Date.now() - 7 * 86400000, counts = [];
  const texts = S.entries.filter((e) => e.ts >= since).map((e) => norm(e.text)).join(' ');
  if (!texts) return '';
  let total = 0;
  KEYWORDS.forEach((kw) => {
    const m = texts.match(new RegExp('\\b(' + kw[0] + ')\\w*', 'g'));
    if (m) { counts.push([kw[1], m.length]); total += m.length; }
  });
  if (total < 3) return '';
  counts.sort((a, b) => b[1] - a[1]);
  return counts.slice(0, 3).map((c) => c[0] + ' (' + c[1] + (c[1] === 1 ? ' vez' : ' veces') + ')').join(', ');
}
function triggersNow(extra) {
  const t = new Set(extra || []);
  const k = todayKey(), d = dayRec(k), m = mode();
  if (d.state) t.add(d.state);
  if (d.coherence) { if (d.coherence <= 4) t.add('low'); if (d.coherence >= 8) t.add('high'); }
  if ((d.redirects || 0) >= 3) t.add('redirect');
  if ((d.stops || 0) > 0) t.add('stopped');
  const pset = practiceSet();
  if (streak(pset) >= 3) t.add('streak');
  if (Object.keys(pset).length > 0 && !pset[k] && !pset[addDays(k, -1)]) t.add('gap');
  const ref = m === 'programa' ? S.profile.weekStart : keyOf(new Date(S.profile.createdAt || Date.now()));
  if (diffDays(k, ref) <= 1) t.add('start');
  if (patterns()) t.add('pattern');
  return t;
}
function pickIdea(tr, exclude) {
  const m = mode(), week = S.profile.week, now = Date.now(), k = todayKey();
  const today = S.profile.ideaToday;
  let best = null, bestScore = -1e9;
  IDEAS.forEach((i) => {
    if ((exclude || []).includes(i.id)) return;
    if (!i.m.includes(m)) return;
    let sc = 0;
    if (i.w.length) { if (m === 'programa' && !i.w.includes(week)) return; sc += 3; }
    i.t.forEach((x) => { if (tr.has(x)) sc += 4; });
    const seen = S.profile.seen[i.id];
    const isToday = today && today.k === k && today.id === i.id;
    if (seen && !isToday) sc -= (now - seen < 3 * 86400000) ? 6 : 1;
    sc += (hash(k + i.id) % 100) / 100;
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  return best;
}
function markSeen(i) {
  if (!i) return;
  const k = todayKey(), td = S.profile.ideaToday;
  if (td && td.k === k && td.id === i.id) return;
  S.profile.seen[i.id] = Date.now();
  S.profile.ideaToday = { k: k, id: i.id };
  const ids = Object.keys(S.profile.seen);
  if (ids.length > 60) {
    ids.sort((a, b) => S.profile.seen[a] - S.profile.seen[b]).slice(0, ids.length - 60).forEach((id) => { delete S.profile.seen[id]; });
  }
  pProfile();
}
function ideaHtml(i) {
  if (!i) return '';
  const lab = i.src === 'libro' ? 'Idea del libro, ' + i.r : i.r;
  return '<div class="idea"><p class="txt">' + esc(i.x) + '</p><p class="src">' + esc(lab) + '</p>' +
    '<button class="btn btn-quiet" data-act="idea-next">Otra idea</button></div>';
}
function paintIdea(force) {
  const slot = $('#idea-slot'); if (!slot) return;
  if (force || !ui.idea) ui.idea = pickIdea(triggersNow(), []);
  slot.innerHTML = ideaHtml(ui.idea);
  markSeen(ui.idea);
}

/* ---------- Vistas: piezas comunes ---------- */
const ICON = {
  hoy: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  practicar: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  bitacora: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  progreso: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  yo: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>'
};
const TABS = [['hoy', 'Hoy'], ['practicar', 'Practicar'], ['bitacora', 'Bitácora'], ['progreso', 'Progreso'], ['yo', 'Yo']];
function paintNav() {
  $('#nav').innerHTML = TABS.map((t) =>
    '<button class="tab" data-act="tab" data-tab="' + t[0] + '"' + (ui.tab === t[0] ? ' aria-current="page"' : '') + '>' +
    '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[t[0]] + '</svg><span>' + t[1] + '</span></button>').join('');
}
function paintModebar() {
  $('#modebar').innerHTML = Object.keys(MODES).map((id) =>
    '<button class="modebtn" data-act="mode" data-v="' + id + '" aria-pressed="' + (mode() === id) + '">' +
    '<img src="' + MODES[id].logo + '" alt=""><span>' + MODES[id].short + '</span></button>').join('');
}
function greeting() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Buenos días' : (h < 19 ? 'Buenas tardes' : 'Buenas noches');
  return g + (S.profile.name ? ', ' + esc(S.profile.name) : '');
}
function coherenceHtml() {
  const d = dayRec(todayKey());
  let out = '<section class="sect"><h2 class="h2">Tu coherencia de hoy</h2><p class="muted small">1 es disperso o reactivo y 10 es paz, gratitud y claridad.</p><div class="scale">';
  for (let i = 1; i <= 10; i++) out += '<button data-act="coh" data-v="' + i + '" aria-pressed="' + (d.coherence === i) + '" aria-label="Coherencia ' + i + '">' + i + '</button>';
  return out + '</div></section>';
}
const hClass = (s) => (s === 'pasado' ? 'h-pasado' : (s === 'futuro' ? 'h-futuro' : 'h-none'));
function planDayNow() {
  const p = S.profile.plan21; if (!p) return null;
  return Math.min(21, Math.max(1, diffDays(todayKey(), p.start) + 1));
}
function stepsUpTo(w) { return Math.max.apply(null, STEPS.filter((s) => s.w <= w).map((s) => s.n)); }

/* ---------- Vista: Hoy ---------- */
function vHoy() {
  const m = mode(), k = todayKey(), d = dayRec(k), w = S.profile.week;
  const longDate = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
  let out = '<header class="head"><h1 class="h1">' + greeting() + '</h1><p class="muted">' + esc(longDate) + '</p>' +
    '<p class="lead" style="margin-top:8px">' + esc(MODES[m].slogan) + '</p></header>';
  if (store.kind === 'demo') out += '<div class="notice" style="margin-top:14px">Modo demostración: tus datos se guardan solo en este dispositivo.</div>';

  if (m === 'programa') {
    out += '<div class="horizon ' + hClass(d.state) + '" id="horizon" role="img" aria-label="Amanecer que sube o baja según tu semáforo">' +
      '<svg viewBox="0 0 360 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
      '<g class="sun"><circle class="halo" cx="180" cy="104" r="46"/><circle class="disc" cx="180" cy="104" r="26"/></g>' +
      '<path class="hill1" d="M0 104 C50 92 90 100 140 96 C200 91 250 104 300 97 C330 93 350 98 360 96 V130 H0Z"/>' +
      '<path class="hill2" d="M0 118 C60 108 110 116 170 112 C230 108 290 118 360 110 V130 H0Z"/></svg></div>';
    out += '<section class="sect" style="margin-top:22px"><h2 class="h2">Tu semáforo de hoy</h2><p class="muted small">¿Desde dónde estás operando ahora?</p><div style="margin-top:12px">' +
      SEMAFORO.map((s) => '<button class="choice" data-act="state" data-v="' + s.v + '" aria-pressed="' + (d.state === s.v) + '">' +
        '<span class="dot" style="background:' + s.color + '"></span><span><b>' + esc(s.title) + '</b><span class="sub">' + esc(s.sub) + '</span></span></button>').join('') +
      '</div></section>';
  } else if (m === 'vacio') {
    out += '<div class="void" aria-hidden="true"><span>VACÍO</span></div>' +
      '<p class="muted center">Suelta tu nombre, tu historia y la hora.</p>' +
      '<div class="row" style="justify-content:center;margin-top:14px"><button class="btn btn-primary" data-act="go" data-tab="practicar">Entrar al vacío</button></div>';
  } else {
    out += '<div class="orb" aria-hidden="true"></div>' +
      '<p class="muted center">Siente la emoción primero; el resto la sigue.</p>';
  }

  out += coherenceHtml();
  out += '<section class="sect"><h2 class="h2">Idea para hoy</h2><div id="idea-slot" style="margin-top:10px"></div></section>';

  if (m === 'programa') {
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Semana ' + w + '</h2>' +
      '<p class="muted small">Hoy practicas ' + (stepsUpTo(w) === 1 ? 'el paso 1' : 'los pasos 1 a ' + stepsUpTo(w)) + '.</p>' +
      '<button class="btn btn-primary" style="margin-top:12px" data-act="go" data-tab="practicar">Ir a practicar</button></section>';
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Cuando aparezca el viejo yo</h2>' +
      '<p class="muted small">Atrapa un pensamiento o una emoción limitante, di ¡Cambia! y toca el botón.</p>' +
      '<div class="count" style="margin-top:12px"><span class="num" id="redir-count" aria-live="polite">' + d.redirects + '</span>' +
      '<button class="cambia" data-act="redirect">¡Cambia!</button>' +
      '<button class="btn btn-quiet" data-act="redirect-undo" aria-label="Restar una">Restar</button></div></section>';
    const frag = futureFragment();
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Mi yo del futuro</h2>';
    if (frag) out += '<p class="quote" style="margin-top:12px">' + esc(frag) + '</p><button class="btn btn-quiet" data-act="go" data-tab="bitacora">Editar mi declaración</button>';
    else out += '<p class="muted" style="margin-top:6px">Aún no escribiste tu declaración. Una frase al día de tu propio texto te recordará quién estás creando.</p>' +
      '<button class="btn" style="margin-top:10px" data-act="go" data-tab="bitacora">Escribir mi declaración</button>';
    out += '</section>';
  } else if (m === 'vacio') {
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Plan de 21 días</h2>' + planTodayHtml() + '</section>';
  } else {
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Gracias por hoy</h2>' +
      '<p class="muted small">Escribe tres cosas por las que sientes gratitud ahora.</p>' +
      '<label class="sr" for="gracias">Gratitudes de hoy</label>' +
      '<textarea id="gracias" rows="4" style="margin-top:10px" placeholder="Hoy agradezco…">' + esc(ui.drafts.gracias) + '</textarea>' +
      '<div class="row" style="margin-top:10px"><button class="btn btn-primary" data-act="save-gracias">Guardar</button>' +
      '<button class="btn" data-act="go" data-tab="practicar">Meditación del corazón</button></div></section>';
  }
  return out;
}
function futureFragment() {
  if (!S.profile.future) return '';
  const parts = (S.profile.future.match(/[^.!?\n]+[.!?]*/g) || []).map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return '';
  const start = new Date(new Date().getFullYear(), 0, 0);
  const doy = Math.floor((new Date() - start) / 86400000);
  return parts[doy % parts.length];
}
function planTodayHtml() {
  const p = S.profile.plan21;
  if (!p) return '<p class="muted small" style="margin-top:4px">Tres bloques de siete días: soltar, observar y ensayar. Una tarea corta por día.</p>' +
    '<button class="btn btn-primary" style="margin-top:12px" data-act="plan-start">Empezar hoy mi plan</button>';
  const n = planDayNow(), done = p.done.includes(n);
  const block = PLAN21_BLOCKS.filter((b) => n >= b.from && n <= b.to)[0];
  return '<p class="muted small">Día ' + n + ' de 21, bloque ' + esc(block.name) + '. Llevas ' + p.done.length + ' días hechos.</p>' +
    '<p class="lead" style="margin-top:8px">' + esc(PLAN21[n - 1]) + '</p>' +
    '<button class="btn ' + (done ? '' : 'btn-primary') + '" style="margin-top:12px" data-act="plan-done" data-day="' + n + '">' + (done ? 'Hecho, toca para deshacer' : 'Marcar como hecho') + '</button>';
}

/* ---------- Vista: Practicar ---------- */
const CIRC = 2 * Math.PI * 88;
function timerBlock(cfg) {
  // cfg: {chips:[...], startLabel, kind, label, clockToggle}
  if (timer) {
    const rem = Math.max(0, timer.end - Date.now());
    const frac = rem / (timer.min * 60000);
    return '<div class="timer' + (timer.noClock ? ' noclock' : '') + '"><svg class="ring" viewBox="0 0 200 200" aria-hidden="true"><circle class="ring-bg" cx="100" cy="100" r="88"/>' +
      '<circle class="ring-fg" id="t-ring" cx="100" cy="100" r="88" transform="rotate(-90 100 100)" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + (CIRC * (1 - frac)).toFixed(1) + '"/></svg>' +
      (timer.kind === 'corazon' ? '<div class="heart" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c2 0 3.3 1 4.2 2.3h3.6C14.7 6 16 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z"/></svg></div>' : '') +
      '<div class="tnum" id="t-big">' + fmtClock(rem) + '</div></div>' +
      '<p class="muted center" style="margin-top:8px">' + esc(timer.label) + '</p>' +
      '<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-act="timer-cancel">Cancelar sesión</button></div>';
  }
  let out = '<div class="chips" style="margin-top:10px">';
  cfg.chips.forEach((mn) => { out += '<button class="chip" data-act="chip-dur" data-v="' + mn + '" aria-pressed="' + (ui.dur === mn) + '">' + mn + ' min</button>'; });
  out += '</div><div class="row" style="margin-top:12px"><div style="width:130px"><label for="dur-input">Otra duración (min)</label>' +
    '<input id="dur-input" type="number" min="1" max="240" value="' + ui.dur + '"></div>' +
    '<button class="btn btn-primary" style="align-self:end" data-act="timer-start" data-kind="' + cfg.kind + '" data-label="' + esc(cfg.label) + '">' + esc(cfg.startLabel) + '</button></div>';
  if (cfg.clockToggle) out += '<label class="check" style="margin-top:12px"><input type="checkbox" id="noclock"' + (ui.noClock ? ' checked' : '') + '> Sin reloj: solo el círculo, sin números</label>';
  return out;
}
function linksHtml(kind) {
  const links = S.links.filter((l) => (l.kind || 'programa') === kind)
    .sort((a, b) => (a.week || 0) - (b.week || 0));
  let out = '';
  if (!links.length) {
    out += '<p class="notice calm" style="margin-top:12px">' + (kind === 'gratitud'
      ? 'Aún no hay audios. Pega el enlace directo a un archivo de audio (mp3, m4a) o a una página con tu audio.'
      : 'Aún no hay enlaces. Inicia sesión en el sitio oficial, copia el enlace de la meditación que ya tienes y pégalo abajo.') + '</p>';
  } else {
    out += '<ul class="list">';
    links.forEach((l) => {
      const sub = kind === 'programa' ? 'Semana ' + l.week + ', ' + l.minutes + ' min' : (l.minutes ? l.minutes + ' min' : '');
      out += '<li><div class="item"><div><div class="h3">' + esc(l.title) + '</div><div class="muted small">' + esc(sub) + '</div></div><div class="row">';
      if (isAudio(l.url)) out += '';
      else out += '<a class="btn btn-primary" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer" data-act="open-link" data-id="' + l.id + '">Abrir y empezar</a>';
      out += '<button class="btn btn-quiet" data-act="del-link" data-id="' + l.id + '">Quitar</button></div></div>';
      if (isAudio(l.url)) out += '<audio controls preload="none" src="' + esc(l.url) + '"></audio>';
      out += '</li>';
    });
    out += '</ul>';
  }
  out += '<div class="panel" style="margin-top:14px"><h3 class="h3">' + (kind === 'gratitud' ? 'Agregar un audio' : 'Agregar una meditación') + '</h3>' +
    '<div class="field"><label for="l-title">Nombre</label><input id="l-title" type="text" placeholder="' + (kind === 'gratitud' ? 'Ej.: Audio de gratitud' : 'Ej.: Meditación de la semana 2') + '"></div>' +
    '<div class="field"><label for="l-url">Enlace</label><input id="l-url" type="url" placeholder="https://"></div>' +
    '<div class="grid2 field">' + (kind === 'programa'
      ? '<div><label for="l-week">Semana</label><select id="l-week">' + [1, 2, 3, 4].map((w) => '<option value="' + w + '"' + (w === S.profile.week ? ' selected' : '') + '>Semana ' + w + '</option>').join('') + '</select></div>'
      : '<div></div>') +
    '<div><label for="l-min">Duración (min)</label><input id="l-min" type="number" min="1" max="240" value="' + (kind === 'programa' ? 30 : 10) + '"></div></div>' +
    '<p class="small err" id="l-msg" role="alert"></p>' +
    '<button class="btn btn-primary" data-act="add-link" data-kind="' + kind + '">Guardar enlace</button></div>';
  return out;
}
function laToDate(y, m, d, h) {
  const guess = Date.UTC(y, m, d, h, 0, 0);
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  const p = {}; f.formatToParts(new Date(guess)).forEach((x) => { p[x.type] = x.value; });
  const asLA = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return new Date(guess - (asLA - guess));
}
function nextLive() {
  try {
    const now = new Date();
    for (let add = 0; add < 3; add++) {
      const first = new Date(Date.UTC(now.getFullYear(), now.getMonth() + add, 1));
      const yy = first.getUTCFullYear(), mm = first.getUTCMonth();
      const last = new Date(Date.UTC(yy, mm + 1, 0));
      const day = last.getUTCDate() - ((last.getUTCDay() - 4 + 7) % 7);
      const dt = laToDate(yy, mm, day, 12);
      if (dt > now) return dt;
    }
  } catch (e) { /* sin Intl */ }
  return null;
}
function vPracticar() {
  const m = mode(), w = S.profile.week;
  let out = '<header class="head"><h1 class="h1">Practicar</h1></header>';

  if (m === 'programa') {
    out += '<section class="sect" style="margin-top:8px"><h2 class="h2">Sesión</h2><p class="muted small">Elige la duración y empieza cuando estés listo.</p>' +
      timerBlock({ chips: [20, 30, 45, 60], startLabel: 'Iniciar temporizador', kind: 'programa', label: 'Sesión de la semana ' + w }) + '</section>';
    const link = S.links.filter((l) => (l.kind || 'programa') === 'programa' && l.week === w)[0];
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Pasos de la semana ' + w + '</h2>' +
      '<p class="muted small">Cada sesión empieza con los pasos que ya aprendiste y suma los nuevos.</p>';
    const hint = (w < 4 && diffDays(todayKey(), S.profile.weekStart) >= 7)
      ? '<div class="notice calm" style="margin-top:14px"><p>Llevas 7 días o más en la semana ' + w + '. Avanza cuando conozcas los pasos de memoria; puedes tomarte más tiempo.</p>' +
        '<button class="btn" style="margin-top:10px" data-act="advance-week">Pasar a la semana ' + (w + 1) + '</button></div>' : '';
    out += hint + '<ol class="steps">';
    STEPS.forEach((s) => {
      const locked = s.w > w, isNew = s.w === w;
      out += '<li class="' + (locked ? 'locked' : '') + '"><span class="n">' + s.n + '</span><div><div><b>' + esc(s.name) + '</b>' +
        (isNew ? '<span class="tag">Nuevo esta semana</span>' : '') + (locked ? '<span class="muted small">, semana ' + s.w + '</span>' : '') +
        '</div><p class="muted small">' + esc(s.d) + '</p></div></li>';
    });
    out += '</ol>';
    if (!timer && link) out += '<a class="btn btn-primary btn-block" style="margin-top:14px" href="' + esc(link.url) + '" target="_blank" rel="noopener noreferrer" data-act="open-link" data-id="' + link.id + '">Abrir "' + esc(link.title) + '" y empezar (' + link.minutes + ' min)</a>';
    out += '</section>';

    const wk = IDEAS.filter((i) => i.m.includes('programa') && i.w.includes(w));
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Ideas de la semana ' + w + '</h2><p class="muted small">Del libro, con palabras propias. En Hoy verás la que mejor encaja con cómo vas.</p><div style="margin-top:8px">';
    wk.forEach((i) => { out += '<details class="hito"><summary>' + esc(i.x.split(/[.:]/)[0]) + '</summary><p>' + esc(i.x) + '</p><p class="muted small">En el libro: ' + esc(i.r) + '.</p></details>'; });
    out += '</div></section>';

    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Herramientas rápidas</h2>' +
      '<p class="muted small">Para cuando el viejo yo aparece en mitad del día.</p>' +
      '<div class="row" style="margin-top:12px"><button class="btn" data-act="pausa">Pausa de 1 minuto</button>' +
      '<button class="btn" data-act="anchor-start">Anclas 5-4-3-2-1</button></div>' + anchorHtml() + '</section>';

    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Mis meditaciones</h2>' +
      '<p class="muted small">Las meditaciones oficiales se reproducen en tu cuenta del sitio oficial. Aquí solo guardas el enlace exacto de las que ya tienes.</p>' +
      linksHtml('programa') +
      '<div class="row" style="margin-top:14px"><a class="btn" href="' + OFFICIAL_URL + '" target="_blank" rel="noopener noreferrer">Abrir el sitio oficial</a></div></section>';
    const live = nextLive();
    let liveTxt = '';
    if (live) { try { liveTxt = live.toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); } catch (e) { /* nada */ } }
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Conversación mensual en vivo</h2>' +
      '<p class="muted small" style="margin-top:4px">Normalmente el último jueves de cada mes a las 12 p. m. hora del Pacífico de EE. UU. La fecha puede cambiar, confírmala en el sitio.</p>' +
      (liveTxt ? '<p class="lead" style="margin-top:8px">' + esc(liveTxt) + '</p>' : '') +
      '<a class="btn" style="margin-top:10px" href="' + LIVE_URL + '" target="_blank" rel="noopener noreferrer">Ver la página</a></section>';
  } else if (m === 'vacio') {
    out += '<section class="sect" style="margin-top:8px"><h2 class="h2">Sesión de vacío</h2>' +
      '<p class="muted small">Suelta tu nombre. Suelta tu historia. Suelta la hora.</p>' +
      timerBlock({ chips: [5, 10, 15, 20, 30], startLabel: 'Entrar al vacío', kind: 'vacio', label: 'Sesión de vacío', clockToggle: true }) + '</section>';
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Ejercicios anti-tiempo lineal</h2>' +
      '<p class="muted small">Prácticas cortas para salir del pasado y del futuro.</p><div style="margin-top:8px">';
    EXERCISES.forEach((e) => {
      out += '<details class="ex"><summary>' + esc(e.name) + ', ' + e.min + ' min</summary><ol>' + e.steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
        (timer ? '' : '<button class="btn" data-act="exercise" data-id="' + e.id + '">Hacerlo ahora</button>') + '</details>';
    });
    out += '</div></section>';
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Plan de 21 días</h2>' + planGridHtml() + '</section>';
  } else {
    out += '<section class="sect" style="margin-top:8px"><h2 class="h2">Meditación del corazón</h2>' +
      '<p class="muted small">Lleva la atención al centro del pecho y respira lento. Evoca gratitud por algo real de hoy; luego, por algo que aún no llega, como si ya estuviera.</p>' +
      timerBlock({ chips: [5, 10, 15, 20], startLabel: 'Empezar', kind: 'corazon', label: 'Meditación del corazón' }) + '</section>';
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Hecho está</h2>' +
      '<p class="muted small">Escribe algo que deseas como si ya hubiera ocurrido, empezando por "Gracias porque ya…". Luego siéntelo unos minutos.</p>' +
      '<label class="sr" for="hecho">Hecho está</label>' +
      '<textarea id="hecho" rows="4" style="margin-top:10px" placeholder="Gracias porque ya…">' + esc(ui.drafts.hecho) + '</textarea>' +
      '<div class="row" style="margin-top:10px"><button class="btn btn-primary" data-act="save-hecho">Guardar</button>' +
      (timer ? '' : '<button class="btn" data-act="sentir">Sentirlo 3 minutos</button>') + '</div></section>';
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Mis audios</h2>' +
      '<p class="muted small">Guarda tus audios de gratitud y reprodúcelos aquí.</p>' + linksHtml('gratitud') + '</section>';
  }
  return out;
}
function anchorHtml() {
  if (ui.anchor < 0) return '';
  if (ui.anchor >= ANCHORS.length) {
    return '<div class="notice calm" style="margin-top:14px"><p class="h3">Listo</p><p class="small">Volviste al presente. Respira una vez más y sigue.</p>' +
      '<button class="btn btn-quiet" data-act="anchor-close">Cerrar</button></div>';
  }
  const a = ANCHORS[ui.anchor];
  return '<div class="panel" style="margin-top:14px"><p class="muted small">Paso ' + (ui.anchor + 1) + ' de 5</p><p class="h2" style="margin-top:4px">' + esc(a.t) + '</p>' +
    '<button class="btn btn-primary" style="margin-top:12px" data-act="anchor-next">Siguiente</button></div>';
}
function planGridHtml() {
  const p = S.profile.plan21;
  if (!p) return planTodayHtml();
  const n = planDayNow();
  let out = planTodayHtml() + '<div class="plan" role="group" aria-label="Días del plan">';
  for (let i = 1; i <= 21; i++) {
    const cls = (p.done.includes(i) ? 'done ' : '') + (i === n ? 'today ' : '') + (i > n ? 'future' : '');
    out += '<button class="' + cls + '" data-act="plan-done" data-day="' + i + '"' + (i > n ? ' disabled' : '') + ' aria-label="Día ' + i + (p.done.includes(i) ? ', hecho' : '') + '">' + i + '</button>';
  }
  out += '</div><button class="btn btn-quiet" style="margin-top:10px" data-act="plan-reset">Reiniciar plan</button>';
  return out;
}

/* ---------- Vista: Bitácora ---------- */
function vBitacora() {
  const m = mode(), phases = PHASES[m];
  if (!ui.draftPhase || !phases.some((p) => p.id === ui.draftPhase)) ui.draftPhase = phases[phases.length > 3 ? 3 : 0].id;
  const ph = phases.filter((p) => p.id === ui.draftPhase)[0];
  let out = '<header class="head"><h1 class="h1">Bitácora</h1><p class="muted">Escribir fija lo que vives. Revisa tus notas antes de tu próxima sesión.</p></header>';
  const pat = patterns();
  if (pat) out += '<div class="notice" style="margin-top:16px"><p class="h3">Un patrón de esta semana</p><p style="margin-top:4px">En los últimos 7 días apareció ' + esc(pat) +
    '. Notarlo ya es avanzar: cuando surja, nómbralo, di ¡Cambia! y lleva la atención a tu yo del futuro. Si estos sentimientos te desbordan, hablar con un profesional de salud mental también es parte del camino.</p></div>';
  if (ui.safety) out += '<div class="notice calm" style="margin-top:16px"><p class="h3">Lo que escribes importa</p><p style="margin-top:4px">Si estás pensando en hacerte daño, contacta ahora a los servicios de emergencia de tu país o a una persona de confianza. No tienes que pasar por esto solo.</p></div>';
  if (ui.entryIdea) out += '<div style="margin-top:16px">' + ideaHtml(ui.entryIdea) + '</div>';

  out += '<section class="sect"><h2 class="h2">Nueva entrada</h2><div class="chips" style="margin-top:10px">';
  phases.forEach((p) => { out += '<button class="chip" data-act="phase" data-v="' + p.id + '" aria-pressed="' + (p.id === ui.draftPhase) + '">' + esc(p.label) + '</button>'; });
  out += '</div><p class="lead" style="margin-top:14px">' + esc(ph.q) + '</p>' +
    '<label class="sr" for="entry">Tu respuesta</label>' +
    '<textarea id="entry" rows="6" maxlength="8000" style="margin-top:10px" placeholder="Escribe con detalle…">' + esc(ui.drafts.entry) + '</textarea>' +
    '<button class="btn btn-primary" style="margin-top:10px" data-act="save-entry">Guardar entrada</button></section>';

  if (m === 'programa') {
    out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Mi yo del futuro</h2>' +
      '<p class="muted small">Escribe tu nueva declaración de vida. Cada día verás una frase suya en Hoy.</p>' +
      '<label class="sr" for="future">Declaración</label>' +
      '<textarea id="future" rows="4" maxlength="3000" style="margin-top:10px" placeholder="Soy una persona que…">' + esc(S.profile.future) + '</textarea>' +
      '<div class="row" style="margin-top:10px"><button class="btn" data-act="save-future">Guardar declaración</button><span class="muted small" id="future-msg" role="status"></span></div></section>';
  }

  const list = S.entries.filter((e) => ui.allEntries || (e.mode || 'programa') === m);
  out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Mis entradas</h2>' +
    '<div class="chips" style="margin-top:8px"><button class="chip" data-act="entries-scope" data-v="mode" aria-pressed="' + (!ui.allEntries) + '">De este modo</button>' +
    '<button class="chip" data-act="entries-scope" data-v="all" aria-pressed="' + ui.allEntries + '">Todas</button></div>';
  if (!list.length) out += '<p class="muted" style="margin-top:10px">Todavía no hay entradas aquí. Después de tu próxima práctica, escribe qué notaste.</p>';
  else {
    out += '<ul class="list">';
    list.slice(0, ui.shownEntries).forEach((e) => {
      const p = phaseById(e.phase);
      const when = new Date(e.ts).toLocaleString('es', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      out += '<li class="entry"><div class="meta"><span>' + esc(when) + ', ' + (p ? esc(p.label) : '') + '</span><button class="btn btn-quiet" data-act="del-entry" data-id="' + e.id + '">Borrar</button></div><p>' + esc(e.text) + '</p></li>';
    });
    out += '</ul>';
    if (list.length > ui.shownEntries) out += '<button class="btn" data-act="more-entries">Mostrar más</button>';
  }
  return out + '</section>';
}

/* ---------- Vista: Progreso ---------- */
function chartCoh() {
  const N = 30, W = 340, H = 170, pl = 28, pr = 10, pt = 10, pb = 24, end = todayKey(), pts = [];
  for (let i = 0; i < N; i++) { const k = addDays(end, -(N - 1 - i)); const c = dayRec(k).coherence; if (c) pts.push({ i: i, c: c }); }
  if (!pts.length) return '<p class="muted" style="margin-top:8px">Registra tu coherencia en Hoy para ver tu curva.</p>';
  const x = (i) => pl + (W - pl - pr) * i / (N - 1), y = (c) => pt + (H - pt - pb) * (1 - (c - 1) / 9);
  let g = '';
  [1, 5, 10].forEach((v) => { g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)" stroke-width="1"/><text x="' + (pl - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>'; });
  const path = pts.map((p, j) => (j ? 'L' : 'M') + x(p.i).toFixed(1) + ' ' + y(p.c).toFixed(1)).join(' ');
  const dots = pts.map((p) => '<circle cx="' + x(p.i).toFixed(1) + '" cy="' + y(p.c).toFixed(1) + '" r="3.5" fill="var(--accent)"/>').join('');
  const first = parseKey(addDays(end, -(N - 1))).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Curva de coherencia de los últimos 30 días">' + g +
    '<path d="' + path + '" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' + dots +
    '<text x="' + pl + '" y="' + (H - 6) + '">' + esc(first) + '</text><text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end">hoy</text></svg>';
}
function vProgreso() {
  const pset = practiceSet(), st = streak(pset);
  const rset = {}; Object.keys(S.days).forEach((k) => { if (S.days[k].redirects > 0) rset[k] = 1; });
  const rst = streak(rset);
  let sessions = 0, mins = 0, reds = 0;
  Object.keys(S.days).forEach((k) => { const d = S.days[k]; (d.sessions || []).forEach((s) => { sessions++; mins += s.min; }); reds += d.redirects || 0; });
  const eDays = {}; S.entries.forEach((e) => { eDays[keyOf(new Date(e.ts))] = 1; });
  const entryDays = Object.keys(eDays).length;
  let f = 0, p = 0, o = 0;
  for (let i = 0; i < 14; i++) { const d = dayRec(addDays(todayKey(), -i)); if (d.state === 'futuro') f++; else if (d.state === 'pasado') p++; else if (d.state === 'observando') o++; }
  const plan = S.profile.plan21;
  let out = '<header class="head"><h1 class="h1">Progreso</h1><p class="muted">Tu constancia y cómo se mueve tu estado.</p></header>';
  out += '<section class="sect"><div class="stats">' +
    '<div class="stat"><b>' + st + '</b><span>días seguidos de práctica</span></div>' +
    '<div class="stat"><b>' + rst + '</b><span>días seguidos diciendo ¡Cambia!</span></div>' +
    '<div class="stat"><b>' + sessions + '</b><span>sesiones (' + mins + ' min)</span></div>' +
    '<div class="stat"><b>' + reds + '</b><span>veces que redirigiste</span></div>' +
    (plan ? '<div class="stat"><b>' + plan.done.length + '/21</b><span>días del plan de vacío</span></div>' : '') + '</div>' +
    '<p class="muted small" style="margin-top:10px">Cuenta como práctica un día con sesión, entrada en la bitácora o ¡Cambia!.</p></section>';
  out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Coherencia, últimos 30 días</h2>' + chartCoh() + '</section>';
  out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Tu semáforo</h2>';
  if (f + p + o === 0) out += '<p class="muted" style="margin-top:6px">Elige tu semáforo en Hoy (modo RePrograma) para ver el balance de las últimas dos semanas.</p>';
  else {
    const tot = f + p + o;
    out += '<p class="muted small">Últimos 14 días: ' + f + ' en verde, ' + o + ' en amarillo y ' + p + ' en rojo.</p>' +
      '<div class="bar" role="img" aria-label="Balance del semáforo"><i style="width:' + (100 * f / tot) + '%;background:#30C48D"></i><i style="width:' + (100 * o / tot) + '%;background:#F5B301"></i><i style="width:' + (100 * p / tot) + '%;background:#E5484D"></i></div>';
  }
  out += '</section><hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Hitos de aprendizaje</h2>' +
    '<p class="muted small">Se desbloquean con días en los que escribes en la bitácora. Llevas ' + entryDays + '.</p><div style="margin-top:8px">';
  MILESTONES.forEach((ms) => {
    if (entryDays >= ms.days) out += '<details class="hito"><summary>' + esc(ms.t) + '</summary><p>' + esc(ms.b) + '</p><p class="muted small">En el libro: ' + esc(ms.ref) + '.</p></details>';
    else out += '<div class="hito locked">Se desbloquea con ' + ms.days + ' días de bitácora. Te faltan ' + (ms.days - entryDays) + '.</div>';
  });
  return out + '</div></section>';
}

/* ---------- Vista: Yo ---------- */
function vYo() {
  const p = S.profile;
  let out = '<header class="head"><h1 class="h1">Yo</h1>' + (user && user.email ? '<p class="muted">' + esc(user.email) + '</p>' : '') + '</header>';
  out += '<section class="sect"><div class="field"><label for="set-name">Tu nombre</label><input id="set-name" type="text" maxlength="80" value="' + esc(p.name) + '" autocomplete="given-name"></div>' +
    '<div class="field"><label for="set-week">Semana del programa</label><select id="set-week">' + [1, 2, 3, 4].map((w) => '<option value="' + w + '"' + (w === p.week ? ' selected' : '') + '>Semana ' + w + '</option>').join('') + '</select>' +
    '<p class="muted small" style="margin-top:4px">Practica cada grupo de pasos al menos una semana y avanza a tu ritmo.</p></div></section>';
  out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Tus datos</h2>' +
    '<p class="muted small">' + (store.kind === 'cloud' ? 'Se guardan en tu cuenta y solo tú puedes leerlos.' : 'Modo demostración: se guardan solo en este navegador.') + '</p>' +
    '<div class="row" style="margin-top:10px"><button class="btn" data-act="download">Descargar mis datos</button>' +
    '<button class="btn" data-act="signout">' + (store.kind === 'cloud' ? 'Cerrar sesión' : 'Salir del modo demo') + '</button></div></section>';
  out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Eliminar</h2>' +
    '<p class="muted small">Borra todas tus entradas, registros y enlaces' + (store.kind === 'cloud' ? ' y elimina tu cuenta' : '') + '. No se puede deshacer.</p>' +
    '<button class="btn" style="margin-top:10px" data-act="wipe">Eliminar mis datos</button>' +
    '<p class="err" id="wipe-msg" role="alert"></p></section>';
  out += '<hr class="rule"><section class="sect" style="margin-top:28px"><h2 class="h2">Acerca de RePrograma</h2>' +
    '<p class="muted small" style="margin-top:4px">Sigue la estructura de cuatro semanas descrita en el libro <i>Deja de ser tú</i> de Joe Dispenza. Es una herramienta independiente, sin afiliación con el autor ni con su organización. Los textos son propios y las ideas del libro están parafraseadas. No ofrece asesoramiento médico ni psicológico.</p>' +
    '<p class="muted small" style="margin-top:8px">Para tenerla como app: en el navegador del celular usa "Agregar a pantalla de inicio".</p></section>';
  return out;
}

/* ---------- Render ---------- */
const VIEWS = { hoy: vHoy, practicar: vPracticar, bitacora: vBitacora, progreso: vProgreso, yo: vYo };
function render() {
  $('#view').innerHTML = VIEWS[ui.tab]();
  paintNav(); paintModebar(); paintTimerBar(true);
  if (ui.tab === 'hoy') paintIdea(false);
}
function captureDrafts() {
  ['entry', 'hecho', 'gracias'].forEach((id) => { const el = $('#' + id); if (el) ui.drafts[id] = el.value; });
}
function go(t) { captureDrafts(); ui.tab = t; ui.entryIdea = null; ui.safety = false; render(); window.scrollTo(0, 0); }

/* ---------- Pantallas de acceso ---------- */
function show(id, on) { const el = $('#' + id); if (el) el.hidden = !on; }
function showLoading() { show('auth', false); show('shell', false); show('loading', true); }
function showApp() { show('loading', false); show('auth', false); show('shell', true); render(); if (timer) { ensureTick(); tick(); } }
const AUTH_ERRORS = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'Ese correo no parece válido.',
  'auth/email-already-in-use': 'Ese correo ya tiene una cuenta. Prueba entrar.',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase (Authentication > Configuración > Dominios autorizados).',
  'auth/operation-not-allowed': 'Este método de acceso no está activado en Firebase (Authentication > Método de acceso).'
};
function showAuth() {
  applyMode('programa');
  show('loading', false); show('shell', false); show('auth', true);
  const demo = store.kind === 'demo';
  const signup = ui.authMode === 'signup';
  let h = '<div class="auth"><img class="logo" src="logo-reprograma-1024.png" alt="RePrograma"><h1 class="h1">RePrograma</h1>' +
    '<p class="lead muted" style="margin-top:6px">' + esc(MODES.programa.slogan) + '</p>';
  if (demo) {
    h += '<div class="notice" style="margin-top:20px;text-align:left"><p class="h3">Modo demostración</p>' +
      '<p class="small">Firebase todavía no está configurado en <b>config.js</b>. Puedes probar la app: tus datos se guardan solo en este dispositivo.</p></div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:14px" data-act="demo">Entrar en modo demostración</button>';
  } else {
    h += '<div class="switch"><button class="chip" data-act="auth-mode" data-v="signin" aria-pressed="' + (!signup) + '">Entrar</button>' +
      '<button class="chip" data-act="auth-mode" data-v="signup" aria-pressed="' + signup + '">Crear cuenta</button></div>' +
      '<form id="auth-form" novalidate>' +
      (signup ? '<div class="field"><label for="a-name">Tu nombre</label><input id="a-name" type="text" autocomplete="given-name" maxlength="80"></div>' : '') +
      '<div class="field"><label for="a-email">Correo</label><input id="a-email" type="email" autocomplete="email" inputmode="email"></div>' +
      '<div class="field"><label for="a-pass">Contraseña</label><input id="a-pass" type="password" autocomplete="' + (signup ? 'new-password' : 'current-password') + '"></div>' +
      '<p class="err" id="a-err" role="alert">' + esc(ui.authErr) + '</p>' +
      '<button class="btn btn-primary btn-block" type="submit">' + (signup ? 'Crear cuenta' : 'Entrar') + '</button>' +
      (CONFIG.enableGoogleLogin ? '<button class="btn btn-block" type="button" style="margin-top:10px" data-act="google">Continuar con Google</button>' : '') +
      (!signup ? '<button class="btn btn-quiet btn-block" type="button" data-act="reset-pass">Olvidé mi contraseña</button>' : '') +
      '</form>';
  }
  $('#auth').innerHTML = h + '<p class="foot">Tus datos son privados: solo tú puedes leerlos.</p></div>';
}
async function onAuth(u) {
  user = u;
  if (!u) { stopTick(); timer = null; saveTimer(); S = { profile: null, days: {}, entries: [], links: [] }; showAuth(); return; }
  showLoading();
  try {
    const data = await store.loadAll();
    S.days = data.days || {}; S.entries = data.entries || []; S.links = data.links || [];
    if (data.profile) S.profile = Object.assign(newProfile(''), data.profile);
    else { S.profile = newProfile(ui.pendingName || u.name || (u.email ? u.email.split('@')[0] : '')); pProfile(); }
    if (!S.profile.seen) S.profile.seen = {};
    ui.pendingName = '';
  } catch (e) {
    console.error(e);
    $('#loading').innerHTML = '<div class="center" style="padding:24px"><p>No pudimos cargar tus datos.</p><p class="muted small">Revisa tu conexión y que las reglas de Firestore estén publicadas.</p><button class="btn" style="margin-top:12px" onclick="location.reload()">Reintentar</button></div>';
    return;
  }
  applyMode(S.profile.mode);
  ui.tab = 'hoy'; ui.idea = null; ui.dur = defaultDur(S.profile.mode);
  showApp();
}

/* ---------- Temporizador ---------- */
let tickId = null, lastSig = '';
function ensureTick() { if (!tickId) tickId = setInterval(tick, 1000); }
function stopTick() { if (tickId) { clearInterval(tickId); tickId = null; } }
function startTimer(min, label, kind, noClock) {
  min = Math.max(1, Math.min(240, Math.round(+min || 10)));
  timer = { end: Date.now() + min * 60000, min: min, label: label || 'Sesión', kind: kind || 'libre', noClock: !!noClock };
  saveTimer();
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) { /* nada */ }
  ensureTick();
  if (ui.tab === 'practicar' || ui.tab === 'hoy') render(); else paintTimerBar(true);
}
function tick() {
  if (!timer) { stopTick(); return; }
  const rem = timer.end - Date.now();
  if (rem <= 0) { finishTimer(); return; }
  paintTimerBar();
  const big = $('#t-big'); if (big) big.textContent = fmtClock(rem);
  const ring = $('#t-ring'); if (ring) ring.setAttribute('stroke-dashoffset', (CIRC * (1 - rem / (timer.min * 60000))).toFixed(1));
}
const KIND_PHASE = { programa: 'despues', vacio: 'vacio-despues', ejercicio: 'vacio-despues', corazon: 'corazon', hecho: 'hecho', libre: null };
function finishTimer() {
  const t = timer; if (!t) return;
  timer = null; saveTimer(); stopTick();
  const k = todayKey(), d = dayW(k);
  d.sessions.push({ min: t.min, at: Date.now(), label: t.label, kind: t.kind, mode: mode() });
  pDay(k);
  chime();
  try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* nada */ }
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Sesión completada', { body: 'Registra tu experiencia antes de que la mente analítica regrese.' }); } catch (e) { /* nada */ }
  if (t.kind === 'pausa') { toast('Pausa completa. Vuelves al presente.'); render(); return; }
  ui.notice = { min: t.min, kind: t.kind, idea: pickIdea(triggersNow(['after-session']), []) };
  if (ui.notice.idea) markSeen(ui.notice.idea);
  render();
}
function paintTimerBar(force) {
  const el = $('#timerbar'); if (!el) return;
  const sig = timer ? 'run' : (ui.notice ? 'done' : 'none');
  if (sig !== lastSig || force) {
    lastSig = sig;
    if (sig === 'run') {
      el.innerHTML = '<div class="tbar"><span>' + esc(timer.label) + ' <b id="tb-time">' + (timer.noClock ? '' : fmtClock(timer.end - Date.now())) + '</b></span><button class="btn" data-act="timer-cancel">Cancelar</button></div>';
    } else if (sig === 'done') {
      const n = ui.notice, ph = KIND_PHASE[n.kind];
      el.innerHTML = '<div class="notice calm"><p class="h3">Sesión completada: ' + n.min + ' min</p>' +
        '<p class="small" style="margin-top:2px">Registra tu experiencia antes de que la mente analítica regrese.</p>' +
        (n.idea ? '<div style="margin-top:10px">' + ideaHtml(n.idea).replace('<button class="btn btn-quiet" data-act="idea-next">Otra idea</button>', '') + '</div>' : '') +
        '<div class="row" style="margin-top:10px">' + (ph ? '<button class="btn btn-primary" data-act="done-write" data-phase="' + ph + '">Escribir mi experiencia</button>' : '') +
        '<button class="btn btn-quiet" data-act="done-undo">Deshacer registro</button><button class="btn btn-quiet" data-act="done-close">Cerrar</button></div></div>';
    } else el.innerHTML = '';
  } else if (sig === 'run') {
    const t = $('#tb-time'); if (t && !timer.noClock) t.textContent = fmtClock(timer.end - Date.now());
  }
}
function chime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = new AC();
    [528, 792].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + i * 0.6;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.25, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.4);
      o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 2.5);
    });
  } catch (e) { /* sin audio */ }
}

/* ---------- Confirmación en dos toques ---------- */
let armed = null;
function twice(b, label, fn) {
  if (armed && armed.el === b) { clearTimeout(armed.t); armed = null; fn(); return; }
  if (armed) { clearTimeout(armed.t); armed.el.textContent = armed.orig; armed = null; }
  const orig = b.textContent;
  armed = { el: b, orig: orig, t: setTimeout(() => { if (armed && armed.el === b) { b.textContent = orig; armed = null; } }, 3500) };
  b.textContent = label;
}
const setMsg = (sel, txt) => { const e = $(sel); if (e) e.textContent = txt; };
const CRISIS = /suicid|quitarme la vida|no quiero vivir|hacerme dano|matarme|autolesi/;

function saveEntryText(phase, text) {
  const e = { id: uid(), ts: Date.now(), phase: phase, mode: mode(), text: text.trim().slice(0, 8000) };
  if (!e.text) return null;
  S.entries.unshift(e);
  try { store.addEntry(e).catch(fail); } catch (err) { fail(err); }
  ui.safety = CRISIS.test(norm(e.text));
  return e;
}

/* ---------- Acciones ---------- */
const A = {
  tab: (b) => go(b.dataset.tab),
  go: (b) => go(b.dataset.tab),
  demo: () => store.signInDemo(),
  'auth-mode': (b) => { ui.authMode = b.dataset.v; ui.authErr = ''; showAuth(); },
  google: async () => {
    try { await store.signInGoogle(); } catch (e) { if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') setMsg('#a-err', AUTH_ERRORS[e.code] || 'No se pudo entrar con Google.'); }
  },
  'reset-pass': async () => {
    const email = ($('#a-email') || {}).value || '';
    if (!email.trim()) { setMsg('#a-err', 'Escribe tu correo arriba y vuelve a tocar.'); return; }
    try { await store.resetPassword(email.trim()); setMsg('#a-err', 'Te enviamos un correo para restablecer la contraseña.'); }
    catch (e) { setMsg('#a-err', AUTH_ERRORS[e.code] || 'No se pudo enviar el correo.'); }
  },
  mode: (b) => {
    captureDrafts();
    S.profile.mode = b.dataset.v; applyMode(S.profile.mode); pProfile();
    ui.idea = null; ui.draftPhase = null; ui.entryIdea = null; ui.dur = defaultDur(S.profile.mode);
    render();
  },
  state: (b) => {
    const k = todayKey(), d = dayW(k); d.state = b.dataset.v; pDay(k);
    const h = $('#horizon'); if (h) h.className = 'horizon ' + hClass(d.state);
    document.querySelectorAll('[data-act="state"]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === d.state)));
    paintIdea(true);
  },
  coh: (b) => {
    const k = todayKey(), d = dayW(k); d.coherence = +b.dataset.v; pDay(k);
    document.querySelectorAll('[data-act="coh"]').forEach((x) => x.setAttribute('aria-pressed', String(+x.dataset.v === d.coherence)));
    paintIdea(true);
  },
  redirect: () => { const k = todayKey(), d = dayW(k); d.redirects++; pDay(k); setMsg('#redir-count', d.redirects); paintIdea(true); },
  'redirect-undo': () => { const k = todayKey(), d = dayW(k); d.redirects = Math.max(0, d.redirects - 1); pDay(k); setMsg('#redir-count', d.redirects); },
  'idea-next': () => {
    const cur = ui.idea ? [ui.idea.id] : [];
    const slot = $('#idea-slot');
    const tr = triggersNow(slot ? [] : ['after-entry']);
    const nxt = pickIdea(tr, cur);
    if (slot) { ui.idea = nxt; slot.innerHTML = ideaHtml(nxt); markSeen(nxt); }
    else { ui.entryIdea = nxt; render(); }
  },
  'advance-week': () => { S.profile.week = Math.min(4, S.profile.week + 1); S.profile.weekStart = todayKey(); ui.idea = null; pProfile(); render(); },
  'chip-dur': (b) => { ui.dur = +b.dataset.v; render(); },
  'timer-start': (b) => {
    const v = $('#dur-input'); if (v) ui.dur = Math.max(1, Math.min(240, +v.value || 10));
    const nc = $('#noclock'); ui.noClock = nc ? nc.checked : false;
    startTimer(ui.dur, b.dataset.label, b.dataset.kind, b.dataset.kind === 'vacio' && ui.noClock);
  },
  exercise: (b) => { const e = EXERCISES.filter((x) => x.id === b.dataset.id)[0]; if (e) startTimer(e.min, 'Ejercicio: ' + e.name, 'ejercicio', false); },
  sentir: () => startTimer(3, 'Sintiendo "Hecho está"', 'hecho', false),
  pausa: () => startTimer(1, 'Pausa de 1 minuto', 'pausa', false),
  'anchor-start': () => { ui.anchor = 0; render(); },
  'anchor-next': () => { ui.anchor++; render(); },
  'anchor-close': () => { ui.anchor = -1; render(); },
  'open-link': (b) => {
    const l = S.links.filter((x) => x.id === b.dataset.id)[0];
    if (l) startTimer(l.minutes || 30, l.title, 'programa', false);
  },
  'timer-cancel': () => {
    const t = timer; timer = null; saveTimer(); stopTick();
    if (t && t.kind !== 'pausa') { const k = todayKey(), d = dayW(k); d.stops++; pDay(k); }
    render();
  },
  'done-write': (b) => { ui.notice = null; ui.draftPhase = b.dataset.phase; go('bitacora'); },
  'done-undo': () => { const k = todayKey(); dayW(k).sessions.pop(); pDay(k); ui.notice = null; render(); },
  'done-close': () => { ui.notice = null; paintTimerBar(true); },
  'add-link': (b) => {
    const kind = b.dataset.kind;
    const title = $('#l-title').value.trim(), url = $('#l-url').value.trim();
    const week = $('#l-week') ? +$('#l-week').value : 0, min = Math.max(1, Math.min(240, +$('#l-min').value || 10));
    let ok = false; try { const u = new URL(url); ok = (u.protocol === 'https:' || u.protocol === 'http:'); } catch (e) { /* inválida */ }
    if (!title) { setMsg('#l-msg', 'Escribe un nombre para reconocerla.'); return; }
    if (!ok) { setMsg('#l-msg', 'El enlace debe empezar con https://'); return; }
    const l = { id: uid(), title: title.slice(0, 120), url: url.slice(0, 2000), week: week, minutes: min, kind: kind };
    S.links.push(l);
    try { store.addLink(l).catch(fail); } catch (e) { fail(e); }
    render();
  },
  'del-link': (b) => twice(b, '¿Quitar?', () => {
    S.links = S.links.filter((l) => l.id !== b.dataset.id);
    try { store.removeLink(b.dataset.id).catch(fail); } catch (e) { fail(e); }
    render();
  }),
  phase: (b) => { captureDrafts(); ui.draftPhase = b.dataset.v; render(); },
  'save-entry': () => {
    captureDrafts();
    const e = saveEntryText(ui.draftPhase, ui.drafts.entry);
    if (!e) return;
    ui.drafts.entry = '';
    ui.entryIdea = pickIdea(triggersNow(['after-entry']), []);
    if (ui.entryIdea) markSeen(ui.entryIdea);
    render();
  },
  'save-gracias': () => {
    captureDrafts();
    const e = saveEntryText('gracias', ui.drafts.gracias);
    if (!e) return;
    ui.drafts.gracias = ''; toast('Guardado en tu bitácora.'); render();
  },
  'save-hecho': () => {
    captureDrafts();
    const e = saveEntryText('hecho', ui.drafts.hecho);
    if (!e) return;
    ui.drafts.hecho = ''; toast('Guardado en tu bitácora.'); render();
  },
  'del-entry': (b) => twice(b, '¿Borrar?', () => {
    S.entries = S.entries.filter((e) => e.id !== b.dataset.id);
    try { store.removeEntry(b.dataset.id).catch(fail); } catch (e) { fail(e); }
    render();
  }),
  'more-entries': () => { ui.shownEntries += 15; render(); },
  'entries-scope': (b) => { captureDrafts(); ui.allEntries = b.dataset.v === 'all'; render(); },
  'save-future': () => { S.profile.future = $('#future').value.trim().slice(0, 3000); pProfile(); setMsg('#future-msg', 'Guardada. La verás en Hoy.'); },
  'plan-start': () => { S.profile.plan21 = { start: todayKey(), done: [] }; pProfile(); render(); },
  'plan-done': (b) => {
    const p = S.profile.plan21; if (!p) return;
    const n = +b.dataset.day, i = p.done.indexOf(n);
    if (i >= 0) p.done.splice(i, 1); else p.done.push(n);
    p.done.sort((a, c) => a - c); pProfile(); render();
  },
  'plan-reset': (b) => twice(b, 'Toca de nuevo para reiniciar', () => { S.profile.plan21 = null; pProfile(); render(); }),
  download: () => {
    const blob = new Blob([JSON.stringify({ profile: S.profile, days: S.days, entries: S.entries, links: S.links }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'reprograma-datos.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  signout: async () => { try { await store.signOut(); } catch (e) { fail(e); } },
  wipe: (b) => twice(b, 'Toca de nuevo para eliminar todo', async () => {
    try { await store.deleteAccount(); }
    catch (e) {
      if (e && e.code === 'auth/requires-recent-login') setMsg('#wipe-msg', 'Tus datos se borraron. Para eliminar también la cuenta, cierra sesión, vuelve a entrar y repite.');
      else { console.error(e); setMsg('#wipe-msg', 'No se pudo eliminar. Inténtalo de nuevo.'); }
    }
  })
};

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const fn = A[b.dataset.act]; if (fn) fn(b, e);
});
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'auth-form') return;
  e.preventDefault();
  const email = $('#a-email').value.trim(), pass = $('#a-pass').value, signup = ui.authMode === 'signup';
  const name = signup ? ($('#a-name').value || '').trim() : '';
  if (!email || !pass) { setMsg('#a-err', 'Completa tu correo y tu contraseña.'); return; }
  setMsg('#a-err', '');
  try {
    if (signup) { ui.pendingName = name; await store.signUp(name, email, pass); }
    else await store.signIn(email, pass);
  } catch (err) { ui.authErr = AUTH_ERRORS[err.code] || 'No se pudo completar. Inténtalo de nuevo.'; setMsg('#a-err', ui.authErr); }
});
document.addEventListener('input', (e) => {
  const id = e.target.id;
  if (id === 'entry' || id === 'hecho' || id === 'gracias') ui.drafts[id] = e.target.value;
  if (id === 'set-name') { S.profile.name = e.target.value.trim(); clearTimeout(A._nt); A._nt = setTimeout(pProfile, 700); }
});
document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'set-week') { S.profile.week = +e.target.value; S.profile.weekStart = todayKey(); ui.idea = null; pProfile(); }
  if (id === 'dur-input') ui.dur = Math.max(1, Math.min(240, +e.target.value || 10));
  if (id === 'noclock') ui.noClock = e.target.checked;
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && timer) tick(); });

/* ---------- Inicio ---------- */
(async function boot() {
  applyMode('programa');
  try { store = await createStore(); }
  catch (e) {
    console.error(e);
    $('#loading').innerHTML = '<div class="center" style="padding:24px"><p>No se pudo cargar Firebase.</p><p class="muted small">Revisa tu conexión y la versión del SDK en config.js.</p><button class="btn" style="margin-top:12px" onclick="location.reload()">Reintentar</button></div>';
    return;
  }
  store.onAuth(onAuth);
})();
