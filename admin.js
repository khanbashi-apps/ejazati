/* إجازتي — لوحة الإدارة · إعداد أحمد الخنبشي */
(function () {
'use strict';
const PIN_KEY = 'ejazati.admin.pin', DRAFT_KEY = 'ejazati.admin.draft', AUTH_KEY = 'ejazati.admin.auth';
const DEFAULT_PIN = '1234';
const SITE_FILES_UNUSED = ['index.html', 'app.js', 'qr.js', 'sw.js', 'manifest.webmanifest',
  'thmanyahsans-Regular.woff2', 'thmanyahsans-Bold.woff2',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png', 'favicon-64.png',
  'admin/index.html', 'admin/admin.js'];

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
let toastT; function toast(m) { const el = $('#toast'); el.textContent = m; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
async function sha(s) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ejazati:' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return 'plain:' + s; } }

/* ---------- dates & hijri (same rules as the app) ---------- */
const DAY = 864e5;
const dn = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
const fromDn = n => { const t = new Date(n * DAY); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), w: t.getUTCDay() }; };
const iso = n => { const t = fromDn(n); return t.y + '-' + String(t.m).padStart(2, '0') + '-' + String(t.d).padStart(2, '0'); };
const parseIso = s => { if (!s) return null; const p = s.split('-').map(Number); return dn(p[0], p[1], p[2]); };
const todayDn = () => { const t = new Date(); return dn(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
const OMAN_MONTH_STARTS = { '1447-9': '2026-02-19', '1447-10': '2026-03-20', '1447-12': '2026-05-18' };
const tabDn = (y, m) => Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948440 - 2440588;
const HEPOCH = tabDn(1, 1);
function monthStartAbs(a) { const y = Math.floor(a / 12) + 1, m = (a % 12) + 1, k = y + '-' + m; if (D.hijri[k]) return parseIso(D.hijri[k]); if (OMAN_MONTH_STARTS[k]) return parseIso(OMAN_MONTH_STARTS[k]); return tabDn(y, m); }
const monthStart = (y, m) => monthStartAbs((y - 1) * 12 + (m - 1));
function toHijri(n) { let a = Math.floor((n - HEPOCH) / 29.530588); while (monthStartAbs(a) > n) a--; while (monthStartAbs(a + 1) <= n) a++; return { y: Math.floor(a / 12) + 1, m: (a % 12) + 1, d: n - monthStartAbs(a) + 1 }; }
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const HMONTHS = ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
const WD = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const fmt = n => { const f = fromDn(n); return WD[f.w] + ' ' + f.d + ' ' + MONTHS[f.m - 1] + ' ' + f.y; };
const HOL_NAMES = { accession: 'ذكرى تولي جلالة السلطان مقاليد الحكم', national: 'العيد الوطني المجيد', hijri: 'رأس السنة الهجرية', mawlid: 'المولد النبوي الشريف', isra: 'الإسراء والمعراج', fitr: 'عيد الفطر المبارك', adha: 'عيد الأضحى المبارك' };
function holidaysOfYear(Y) {
  const list = [];
  const push = (id, key, s, e) => { const o = D.holidays[key]; list.push({ id, key, name: HOL_NAMES[id], calc: { s, e }, s: o ? parseIso(o.s) : s, e: o ? parseIso(o.e) : e, set: !!o }); };
  push('accession', 'accession-' + Y, dn(Y, 1, 11), dn(Y, 1, 11));
  push('national', 'national-' + Y, dn(Y, 11, 18), dn(Y, 11, 19));
  for (let hy = toHijri(dn(Y, 1, 1)).y - 1; hy <= toHijri(dn(Y, 12, 31)).y + 1; hy++) {
    push('hijri', 'hijri-' + hy, monthStart(hy, 1), monthStart(hy, 1));
    push('mawlid', 'mawlid-' + hy, monthStart(hy, 3) + 11, monthStart(hy, 3) + 11);
    push('isra', 'isra-' + hy, monthStart(hy, 7) + 26, monthStart(hy, 7) + 26);
    push('fitr', 'fitr-' + hy, monthStart(hy, 9) + 28, monthStart(hy, 10) + 2);
    push('adha', 'adha-' + hy, monthStart(hy, 12) + 8, monthStart(hy, 12) + 11);
  }
  return list.filter(h => h.calc.e >= dn(Y, 1, 1) && h.calc.s <= dn(Y, 12, 31)).sort((a, b) => a.s - b.s);
}

/* ---------- state ---------- */
const EMPTY = () => ({ version: '', hijri: {}, holidays: {}, extra: [], messages: [] });
let D = EMPTY(), SERVER = EMPTY(), tab = 'hijri', year = fromDn(todayDn()).y, editMsg = null;
const norm = j => Object.assign(EMPTY(), j || {}, { hijri: (j && j.hijri) || {}, holidays: (j && j.holidays) || {}, extra: (j && j.extra) || [], messages: (j && j.messages) || [] });
const saveDraft = () => store.set(DRAFT_KEY, JSON.stringify(D));
const dirty = () => JSON.stringify(D) !== JSON.stringify(SERVER);
async function loadServer() {
  try { const r = await fetch('updates.json?t=' + Date.now(), { cache: 'no-store' }); if (r.ok) SERVER = norm(await r.json()); } catch (e) {}
  let dr = null; try { dr = JSON.parse(store.get(DRAFT_KEY) || 'null'); } catch (e) {}
  D = dr ? norm(dr) : JSON.parse(JSON.stringify(SERVER));
}

/* ---------- login ---------- */
async function login() {
  const authed = store.get(AUTH_KEY) === '1';
  if (authed) { await loadServer(); render(); return; }
  $('#root').innerHTML = '<div class="login"><img src="icon-192.png" alt=""><h1 style="font-size:22px;margin:14px 0 4px">لوحة إدارة إجازتي</h1><p class="muted">أدخل الرقم السري</p>' +
    '<form id="lf" class="stack"><label class="sr" for="pin">الرقم السري</label><input id="pin" class="pin" type="password" inputmode="numeric" autocomplete="current-password" maxlength="12" required>' +
    '<button class="btn primary full" type="submit">دخول</button></form><p class="small muted" style="margin-top:16px">إعداد أحمد الخنبشي</p></div>';
  $('#lf').addEventListener('submit', async e => {
    e.preventDefault();
    const h = await sha($('#pin').value.trim()), saved = store.get(PIN_KEY) || await sha(DEFAULT_PIN);
    if (h !== saved) { toast('الرقم السري غير صحيح'); $('#pin').value = ''; return; }
    store.set(AUTH_KEY, '1'); await loadServer(); render();
    if (!store.get(PIN_KEY)) toast('غيّر الرقم السري من تبويب النشر');
  });
  setTimeout(() => $('#pin') && $('#pin').focus(), 100);
}

/* ---------- views ---------- */
function render() {
  const tabs = [['hijri', 'الأشهر الهجرية'], ['hol', 'الإجازات'], ['msg', 'الرسائل'], ['pub', 'النشر']];
  let h = '<header><img src="icon-192.png" alt=""><h1>لوحة إدارة إجازتي</h1><span class="tag">للمدير فقط</span></header>';
  if (dirty()) h += '<div class="banner"><span style="flex:1">لديك تعديلات لم تُنشر بعد. اذهب إلى تبويب <b>النشر</b> عند الانتهاء.</span><button class="btn sm" type="button" data-a="discard">تجاهل التعديلات</button></div>';
  h += '<div class="tabs" role="tablist">' + tabs.map(([k, l]) => '<button type="button" role="tab" data-tab="' + k + '" aria-selected="' + (tab === k) + '">' + l + '</button>').join('') + '</div>';
  h += tab === 'hijri' ? vHijri() : tab === 'hol' ? vHol() : tab === 'msg' ? vMsg() : vPub();
  $('#root').innerHTML = h;
}
function vHijri() {
  const now = toHijri(todayDn()); const opts = [];
  for (let i = -2; i <= 18; i++) { const a = (now.y - 1) * 12 + (now.m - 1) + i; opts.push([(Math.floor(a / 12) + 1) + '-' + (a % 12 + 1), HMONTHS[a % 12] + ' ' + (Math.floor(a / 12) + 1)]); }
  const sel = editMsg && editMsg.hk || (now.y + '-' + now.m); const [sy, sm] = sel.split('-').map(Number);
  let h = '<section class="card"><h2>بداية شهر هجري</h2><p class="hint">بعد إعلان وزارة الأوقاف بداية الشهر، اختره وحدد يومه الأول. يتعدّل التاريخ الهجري وكل الإجازات المرتبطة به في التطبيق.</p>' +
    '<div class="pair"><label class="f">الشهر<select id="hM">' + opts.map(([v, l]) => '<option value="' + v + '"' + (v === sel ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></label>' +
    '<label class="f">يبدأ يوم<input type="date" id="hD" value="' + iso(monthStart(sy, sm)) + '"></label></div>' +
    '<p class="small muted" id="hInfo" style="margin:8px 0 0">' + esc(fmt(monthStart(sy, sm))) + '</p>' +
    '<button class="btn primary full" type="button" data-a="hSave" style="margin-top:10px">حفظ بداية الشهر</button></section>';
  const keys = Object.keys(D.hijri).sort((a, b) => { const [ay, am] = a.split('-').map(Number), [by, bm] = b.split('-').map(Number); return ay * 12 + am - (by * 12 + bm); });
  h += '<section class="card"><h2>الأشهر المعتمدة</h2>' + (keys.length ? '<div class="list">' + keys.map(k => { const [y, m] = k.split('-').map(Number); return '<div class="item"><div class="top"><b>' + esc(HMONTHS[m - 1] + ' ' + y) + '</b><button class="btn sm danger" type="button" data-a="hDel" data-k="' + k + '">حذف</button></div><span class="muted small">يبدأ ' + esc(fmt(parseIso(D.hijri[k]))) + '</span></div>'; }).join('') + '</div>' : '<p class="hint">لم تضف أي شهر بعد. التطبيق يستخدم الحساب التقديري حالياً.</p>') + '</section>';
  return h;
}
function vHol() {
  const hs = holidaysOfYear(year);
  let h = '<section class="card"><div class="row" style="justify-content:space-between"><h2>الإجازات الرسمية ' + year + '</h2><div class="row"><button class="btn sm" type="button" data-a="yPrev">' + (year - 1) + '</button><button class="btn sm" type="button" data-a="yNext">' + (year + 1) + '</button></div></div>' +
    '<p class="hint">عدّل التاريخ ثم اضغط حفظ. التاريخ الذي يعدّله المستخدم بنفسه لا يتغير، ويظهر له تنبيه ليختار.</p><div class="list">';
  hs.forEach(x => {
    h += '<div class="item"><div class="top"><b>' + esc(x.name) + '</b>' + (x.set ? '<span class="badge on">معتمد منك</span>' : '<span class="badge">محسوب</span>') + '</div>' +
      '<div class="pair"><label class="f">من<input type="date" data-hs="' + x.key + '" value="' + iso(x.s) + '"></label><label class="f">إلى<input type="date" data-he="' + x.key + '" value="' + iso(x.e) + '"></label></div>' +
      '<div class="grid2"><button class="btn sm primary" type="button" data-a="holSave" data-k="' + x.key + '">حفظ</button>' +
      (x.set ? '<button class="btn sm" type="button" data-a="holReset" data-k="' + x.key + '">إرجاع للمحسوب</button>' : (x.id === 'fitr' || x.id === 'adha' || x.id === 'national' ? '<button class="btn sm" type="button" data-a="suggest" data-k="' + x.key + '">اقتراح رسالة</button>' : '<span></span>')) + '</div>' +
      (x.set && (x.id === 'fitr' || x.id === 'adha' || x.id === 'national') ? '<button class="btn sm" type="button" data-a="suggest" data-k="' + x.key + '">اقتراح رسالة لهذه الإجازة</button>' : '') + '</div>';
  });
  h += '</div></section>';
  h += '<section class="card"><h2>إجازة إضافية أو استثنائية</h2><p class="hint">مثل يوم إجازة إضافي تعلنه الحكومة.</p>' +
    '<div class="stack"><label class="f">اسم الإجازة<input type="text" id="xN" maxlength="60" placeholder="مثال: إجازة بمناسبة ..."></label>' +
    '<div class="pair"><label class="f">من<input type="date" id="xS"></label><label class="f">إلى<input type="date" id="xE"></label></div>' +
    '<button class="btn primary full" type="button" data-a="xAdd">إضافة الإجازة</button></div>' +
    (D.extra.length ? '<h3>الإجازات الإضافية</h3><div class="list">' + D.extra.map(x => '<div class="item"><div class="top"><b>' + esc(x.name) + '</b><button class="btn sm danger" type="button" data-a="xDel" data-id="' + esc(x.id) + '">حذف</button></div><span class="muted small">' + esc(fmt(parseIso(x.s))) + (x.e !== x.s ? ' ← ' + esc(fmt(parseIso(x.e))) : '') + '</span></div>').join('') + '</div>' : '') + '</section>';
  return h;
}
const COLORS = { brand: '#E9724C', navy: '#1B2A4A', green: '#2E8B57', gold: '#B7861F', purple: '#6C4AB6' };
const EMOJIS = ['🌙', '🎉', '🇴🇲', '🏝️', '📢', '⚠️', '💼', '❤️'];
function msgPreview(m) {
  return '<div class="notice" style="background:' + (COLORS[m.color] || COLORS.brand) + '">' + (m.emoji ? '<div class="ic">' + esc(m.emoji) + '</div>' : '') + '<div style="flex:1;min-width:0">' + (m.title ? '<h4>' + esc(m.title) + '</h4>' : '') + '<p>' + esc(m.text || 'نص الرسالة') + '</p>' + (m.link ? '<span class="lnk">' + esc(m.linkText || 'فتح الرابط') + '</span>' : '') + '</div></div>';
}
function dtFmt(s) { if (!s) return '—'; const [d, tm] = s.split('T'); return fmt(parseIso(d)) + ' · ' + (tm || ''); }
function vMsg() {
  const now = new Date(); const z = n => String(n).padStart(2, '0');
  const nowS = now.getFullYear() + '-' + z(now.getMonth() + 1) + '-' + z(now.getDate()) + 'T' + z(now.getHours()) + ':' + z(now.getMinutes());
  const m = Object.assign({}, curMsg()); if (!m.from && !m.id) m.from = nowS;
  let h = '<section class="card"><h2>' + (m.id ? 'تعديل رسالة' : 'رسالة جديدة') + '</h2><p class="hint">تظهر الرسالة أعلى التقويم عند المستخدمين خلال المدة التي تحددها فقط.</p><div class="stack">' +
    '<label class="f">العنوان<input type="text" id="mT" maxlength="60" value="' + esc(m.title) + '" placeholder="مثال: عيد مبارك"></label>' +
    '<label class="f">نص الرسالة<textarea id="mX" maxlength="400" placeholder="مثال: أول أيام عيد الفطر يوم الجمعة، كل عام وأنتم بخير">' + esc(m.text) + '</textarea></label>' +
    '<div><span class="f" style="font-size:14px;color:var(--muted)">الرمز</span><div class="emojis" style="margin-top:4px">' + ['', ...EMOJIS].map(e => '<button type="button" data-a="mEmoji" data-v="' + e + '" aria-pressed="' + (m.emoji === e) + '" aria-label="' + (e || 'بدون رمز') + '">' + (e || '∅') + '</button>').join('') + '</div></div>' +
    '<div><span style="font-size:14px;color:var(--muted)">اللون</span><div class="swatches" style="margin-top:4px">' + Object.keys(COLORS).map(c => '<button type="button" data-a="mColor" data-v="' + c + '" aria-pressed="' + (m.color === c) + '" style="background:' + COLORS[c] + '" aria-label="' + c + '"></button>').join('') + '</div></div>' +
    '<div class="pair"><label class="f">تظهر من<input type="datetime-local" id="mF" value="' + esc(m.from) + '"></label><label class="f">تختفي في<input type="datetime-local" id="mTo" value="' + esc(m.to) + '"></label></div>' +
    '<div class="pair"><label class="f">رابط (اختياري)<input type="text" id="mL" inputmode="url" dir="ltr" value="' + esc(m.link) + '" placeholder="https://"></label><label class="f">نص الزر<input type="text" id="mLT" maxlength="30" value="' + esc(m.linkText) + '" placeholder="التفاصيل"></label></div>' +
    '<h3>معاينة</h3><div id="mPrev">' + msgPreview(m) + '</div>' +
    '<div class="grid2"><button class="btn primary" type="button" data-a="mSave">' + (m.id ? 'حفظ التعديل' : 'إضافة الرسالة') + '</button><button class="btn" type="button" data-a="mClear">' + (m.id ? 'إلغاء' : 'مسح') + '</button></div></div></section>';
  const nowL = nowS;
  h += '<section class="card"><h2>الرسائل</h2>' + (D.messages.length ? '<div class="list">' + D.messages.map(x => {
    const st = x.to && x.to < nowL ? 'انتهت' : x.from && x.from > nowL ? 'مجدولة' : 'ظاهرة الآن';
    return '<div class="item">' + msgPreview(x) + '<span class="small muted">' + esc(st) + ' · من ' + esc(dtFmt(x.from)) + ' إلى ' + esc(x.to ? dtFmt(x.to) : 'بدون نهاية') + '</span><div class="grid2"><button class="btn sm" type="button" data-a="mEdit" data-id="' + esc(x.id) + '">تعديل</button><button class="btn sm danger" type="button" data-a="mDel" data-id="' + esc(x.id) + '">حذف</button></div></div>';
  }).join('') + '</div>' : '<p class="hint">لا توجد رسائل.</p>') + '</section>';
  return h;
}
function vPub() {
  const ch = [];
  const cnt = (a, b) => { const ka = Object.keys(a), kb = Object.keys(b); return ka.filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k])).length + kb.filter(k => !(k in a)).length; };
  const hc = cnt(D.hijri, SERVER.hijri), oc = cnt(D.holidays, SERVER.holidays);
  if (hc) ch.push(hc + ' تعديل في الأشهر الهجرية'); if (oc) ch.push(oc + ' تعديل في الإجازات');
  if (JSON.stringify(D.extra) !== JSON.stringify(SERVER.extra)) ch.push('تعديل في الإجازات الإضافية');
  if (JSON.stringify(D.messages) !== JSON.stringify(SERVER.messages)) ch.push('تعديل في الرسائل');
  let h = '<section class="card"><h2>نشر التحديثات</h2>' +
    (ch.length ? '<p>التعديلات الجاهزة للنشر:</p><ul style="margin:0 0 10px">' + ch.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '<p class="hint">لا توجد تعديلات جديدة. آخر نشر: ' + esc(SERVER.version ? SERVER.version.replace('T', ' ').slice(0, 16) : '—') + '</p>') +
    '<button class="btn navy full" type="button" data-a="build" id="buildBtn">📄 تنزيل ملف التحديث updates.json</button>' +
    '<h3>بعد التنزيل</h3><ol class="steps"><li>اختر <b>حفظ في الملفات</b> (Save to Files).</li><li>افتح <a href="https://github.com/khanbashi-apps/ejazati/upload/main" target="_blank" rel="noopener">صفحة الرفع في GitHub</a>.</li><li>اضغط <b>choose your files</b> واختر <b>updates.json</b>.</li><li>انزل واضغط <b>Commit changes</b>.</li><li>خلال دقيقة إلى 5 دقائق يصل التحديث لكل من يفتح التطبيق.</li></ol>' +
    '<p class="small muted">الملف يستبدل النسخة القديمة تلقائياً لأنه بنفس الاسم.</p></section>';
  h += '<section class="card"><h2>الرقم السري</h2><div class="pair"><label class="f">الرقم الجديد<input type="password" id="p1" inputmode="numeric" maxlength="12"></label><label class="f">تأكيد الرقم<input type="password" id="p2" inputmode="numeric" maxlength="12"></label></div>' +
    '<button class="btn full" type="button" data-a="pin" style="margin-top:10px">تغيير الرقم السري</button><button class="btn full" type="button" data-a="logout" style="margin-top:10px">تسجيل الخروج</button>' +
    '<p class="small muted" style="margin-top:10px">الرقم السري محفوظ في هذا الجوال فقط. إذا فتحت اللوحة من جهاز آخر، يكون الرقم الافتراضي ' + DEFAULT_PIN + ' حتى تغيّره هناك.</p></section>';
  h += '<p class="small muted" style="text-align:center">إجازتي · إعداد أحمد الخنبشي</p>';
  return h;
}

/* ---------- zip (store) ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function makeZip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const d = new Date(), dt = ((d.getFullYear() - 1980) << 25) | ((d.getMonth() + 1) << 21) | (d.getDate() << 16) | (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  files.forEach(f => {
    const name = enc.encode(f.name), data = f.data, crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint32(10, dt, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint32(12, dt, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), name);
    off += 30 + name.length + data.length;
  });
  const csize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, csize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
async function build() {
  const z = n => String(n).padStart(2, '0'), d = new Date();
  const out = JSON.parse(JSON.stringify(D)); out.version = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()) + ':' + z(d.getSeconds());
  const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
  const f = new File([blob], 'updates.json', { type: 'application/json' });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); toast('احفظ الملف ثم ارفعه في GitHub'); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'updates.json'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  toast('تم تنزيل updates.json، ارفعه الآن في GitHub');
}

/* ---------- events ---------- */
function readMsgForm(base) {
  return Object.assign({}, base, { title: $('#mT').value.trim(), text: $('#mX').value.trim(), from: $('#mF').value, to: $('#mTo').value, link: $('#mL').value.trim(), linkText: $('#mLT').value.trim() });
}
let msgDraft = null;
function curMsg() { return (editMsg && editMsg.msg) || msgDraft || { id: '', title: '', text: '', emoji: '🌙', color: 'brand', from: '', to: '', link: '', linkText: '' }; }
document.addEventListener('click', async e => {
  const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; editMsg = null; msgDraft = null; render(); window.scrollTo(0, 0); return; }
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a;
  const commit = msg => { saveDraft(); render(); if (msg) toast(msg); };
  switch (a) {
    case 'discard': if (confirm('تجاهل كل التعديلات غير المنشورة؟')) { D = JSON.parse(JSON.stringify(SERVER)); store.del(DRAFT_KEY); render(); } break;
    case 'hSave': { const k = $('#hM').value, d = $('#hD').value; if (!d) return toast('حدد التاريخ'); D.hijri[k] = d; commit('تم الحفظ'); break; }
    case 'hDel': delete D.hijri[b.dataset.k]; commit(); break;
    case 'yPrev': year--; render(); break;
    case 'yNext': year++; render(); break;
    case 'holSave': { const k = b.dataset.k; let s = document.querySelector('[data-hs="' + k + '"]').value, en = document.querySelector('[data-he="' + k + '"]').value; if (!s || !en) return toast('حدد التاريخين'); if (en < s) [s, en] = [en, s]; D.holidays[k] = { s, e: en }; commit('تم الحفظ'); break; }
    case 'holReset': delete D.holidays[b.dataset.k]; commit(); break;
    case 'xAdd': { const n = $('#xN').value.trim(); let s = $('#xS').value, en = $('#xE').value || s; if (!n || !s) return toast('اكتب الاسم والتاريخ'); if (en < s) [s, en] = [en, s]; D.extra.push({ id: uid(), name: n, s, e: en }); commit('تمت الإضافة'); break; }
    case 'xDel': D.extra = D.extra.filter(x => x.id !== b.dataset.id); commit(); break;
    case 'suggest': {
      const x = holidaysOfYear(year).find(h => h.key === b.dataset.k); if (!x) return;
      const emoji = x.id === 'national' ? '🇴🇲' : '🌙';
      const f = fromDn(x.s), first = WD[f.w] + ' ' + f.d + ' ' + MONTHS[f.m - 1];
      const fromD = iso(x.s - 7) + 'T08:00', toD = iso(x.e) + 'T23:59';
      msgDraft = { id: '', title: x.name, text: 'إجازة ' + x.name + ' تبدأ يوم ' + first + (x.e !== x.s ? ' وتستمر حتى ' + WD[fromDn(x.e).w] + ' ' + fromDn(x.e).d + ' ' + MONTHS[fromDn(x.e).m - 1] : '') + '. كل عام وأنتم بخير', emoji, color: x.id === 'national' ? 'green' : 'brand', from: fromD, to: toD, link: '', linkText: '' };
      editMsg = null; tab = 'msg'; render(); window.scrollTo(0, 0); toast('راجع الرسالة ثم اضغط إضافة'); break;
    }
    case 'mEmoji': case 'mColor': {
      const m = readMsgForm(curMsg()); if (a === 'mEmoji') m.emoji = b.dataset.v; else m.color = b.dataset.v;
      if (editMsg) editMsg.msg = m; else msgDraft = m; render(); break;
    }
    case 'mSave': {
      const m = readMsgForm(curMsg()); if (!m.text && !m.title) return toast('اكتب نص الرسالة');
      if (m.to && m.from && m.to < m.from) return toast('وقت الاختفاء قبل وقت الظهور');
      if (m.link && !/^https?:\/\//.test(m.link)) m.link = 'https://' + m.link;
      if (m.id) { const i = D.messages.findIndex(x => x.id === m.id); if (i >= 0) D.messages[i] = m; } else { m.id = uid(); D.messages.unshift(m); }
      editMsg = null; msgDraft = null; commit('تم حفظ الرسالة'); break;
    }
    case 'mClear': editMsg = null; msgDraft = null; render(); break;
    case 'mEdit': { const m = D.messages.find(x => x.id === b.dataset.id); if (m) { editMsg = { msg: JSON.parse(JSON.stringify(m)) }; render(); window.scrollTo(0, 0); } break; }
    case 'mDel': if (confirm('حذف الرسالة؟')) { D.messages = D.messages.filter(x => x.id !== b.dataset.id); commit(); } break;
    case 'build': build(); break;
    case 'pin': { const p1 = $('#p1').value.trim(), p2 = $('#p2').value.trim(); if (p1.length < 4) return toast('الرقم 4 خانات على الأقل'); if (p1 !== p2) return toast('الرقمان غير متطابقين'); store.set(PIN_KEY, await sha(p1)); $('#p1').value = $('#p2').value = ''; toast('تم تغيير الرقم السري'); break; }
    case 'logout': store.del(AUTH_KEY); login(); break;
  }
});
document.addEventListener('input', e => {
  if (['mT', 'mX', 'mL', 'mLT'].includes(e.target.id)) { const m = readMsgForm(curMsg()); const pv = $('#mPrev'); if (pv) pv.innerHTML = msgPreview(m); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'hM') { const [y, m] = e.target.value.split('-').map(Number); $('#hD').value = iso(monthStart(y, m)); $('#hInfo').textContent = fmt(monthStart(y, m)); }
  if (e.target.id === 'hD' && e.target.value) $('#hInfo').textContent = fmt(parseIso(e.target.value));
});

login();
})();
