/* إجازتي (Ejazati) — تقويم الشفتات والإجازات · إعداد أحمد الخنبشي */
(function () {
'use strict';
const VERSION = '1.2.0';
const KEY = 'ejazati.v1';
const RKEY = 'ejazati.remote';
let REMOTE = {};

/* ---------------- Dates (day numbers, UTC) ---------------- */
const DAY = 864e5;
const dn = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
const fromDn = n => { const t = new Date(n * DAY); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), w: t.getUTCDay() }; };
const iso = n => { const t = fromDn(n); return t.y + '-' + String(t.m).padStart(2, '0') + '-' + String(t.d).padStart(2, '0'); };
const parseIso = s => { if (!s) return null; const p = s.split('-').map(Number); return p.length === 3 && p[0] ? dn(p[0], p[1], p[2]) : null; };
const todayDn = () => { const t = new Date(); return dn(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/* ---------------- Hijri (Omani official calendar) ----------------
   Base: tabular calendar, corrected by month starts announced in Oman
   (Ministry of Endowments & Religious Affairs) and by user corrections. */
const OMAN_MONTH_STARTS = {
  '1447-9': '2026-02-19',  // رمضان 1447: الخميس
  '1447-10': '2026-03-20', // شوال 1447: عيد الفطر الجمعة
  '1447-12': '2026-05-18'  // ذو الحجة 1447: عيد الأضحى الأربعاء 27 مايو
};
const tabDn = (y, m) => Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948440 - 2440588;
const HEPOCH = tabDn(1, 1);
function monthStartAbs(a) {
  const y = Math.floor(a / 12) + 1, m = (a % 12) + 1, k = y + '-' + m;
  const user = S.hijriMonthStarts && S.hijriMonthStarts[k];
  if (user) return parseIso(user);
  const rem = REMOTE.hijri && REMOTE.hijri[k];
  if (rem) return parseIso(rem);
  if (OMAN_MONTH_STARTS[k]) return parseIso(OMAN_MONTH_STARTS[k]);
  return tabDn(y, m) + (S.hijriOffset || 0);
}
const monthStart = (y, m) => monthStartAbs((y - 1) * 12 + (m - 1));
function toHijri(n) {
  let a = Math.floor((n - HEPOCH) / 29.530588);
  while (monthStartAbs(a) > n) a--;
  while (monthStartAbs(a + 1) <= n) a++;
  return { y: Math.floor(a / 12) + 1, m: (a % 12) + 1, d: n - monthStartAbs(a) + 1, len: monthStartAbs(a + 1) - monthStartAbs(a) };
}

/* ---------------- i18n ---------------- */
const T = {
ar: {
  app: 'إجازتي', calendar: 'التقويم', leaves: 'الإجازات', shifts: 'الشفتات', settings: 'الإعدادات',
  months: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  hmonths: ['محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'],
  wd: ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'], wds: ['أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'],
  Wi: 'د', Mi: 'ص', Ei: 'م', Ni: 'ل', Oi: 'ر', W: 'دوام', M: 'صباحي', E: 'مسائي', N: 'ليلي', O: 'راحة', Ws: 'دوام', Ms: 'صباح', Es: 'مساء', Ns: 'ليل', Os: 'راحة',
  annuali: 'س', sicki: 'م', emergencyi: 'ط', compassionatei: 'ض', annual: 'سنوية', sick: 'مرضية', emergency: 'طارئة', compassionate: 'اضطرارية', holiday: 'إجازة رسمية', note: 'ملاحظة', common: 'راحة مشتركة',
  annualL: 'إجازة سنوية', sickL: 'إجازة مرضية', emergencyL: 'إجازة طارئة', compassionateL: 'إجازة اضطرارية',
  today: 'اليوم', jumpToday: 'العودة إلى اليوم', prev: 'الشهر السابق', next: 'الشهر التالي',
  cdWork: n => 'باقي ' + nd(n) + ' على إجازتك 🏝️', cdOff: n => 'باقي ' + nd(n) + ' على الدوام 💼', cdEvent: (n, x) => 'باقي ' + nd(n) + ' على ' + x,
  cdLastWork: 'آخر يوم دوام، الراحة غداً 🏝️', cdLastOff: 'آخر يوم راحة، الدوام غداً 💼', cdNoProfile: 'أضف جدول شفت لتبدأ',
  inLeave: x => 'أنت في ' + x + ' اليوم 🌴', inHoliday: x => 'اليوم ' + x + ' 🎉',
  statWork: 'أيام الدوام', statOff: 'أيام الراحة', statAnnual: 'إجازة سنوية', statOther: 'إجازات أخرى', statHours: 'ساعات العمل', statCommon: 'راحة مشتركة',
  holWork: 'دوام', holOff: 'راحة', holLeave: 'إجازة',
  exportImg: 'تصدير صورة الشهر', compare: 'مقارنة', compareOff: 'إلغاء المقارنة',
  addNote: 'إضافة ملاحظة', noteText: 'نص الملاحظة', time: 'وقت التذكير', save: 'حفظ', cancel: 'إلغاء', del: 'حذف', edit: 'تعديل', close: 'إغلاق', add: 'إضافة',
  addLeaveHere: 'إضافة إجازة من هذا اليوم', toCal: 'إضافة لتقويم الهاتف',
  balance: 'رصيد الإجازة السنوية', total: 'الكلي', used: 'المستخدَم', remain: 'المتبقي', yearlyDays: 'الرصيد السنوي (أيام)', carry: 'المرحّل من السنة السابقة',
  exclOff: 'عدم خصم أيام راحة الشفت من الرصيد', exclHol: 'عدم خصم الإجازات الرسمية من الرصيد',
  myLeaves: 'إجازاتي', newLeave: 'إجازة جديدة', type: 'النوع', from: 'من', to: 'إلى', optNote: 'ملاحظة (اختياري)', noLeaves: 'لا توجد إجازات مسجلة لهذه السنة',
  days: 'يوم', officialHol: 'الإجازات الرسمية', holNote: 'التواريخ الهجرية حسب التقويم العُماني الرسمي؛ اضغط تعديل إذا اختلف الإعلان.',
  official: 'معتمد', estimated: 'تقديري', resetDate: 'استعادة التاريخ المحسوب',
  hol_accession: 'ذكرى تولي جلالة السلطان مقاليد الحكم', hol_national: 'العيد الوطني المجيد', hol_hijri: 'رأس السنة الهجرية', hol_mawlid: 'المولد النبوي الشريف',
  hol_isra: 'الإسراء والمعراج', hol_fitr: 'عيد الفطر المبارك', hol_adha: 'عيد الأضحى المبارك',
  profiles: 'جداول الشفت', active: 'النشط', newProfile: 'جدول جديد', name: 'الاسم', anchor: 'تاريخ بداية أول شفت', mode: 'نمط الدوام',
  modeFull: 'اليوم الكامل', modePeriods: 'الفترات والساعات', workDays: 'أيام الدوام', offDays: 'أيام الراحة', hours: 'ساعات الدوام', start: 'البداية', end: 'النهاية',
  seqTitle: 'تسلسل الدورة', seqHint: 'أضف الفترات بالترتيب. مثال: صباحي×2، مسائي×2، ليلي×2، راحة×4', undo: 'حذف الأخير', clear: 'مسح', presets: 'أنماط جاهزة',
  cycle: 'طول الدورة', share: 'مشاركة', shareTitle: 'مشاركة الجدول', shareHint: 'يُشارَك النمط فقط، دون ملاحظاتك أو إجازاتك.', copyLink: 'نسخ الرابط', copied: 'تم نسخ الرابط',
  importAsk: 'وصلك جدول شفت باسم', importAdd: 'إضافة كجدول جديد', importCompare: 'إضافة ومقارنته بجدولي',
  compareWith: 'مقارنة مع جدول', none: 'بدون', useThis: 'تفعيل',
  lang: 'اللغة', theme: 'المظهر', themes: { default: 'الافتراضي', dark: 'الداكن', glass: 'الزجاجي', neu: 'المجسّم' },
  weekStart: 'بداية الأسبوع', weekend: 'نهاية الأسبوع', weekendHint: 'اختر يوماً أو يومين',
  hijri: 'التاريخ الهجري', showHijri: 'إظهار التاريخ الهجري', hijriOffset: 'ضبط فرق الأيام', hijriFix: 'تصحيح بداية الأشهر الهجرية',
  hijriFixHint: 'إذا أعلنت وزارة الأوقاف بداية شهر بتاريخ مختلف، أدخله هنا.', month: 'الشهر', startsOn: 'يبدأ في', apply: 'تطبيق',
  colors: 'الألوان', notif: 'التنبيهات', notifOn: 'تفعيل إشعارات التطبيق', notifHint: 'تعمل والتطبيق مفتوح. لتنبيهات شاشة القفل صدّر الجدول لتقويم الهاتف.',
  ics: 'تقويم الهاتف (.ics)', icsShifts: 'تصدير جدول الشفت', icsNotes: 'تصدير الملاحظات', icsRange: 'المدة', monthsN: n => n + ' أشهر',
  backup: 'النسخ الاحتياطي', exportJson: 'تصدير البيانات', importJson: 'استيراد البيانات', imported: 'تم استيراد البيانات', backupHint: 'احفظ نسخة احتياطية كل فترة، فقد يمسح المتصفح البيانات.',
  resetAll: 'حذف كل البيانات', confirmReset: 'سيتم حذف كل البيانات. هل أنت متأكد؟', confirmDel: 'تأكيد الحذف؟',
  credit: 'إعداد', author: 'أحمد الخنبشي', version: 'الإصدار', saved: 'تم الحفظ', reminder: 'تذكير',
  defaultProfile: 'شفتي', invalid: 'تحقق من البيانات', maxWeekend: 'يمكن اختيار يومين كحد أقصى', noAnchor: 'حدد تاريخ البداية',
  newOfficial: 'تاريخ رسمي جديد', newOfficialTxt: (n, d) => 'نُشر تاريخ رسمي لـ ' + n + ': ' + d + '، وهو يختلف عن التاريخ الذي عدّلته.', adopt: 'اعتماد الرسمي', keepMine: 'إبقاء تعديلي', hide: 'إخفاء', monthWord: 'بداية شهر',
  langName: 'English', imgTitle: 'جدول', generated: 'إجازتي · إعداد أحمد الخنبشي'
},
en: {
  app: 'Ejazati', calendar: 'Calendar', leaves: 'Leaves', shifts: 'Shifts', settings: 'Settings',
  months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  hmonths: ['Muharram','Safar','Rabi I','Rabi II','Jumada I','Jumada II','Rajab','Sha\'ban','Ramadan','Shawwal','Dhu al-Qa\'dah','Dhu al-Hijjah'],
  wd: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'], wds: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  Wi: 'W', Mi: 'M', Ei: 'E', Ni: 'N', Oi: 'O', W: 'Work', M: 'Morning', E: 'Evening', N: 'Night', O: 'Off', Ws: 'Work', Ms: 'Morn', Es: 'Eve', Ns: 'Night', Os: 'Off',
  annuali: 'A', sicki: 'S', emergencyi: 'Em', compassionatei: 'C', annual: 'Annual', sick: 'Sick', emergency: 'Emergency', compassionate: 'Compassionate', holiday: 'Public holiday', note: 'Note', common: 'Common off',
  annualL: 'Annual leave', sickL: 'Sick leave', emergencyL: 'Emergency leave', compassionateL: 'Compassionate leave',
  today: 'Today', jumpToday: 'Jump to today', prev: 'Previous month', next: 'Next month',
  cdWork: n => n + (n === 1 ? ' day' : ' days') + ' until your break 🏝️', cdOff: n => n + (n === 1 ? ' day' : ' days') + ' until work 💼', cdEvent: (n, x) => n + (n === 1 ? ' day' : ' days') + ' until ' + x,
  cdLastWork: 'Last work day, break starts tomorrow 🏝️', cdLastOff: 'Last day off, work tomorrow 💼', cdNoProfile: 'Add a shift schedule to start',
  inLeave: x => 'You are on ' + x + ' today 🌴', inHoliday: x => 'Today is ' + x + ' 🎉',
  statWork: 'Work days', statOff: 'Off days', statAnnual: 'Annual leave', statOther: 'Other leave', statHours: 'Work hours', statCommon: 'Common off',
  holWork: 'working', holOff: 'off', holLeave: 'on leave',
  exportImg: 'Export month image', compare: 'Compare', compareOff: 'Stop comparing',
  addNote: 'Add note', noteText: 'Note text', time: 'Reminder time', save: 'Save', cancel: 'Cancel', del: 'Delete', edit: 'Edit', close: 'Close', add: 'Add',
  addLeaveHere: 'Add leave from this day', toCal: 'Add to phone calendar',
  balance: 'Annual leave balance', total: 'Total', used: 'Used', remain: 'Remaining', yearlyDays: 'Yearly balance (days)', carry: 'Carried over from last year',
  exclOff: 'Don\'t deduct shift off days', exclHol: 'Don\'t deduct public holidays',
  myLeaves: 'My leaves', newLeave: 'New leave', type: 'Type', from: 'From', to: 'To', optNote: 'Note (optional)', noLeaves: 'No leaves recorded for this year',
  days: 'days', officialHol: 'Public holidays', holNote: 'Hijri dates follow the official Omani calendar; tap Edit if the announcement differs.',
  official: 'Confirmed', estimated: 'Estimated', resetDate: 'Restore calculated date',
  hol_accession: 'Accession Day of His Majesty the Sultan', hol_national: 'National Day', hol_hijri: 'Islamic New Year', hol_mawlid: 'Prophet\'s Birthday',
  hol_isra: 'Isra and Mi\'raj', hol_fitr: 'Eid al-Fitr', hol_adha: 'Eid al-Adha',
  profiles: 'Shift schedules', active: 'Active', newProfile: 'New schedule', name: 'Name', anchor: 'First shift start date', mode: 'Shift mode',
  modeFull: 'Full day', modePeriods: 'Periods & hours', workDays: 'Work days', offDays: 'Off days', hours: 'Work hours', start: 'Start', end: 'End',
  seqTitle: 'Cycle sequence', seqHint: 'Add periods in order. Example: Morning×2, Evening×2, Night×2, Off×4', undo: 'Remove last', clear: 'Clear', presets: 'Presets',
  cycle: 'Cycle length', share: 'Share', shareTitle: 'Share schedule', shareHint: 'Only the pattern is shared, not your notes or leaves.', copyLink: 'Copy link', copied: 'Link copied',
  importAsk: 'You received a shift schedule named', importAdd: 'Add as new schedule', importCompare: 'Add and compare with mine',
  compareWith: 'Compare with', none: 'None', useThis: 'Activate',
  lang: 'Language', theme: 'Theme', themes: { default: 'Default', dark: 'Dark', glass: 'Glass', neu: 'Soft' },
  weekStart: 'Week starts on', weekend: 'Weekend', weekendHint: 'Pick one or two days',
  hijri: 'Hijri date', showHijri: 'Show Hijri date', hijriOffset: 'Day adjustment', hijriFix: 'Correct Hijri month starts',
  hijriFixHint: 'If the Ministry announces a different month start, enter it here.', month: 'Month', startsOn: 'Starts on', apply: 'Apply',
  colors: 'Colors', notif: 'Notifications', notifOn: 'Enable app notifications', notifHint: 'Work while the app is open. For lock-screen alerts, export to your phone calendar.',
  ics: 'Phone calendar (.ics)', icsShifts: 'Export shift schedule', icsNotes: 'Export notes', icsRange: 'Range', monthsN: n => n + ' months',
  backup: 'Backup', exportJson: 'Export data', importJson: 'Import data', imported: 'Data imported', backupHint: 'Back up regularly; the browser may clear site data.',
  resetAll: 'Delete all data', confirmReset: 'All data will be deleted. Are you sure?', confirmDel: 'Confirm delete?',
  credit: 'Made by', author: 'Ahmed Al-Khanbashi', version: 'Version', saved: 'Saved', reminder: 'Reminder',
  defaultProfile: 'My shift', invalid: 'Please check the data', maxWeekend: 'Up to two days', noAnchor: 'Set the start date',
  newOfficial: 'New official date', newOfficialTxt: (n, d) => 'An official date was published for ' + n + ': ' + d + ', different from your edit.', adopt: 'Use official', keepMine: 'Keep mine', hide: 'Hide', monthWord: 'Start of',
  langName: 'العربية', imgTitle: 'Schedule', generated: 'Ejazati · by Ahmed Al-Khanbashi'
}};
function nd(n) { // Arabic day counting
  if (n === 1) return 'يوم واحد';
  if (n === 2) return 'يومين';
  if (n >= 3 && n <= 10) return n + ' أيام';
  return n + ' يوماً';
}
const t = k => (T[S.lang] && T[S.lang][k] !== undefined) ? T[S.lang][k] : T.ar[k];

/* ---------------- State ---------------- */
const DEF_COLORS = { W: '#1B6CA8', M: '#E0A030', E: '#E9724C', N: '#3D3B8E', O: '#2E9E6B', annual: '#8E44AD', sick: '#C0392B', emergency: '#D35400', compassionate: '#5D6D7E', holiday: '#C9A227', note: '#E84393', common: '#00A8A8' };
const DEF_HOURS = { W: { s: '07:00', e: '19:00' }, M: { s: '06:00', e: '14:00' }, E: { s: '14:00', e: '22:00' }, N: { s: '22:00', e: '06:00' } };
const HOLS = ['accession', 'national', 'hijri', 'mawlid', 'isra', 'fitr', 'adha'];
const uid = () => Math.random().toString(36).slice(2, 10);
function defaults() {
  return {
    v: 1, lang: 'ar', theme: 'default', weekStart: 0, weekend: [5, 6], showHijri: true, hijriOffset: 0, hijriMonthStarts: {},
    colors: Object.assign({}, DEF_COLORS), profiles: [], active: null, compare: null, compareOn: false,
    leaves: [], balance: { total: 30, carry: 0, exclOff: true, exclHol: true },
    holidays: { enabled: HOLS.reduce((o, k) => (o[k] = true, o), {}), overrides: {} },
    notes: {}, notif: false
  };
}
let S;
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
  S = Object.assign(defaults(), d || {});
  S.colors = Object.assign({}, DEF_COLORS, S.colors || {});
  S.balance = Object.assign(defaults().balance, S.balance || {});
  S.holidays = Object.assign(defaults().holidays, S.holidays || {});
  S.holidays.enabled = Object.assign(defaults().holidays.enabled, S.holidays.enabled || {});
  S.dismissed = S.dismissed || []; S.kept = S.kept || {};
  loadRemote();
}
function loadRemote() { try { REMOTE = JSON.parse(localStorage.getItem(RKEY) || '{}') || {}; } catch (e) { REMOTE = {}; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} holCache = {}; }

/* ---------------- Shift engine ---------------- */
function seqOf(p) {
  if (!p) return [];
  if (p.mode === 'full') { const a = []; for (let i = 0; i < (+p.work || 0); i++) a.push('W'); for (let i = 0; i < (+p.off || 0); i++) a.push('O'); return a; }
  return (p.seq || []).slice();
}
function shiftAt(p, n) {
  const s = seqOf(p); if (!s.length || !p.anchor) return null;
  const a = parseIso(p.anchor); const L = s.length;
  return s[(((n - a) % L) + L) % L];
}
const isWork = k => k && k !== 'O';
function hoursOf(p, k) {
  if (!isWork(k)) return 0;
  const h = (p.hours && p.hours[k]) || DEF_HOURS[k]; if (!h) return 0;
  const toM = s => { const [a, b] = (s || '0:0').split(':').map(Number); return a * 60 + (b || 0); };
  let d = toM(h.e) - toM(h.s); if (d <= 0) d += 1440; // night shift across midnight
  return d / 60;
}
const activeP = () => S.profiles.find(p => p.id === S.active) || S.profiles[0] || null;
const compareP = () => (S.compareOn && S.compare) ? S.profiles.find(p => p.id === S.compare && p.id !== (activeP() || {}).id) : null;

/* ---------------- Holidays ---------------- */
let holCache = {};
function holidaysOfYear(Y) {
  if (holCache[Y]) return holCache[Y];
  const list = [];
  const push = (id, key, s, e, conf) => {
    const ov = S.holidays.overrides[key], rv = REMOTE.holidays && REMOTE.holidays[key];
    const src = ov || rv;
    const st = src ? parseIso(src.s) : s, en = src ? parseIso(src.e) : e;
    list.push({ id, key, s: st, e: en, edited: !!ov, conf: ov || rv ? true : conf, official: rv || null, calc: { s, e } });
  };
  push('accession', 'accession-' + Y, dn(Y, 1, 11), dn(Y, 1, 11), true);
  push('national', 'national-' + Y, dn(Y, 11, 18), dn(Y, 11, 19), true);
  const h1 = toHijri(dn(Y, 1, 1)).y - 1, h2 = toHijri(dn(Y, 12, 31)).y + 1;
  const known = (y, m) => !!(S.hijriMonthStarts[y + '-' + m] || (REMOTE.hijri && REMOTE.hijri[y + '-' + m]) || OMAN_MONTH_STARTS[y + '-' + m]);
  for (let hy = h1; hy <= h2; hy++) {
    push('hijri', 'hijri-' + hy, monthStart(hy, 1), monthStart(hy, 1), known(hy, 1));
    push('mawlid', 'mawlid-' + hy, monthStart(hy, 3) + 11, monthStart(hy, 3) + 11, known(hy, 3));
    push('isra', 'isra-' + hy, monthStart(hy, 7) + 26, monthStart(hy, 7) + 26, known(hy, 7));
    push('fitr', 'fitr-' + hy, monthStart(hy, 9) + 28, monthStart(hy, 10) + 2, known(hy, 9) && known(hy, 10));
    push('adha', 'adha-' + hy, monthStart(hy, 12) + 8, monthStart(hy, 12) + 11, known(hy, 12));
  }
  (REMOTE.extra || []).forEach(x => {
    if (!x || !x.id || !x.s || !x.e) return;
    const key = 'x_' + x.id, ov = S.holidays.overrides[key], s = parseIso(x.s), e = parseIso(x.e);
    list.push({ id: key, key, name: x.name, s: ov ? parseIso(ov.s) : s, e: ov ? parseIso(ov.e) : e, edited: !!ov, conf: true, official: { s: x.s, e: x.e }, calc: { s, e } });
  });
  const y0 = dn(Y, 1, 1), y1 = dn(Y, 12, 31);
  const out = list.filter(h => h.e >= y0 && h.s <= y1).sort((a, b) => a.s - b.s);
  holCache[Y] = out; return out;
}
const holOn = id => S.holidays.enabled[id] !== false;
const holName = h => h.name ? (typeof h.name === 'string' ? h.name : (h.name[S.lang] || h.name.ar)) : t('hol_' + h.id);
function holidayAt(n) {
  const Y = fromDn(n).y;
  return holidaysOfYear(Y).find(h => holOn(h.id) && n >= h.s && n <= h.e) || null;
}
function leaveAt(n) { return S.leaves.find(l => n >= parseIso(l.s) && n <= parseIso(l.e)) || null; }

/* ---------------- Day info ---------------- */
function info(n, p) {
  p = p || activeP();
  return { n, k: p ? shiftAt(p, n) : null, hol: holidayAt(n), lv: leaveAt(n), notes: S.notes[iso(n)] || [] };
}
function monthStats(y, m) {
  const p = activeP(), c = compareP();
  const r = { work: 0, off: 0, annual: 0, other: 0, hours: 0, common: 0, hol: [] };
  const D = daysInMonth(y, m);
  for (let d = 1; d <= D; d++) {
    const n = dn(y, m, d), x = info(n, p);
    if (x.lv) { if (x.lv.type === 'annual') r.annual++; else r.other++; }
    else if (isWork(x.k)) { r.work++; r.hours += hoursOf(p, x.k); }
    else if (x.k === 'O') r.off++;
    if (c) {
      const a = x.lv || x.k === 'O', b = shiftAt(c, n) === 'O';
      if (a && b) r.common++;
    }
  }
  holidaysOfYear(y).forEach(h => {
    if (!holOn(h.id)) return;
    for (let n = h.s; n <= h.e; n++) {
      const f = fromDn(n); if (f.m !== m || f.y !== y) continue;
      const x = info(n, p);
      r.hol.push({ h, n, st: x.lv ? 'leave' : (isWork(x.k) ? 'work' : 'off') });
    }
  });
  return r;
}
function leaveDaysCount(l) {
  const p = activeP(); let c = 0;
  for (let n = parseIso(l.s); n <= parseIso(l.e); n++) {
    if (S.balance.exclOff && p && shiftAt(p, n) === 'O') continue;
    if (S.balance.exclHol && holidayAt(n)) continue;
    c++;
  }
  return c;
}
function balanceOf(Y) {
  const y0 = dn(Y, 1, 1), y1 = dn(Y, 12, 31); let used = 0;
  S.leaves.filter(l => l.type === 'annual').forEach(l => {
    const s = Math.max(parseIso(l.s), y0), e = Math.min(parseIso(l.e), y1);
    if (s <= e) used += leaveDaysCount({ s: iso(s), e: iso(e) });
  });
  const total = (+S.balance.total || 0) + (+S.balance.carry || 0);
  return { total, used, remain: total - used };
}

/* ---------------- Countdown ---------------- */
function countdown() {
  const p = activeP(), n0 = todayDn();
  if (!p || !seqOf(p).length) return { big: '', txt: t('cdNoProfile'), sub: '' };
  const x = info(n0, p); let big = '', txt = '', sub = '';
  if (x.lv) { txt = t('inLeave')(t(x.lv.type + 'L')); }
  else if (x.hol) { txt = t('inHoliday')(holName(x.hol)); }
  if (!txt) {
    const w = isWork(x.k); let k = 1;
    while (k < 400 && isWork(shiftAt(p, n0 + k)) === w) k++;
    if (k === 1) txt = w ? t('cdLastWork') : t('cdLastOff');
    else { big = String(k); txt = w ? t('cdWork')(k) : t('cdOff')(k); }
  }
  // next event: annual/other leave or public holiday within 90 days
  let best = null;
  S.leaves.forEach(l => { const s = parseIso(l.s); if (s > n0 && (!best || s < best.n)) best = { n: s, name: t(l.type + 'L') }; });
  for (const Y of [fromDn(n0).y, fromDn(n0).y + 1]) holidaysOfYear(Y).forEach(h => {
    if (holOn(h.id) && h.s > n0 && (!best || h.s < best.n)) best = { n: h.s, name: holName(h), hol: h.id };
  });
  if (best && best.n - n0 <= 90) {
    const em = best.hol === 'fitr' || best.hol === 'adha' || best.hol === 'hijri' ? ' 🌙' : best.hol ? ' 🎉' : ' 🏝️';
    sub = t('cdEvent')(best.n - n0, best.name) + em;
  }
  return { big, txt, sub };
}

/* ---------------- UI helpers ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICON = {
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
  palm: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21c0-5 0-8 1-11"/><path d="M13 10c-2-3-6-3-8-1 3 0 5 0 8 1zM13 10c2-3 6-3 8-1-3 0-5 0-8 1zM13 10c-1-3-3-5-6-5 2 1 4 3 6 5zM13 10c1-3 3-5 6-5-2 1-4 3-6 5z"/><path d="M8 21h9"/></svg>',
  shift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 20a6.5 6.5 0 0 0-3-5.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>'
};
let toastT;
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }
function openSheet(html) { $('#sheet').innerHTML = '<div class="grab"></div>' + html; $('#overlay').classList.add('open'); const f = $('#sheet').querySelector('input,select,button'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 50); }
function closeSheet() { $('#overlay').classList.remove('open'); $('#sheet').innerHTML = ''; }
const sw = (id, on, label) => '<label class="row between" style="min-height:44px"><span>' + esc(label) + '</span><span class="switch"><input type="checkbox" data-sw="' + id + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(label) + '"><span></span></span></label>';
const fmtDate = (n, long) => { const f = fromDn(n); return (long ? t('wd')[f.w] + '، ' : '') + f.d + ' ' + t('months')[f.m - 1] + ' ' + f.y; };
const fmtH = n => { const h = toHijri(n); return h.d + ' ' + t('hmonths')[h.m - 1] + ' ' + h.y + (S.lang === 'ar' ? 'هـ' : ' AH'); };
function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function shareOrDownload(name, blob) {
  try {
    const f = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: t('app') }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  download(name, blob);
}

/* ---------------- Views ---------------- */
let view = 'cal', cur = (() => { const f = fromDn(todayDn()); return { y: f.y, m: f.m }; })();
function render() {
  document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  document.body.dataset.theme = S.theme;
  document.body.style.setProperty('--common', S.colors.common);
  const tabs = [['cal', ICON.cal, t('calendar')], ['leaves', ICON.palm, t('leaves')], ['shifts', ICON.shift, t('shifts')], ['settings', ICON.gear, t('settings')]];
  $('#tabs .in').innerHTML = tabs.map(([k, i, l]) => '<button type="button" data-tab="' + k + '"' + (view === k ? ' aria-current="page"' : '') + '>' + i + '<span>' + esc(l) + '</span></button>').join('');
  const app = $('#app');
  const head = '<header class="topbar"><img src="icon-192.png" alt=""><h1>' + esc(t('app')) + '</h1>' +
    (view === 'cal' ? '<button class="btn icon" type="button" data-act="exportImg" aria-label="' + esc(t('exportImg')) + '" title="' + esc(t('exportImg')) + '">' + ICON.img + '</button>' : '') + '</header>';
  app.innerHTML = head + (view === 'cal' ? vCal() : view === 'leaves' ? vLeaves() : view === 'shifts' ? vShifts() : vSettings());
  const fab = $('#fab'); const tf = fromDn(todayDn());
  const off = view === 'cal' && (cur.y !== tf.y || cur.m !== tf.m);
  setTabsH();
  fab.className = 'fab' + (off ? ' show' : ''); fab.innerHTML = ICON.today + '<span>' + esc(t('jumpToday')) + '</span>';
}
function setTabsH() { const tb = $('#tabs'); if (tb) document.documentElement.style.setProperty('--tabsH', tb.offsetHeight + 'px'); }
window.addEventListener('resize', setTabsH);
function weekOrder() { const o = []; for (let i = 0; i < 7; i++) o.push((S.weekStart + i) % 7); return o; }
function cellHtml(n, inMonth) {
  if (!inMonth) return '<div class="cell empty" aria-hidden="true"></div>';
  const p = activeP(), c = compareP(), x = info(n, p), f = fromDn(n), C = S.colors;
  let col = null, tag = '';
  if (x.lv) { col = C[x.lv.type]; tag = t(x.lv.type); }
  else if (x.k) { col = C[x.k]; tag = t(x.k + 's'); }
  let html = '';
  let cls = 'cell';
  if (c) {
    const k2 = shiftAt(c, n); const col2 = k2 ? C[k2] : null;
    cls += ' split';
    if (col) html += '<span class="fill" style="background:linear-gradient(' + (S.lang === 'ar' ? 'to left' : 'to right') + ',' + col + ' 50%, ' + (col2 || 'transparent') + ' 50%)"></span>';
    else if (col2) html += '<span class="fill" style="background:linear-gradient(' + (S.lang === 'ar' ? 'to left' : 'to right') + ',transparent 50%, ' + col2 + ' 50%)"></span>';
    if (col) html += '<span class="bar" style="background:' + col + '"></span>';
    if (col2) html += '<span class="barb" style="background:' + col2 + '"></span>';
    if ((x.lv || x.k === 'O') && k2 === 'O') cls += ' common';
    tag = (x.lv ? t(x.lv.type + 'i') : x.k ? t(x.k + 'i') : '') + (k2 ? '/' + t(k2 + 'i') : '');
  } else if (col) {
    html += '<span class="fill" style="background:' + col + '"></span><span class="bar" style="background:' + col + '"></span>';
  }
  if (x.hol) html += '<span class="hol" style="background:' + C.holiday + '"></span>';
  if (x.notes.length) html += '<span class="note" style="background:' + C.note + '"></span>';
  if (n === todayDn()) cls += ' today';
  if (S.weekend.includes(f.w)) cls += ' we';
  const h = S.showHijri ? toHijri(n) : null;
  const hTxt = h ? h.d : '';
  const lbl = fmtDate(n, true) + (tag ? '، ' + tag : '') + (x.hol ? '، ' + holName(x.hol) : '') + (x.notes.length ? '، ' + t('note') : '');
  return '<button type="button" class="' + cls + '" data-day="' + n + '" aria-label="' + esc(lbl) + '"' + (x.hol ? ' style="border-color:' + C.holiday + '"' : '') + '>' + html +
    '<span class="n">' + f.d + '</span>' + (h ? '<span class="h"' + (h.d === 1 ? ' style="color:var(--brand);font-weight:700" title="' + esc(t('hmonths')[h.m - 1]) + '"' : '') + '>' + esc(hTxt) + '</span>' : '') + '<span class="tag">' + esc(tag) + '</span></button>';
}
const MSG_COLORS = { brand: '#E9724C', navy: '#1B2A4A', green: '#2E8B57', gold: '#B7861F', purple: '#6C4AB6' };
function nowLocal() { const d = new Date(), z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()); }
function activeMessages() {
  const now = nowLocal();
  return (REMOTE.messages || []).filter(m => m && m.id && !S.dismissed.includes(m.id) && (!m.from || m.from <= now) && (!m.to || m.to >= now));
}
function conflicts() {
  const out = [], seen = {}, y0 = fromDn(todayDn()).y;
  [y0, y0 + 1].forEach(Y => holidaysOfYear(Y).forEach(h => {
    const ov = S.holidays.overrides[h.key], rv = h.official; if (!ov || !rv || seen[h.key]) return; seen[h.key] = 1;
    const sig = rv.s + '|' + rv.e; if ((ov.s === rv.s && ov.e === rv.e) || S.kept[h.key] === sig) return;
    out.push({ kind: 'hol', key: h.key, sig, name: holName(h), date: fmtDate(parseIso(rv.s)) + (rv.e !== rv.s ? ' ← ' + fmtDate(parseIso(rv.e)) : '') });
  }));
  Object.keys(S.hijriMonthStarts).forEach(k => {
    const rv = REMOTE.hijri && REMOTE.hijri[k]; if (!rv || rv === S.hijriMonthStarts[k] || S.kept['h:' + k] === rv) return;
    const [y, m] = k.split('-').map(Number);
    out.push({ kind: 'hij', key: 'h:' + k, k, sig: rv, name: t('monthWord') + ' ' + t('hmonths')[m - 1] + ' ' + y, date: fmtDate(parseIso(rv)) });
  });
  return out;
}
function noticesHtml() {
  let h = '';
  activeMessages().forEach(m => {
    const bg = MSG_COLORS[m.color] || MSG_COLORS.brand;
    const link = m.link && /^https?:\/\//.test(m.link) ? '<div class="btns"><a class="btn" href="' + esc(m.link) + '" target="_blank" rel="noopener">' + esc(m.linkText || m.link) + '</a></div>' : '';
    h += '<section class="notice" style="background:' + bg + '">' + (m.emoji ? '<div class="ic" aria-hidden="true">' + esc(m.emoji) + '</div>' : '') +
      '<div class="grow">' + (m.title ? '<h3>' + esc(m.title) + '</h3>' : '') + '<p style="white-space:pre-line">' + esc(m.text || '') + '</p>' + link + '</div>' +
      '<button class="x" type="button" data-act="dismissMsg" data-id="' + esc(m.id) + '" aria-label="' + esc(t('hide')) + '">×</button></section>';
  });
  conflicts().forEach(c => {
    h += '<section class="notice" style="background:#1B2A4A"><div class="ic" aria-hidden="true">🔔</div><div class="grow"><h3>' + esc(t('newOfficial')) + '</h3><p>' + esc(t('newOfficialTxt')(c.name, c.date)) + '</p>' +
      '<div class="btns"><button class="btn" type="button" data-act="adoptOfficial" data-kind="' + c.kind + '" data-key="' + esc(c.key) + '">' + esc(t('adopt')) + '</button><button class="btn" type="button" data-act="keepMine" data-key="' + esc(c.key) + '" data-sig="' + esc(c.sig) + '">' + esc(t('keepMine')) + '</button></div></div></section>';
  });
  return h;
}
function vCal() {
  const { y, m } = cur, p = activeP(), c = compareP();
  const cd = countdown();
  let html = noticesHtml() + '<section class="card count" aria-live="polite">' + (cd.big ? '<div class="big">' + cd.big + '</div>' : '') + '<div class="grow"><div class="txt">' + esc(cd.txt) + '</div>' + (cd.sub ? '<div class="muted small">' + esc(cd.sub) + '</div>' : '') + '</div></section>';
  const first = dn(y, m, 1), last = dn(y, m, daysInMonth(y, m));
  const h1 = toHijri(first), h2 = toHijri(last);
  const hRange = S.showHijri ? (t('hmonths')[h1.m - 1] + (h1.m !== h2.m ? ' – ' + t('hmonths')[h2.m - 1] : '') + ' ' + h2.y + (S.lang === 'ar' ? 'هـ' : ' AH')) : '';
  html += '<section class="card"><div class="calhead"><button class="btn icon ghost" type="button" data-act="prev" aria-label="' + esc(t('prev')) + '">' + (S.lang === 'ar' ? ICON.prev : ICON.next) + '</button>' +
    '<div class="title"><b>' + esc(t('months')[m - 1]) + ' ' + y + '</b><span>' + esc(hRange) + '</span></div>' +
    '<button class="btn icon ghost" type="button" data-act="next" aria-label="' + esc(t('next')) + '">' + (S.lang === 'ar' ? ICON.next : ICON.prev) + '</button></div>';
  if (S.profiles.length > 1) {
    html += '<div class="row" style="margin-top:10px"><select data-act="pickActive" aria-label="' + esc(t('active')) + '" class="grow" style="flex:1">' +
      S.profiles.map(q => '<option value="' + q.id + '"' + (p && q.id === p.id ? ' selected' : '') + '>' + esc(q.name) + '</option>').join('') + '</select>' +
      (S.compare ? '<button class="btn" type="button" data-act="toggleCompare" aria-pressed="' + !!c + '">' + ICON.users + esc(c ? t('compareOff') : t('compare')) + '</button>' : '') + '</div>';
  }
  const wo = weekOrder();
  html += '<div class="wk" aria-hidden="true">' + wo.map(w => '<div' + (S.weekend.includes(w) ? ' class="we"' : '') + '>' + esc(t('wds')[w]) + '</div>').join('') + '</div>';
  const lead = (fromDn(first).w - S.weekStart + 7) % 7;
  let cells = '';
  for (let i = 0; i < lead; i++) cells += cellHtml(0, false);
  for (let n = first; n <= last; n++) cells += cellHtml(n, true);
  html += '<div class="grid" id="grid">' + cells + '</div>';
  // legend
  const used = new Set(); for (let n = first; n <= last; n++) { const x = info(n, p); if (x.lv) used.add(x.lv.type); else if (x.k) used.add(x.k); if (c) { const k2 = shiftAt(c, n); if (k2) used.add(k2); } }
  let lg = [...used].map(k => '<span class="chip"><i class="dot" style="background:' + S.colors[k] + '"></i>' + esc((c ? t(k + 'i') + ' · ' : '') + t(k)) + '</span>').join('');
  lg += '<span class="chip"><i class="dot" style="background:' + S.colors.holiday + '"></i>' + esc(t('holiday')) + '</span><span class="chip"><i class="dot" style="background:' + S.colors.note + '"></i>' + esc(t('note')) + '</span>';
  if (c) lg = '<span class="chip">' + esc(p.name) + ' | ' + esc(c.name) + '</span>' + lg + '<span class="chip"><i class="dot" style="background:' + S.colors.common + '"></i>' + esc(t('common')) + '</span>';
  html += '<div class="legend">' + lg + '</div></section>';
  // stats
  const st = monthStats(y, m);
  html += '<section class="card"><div class="stats">' +
    stat(st.work, t('statWork')) + stat(st.off, t('statOff')) + stat(st.annual, t('statAnnual')) + stat(st.other, t('statOther')) + stat(Math.round(st.hours * 10) / 10, t('statHours')) + (c ? stat(st.common, t('statCommon')) : '') + '</div>';
  if (st.hol.length) {
    const seen = {};
    html += '<div class="alerts">' + st.hol.map(o => {
      const nm = holName(o.h); seen[nm] = (seen[nm] || 0) + 1;
      return '<div class="row"><i class="dot" style="background:' + S.colors.holiday + '"></i><span>' + esc(nm) + ' — ' + fromDn(o.n).d + ' ' + esc(t('months')[m - 1]) + ': <b>' + esc(t(o.st === 'work' ? 'holWork' : o.st === 'leave' ? 'holLeave' : 'holOff')) + '</b></span></div>';
    }).join('') + '</div>';
  }
  html += '</section>';
  if (!p) html += '<section class="card"><p>' + esc(t('cdNoProfile')) + '</p><button class="btn primary" type="button" data-act="newProfile">' + ICON.plus + esc(t('newProfile')) + '</button></section>';
  return html;
}
const stat = (v, l) => '<div class="stat"><b>' + v + '</b><span>' + esc(l) + '</span></div>';

function vLeaves() {
  const Y = cur.y, b = balanceOf(Y);
  let html = '<section class="card"><div class="row between"><h2>' + esc(t('balance')) + ' ' + Y + '</h2></div>' +
    '<div class="bal"><div><b>' + b.total + '</b><span class="small muted">' + esc(t('total')) + '</span></div><div><b>' + b.used + '</b><span class="small muted">' + esc(t('used')) + '</span></div><div><b style="color:' + (b.remain < 0 ? '#C0392B' : 'var(--brand)') + '">' + b.remain + '</b><span class="small muted">' + esc(t('remain')) + '</span></div></div>' +
    '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + b.total + '" aria-valuenow="' + b.used + '"><i style="width:' + (b.total ? Math.min(100, b.used / b.total * 100) : 0) + '%"></i></div>' +
    '<div class="pair" style="margin-top:12px"><label class="field">' + esc(t('yearlyDays')) + '<input type="number" min="0" max="365" inputmode="numeric" data-bal="total" value="' + esc(S.balance.total) + '"></label>' +
    '<label class="field">' + esc(t('carry')) + '<input type="number" min="0" max="365" inputmode="numeric" data-bal="carry" value="' + esc(S.balance.carry) + '"></label></div>' +
    sw('exclOff', S.balance.exclOff, t('exclOff')) + sw('exclHol', S.balance.exclHol, t('exclHol')) + '</section>';
  const y0 = dn(Y, 1, 1), y1 = dn(Y, 12, 31);
  const ls = S.leaves.filter(l => parseIso(l.e) >= y0 && parseIso(l.s) <= y1).sort((a, b) => parseIso(a.s) - parseIso(b.s));
  html += '<section class="card"><div class="row between"><h2>' + esc(t('myLeaves')) + '</h2><button class="btn primary" type="button" data-act="newLeave">' + ICON.plus + esc(t('newLeave')) + '</button></div><div class="list">' +
    (ls.length ? ls.map(l => '<div class="item"><i class="dot" style="background:' + S.colors[l.type] + ';width:14px;height:14px"></i><div class="grow"><div class="t">' + esc(t(l.type + 'L')) + ' · ' + esc(S.lang === 'ar' ? nd(leaveDaysCount(l)) : leaveDaysCount(l) + ' ' + t('days')) + '</div><div class="small muted">' + esc(fmtDate(parseIso(l.s))) + ' ← ' + esc(fmtDate(parseIso(l.e))) + (l.note ? ' · ' + esc(l.note) : '') + '</div></div>' +
      '<button class="btn icon ghost" type="button" data-act="editLeave" data-id="' + l.id + '" aria-label="' + esc(t('edit')) + '">' + ICON.pen + '</button></div>').join('') : '<p class="muted">' + esc(t('noLeaves')) + '</p>') + '</div></section>';
  // holidays
  const hs = holidaysOfYear(Y);
  html += '<section class="card"><h2>' + esc(t('officialHol')) + ' ' + Y + '</h2><p class="small muted">' + esc(t('holNote')) + '</p><div class="list">' +
    hs.map(h => '<div class="item"><span class="switch"><input type="checkbox" data-hol="' + h.id + '"' + (holOn(h.id) ? ' checked' : '') + ' aria-label="' + esc(holName(h)) + '"><span></span></span><div class="grow"><div class="t">' + esc(holName(h)) + '</div><div class="small muted">' +
      esc(fmtDate(h.s)) + (h.e !== h.s ? ' ← ' + esc(fmtDate(h.e)) : '') + ' · <span style="color:' + (h.conf ? '#2E9E6B' : 'var(--muted)') + '">' + esc(h.conf ? t('official') : t('estimated')) + '</span></div></div>' +
      '<button class="btn icon ghost" type="button" data-act="editHol" data-key="' + h.key + '" aria-label="' + esc(t('edit')) + '">' + ICON.pen + '</button></div>').join('') + '</div>' +
    '<div class="row" style="margin-top:10px"><button class="btn" type="button" data-act="yearPrev">' + (Y - 1) + '</button><span class="grow"></span><button class="btn" type="button" data-act="yearNext">' + (Y + 1) + '</button></div></section>';
  return html;
}
function seqSummary(p) {
  const sq = seqOf(p); if (!sq.length) return '';
  const runs = []; sq.forEach(k => { const r = runs[runs.length - 1]; if (r && r.k === k) r.n++; else runs.push({ k, n: 1 }); });
  const cnt = {}; sq.forEach(k => cnt[k] = (cnt[k] || 0) + 1);
  const chips = ['W', 'M', 'E', 'N', 'O'].filter(k => cnt[k]).map(k => '<span class="chip"><i class="dot" style="background:' + S.colors[k] + '"></i>' + cnt[k] + ' ' + esc(t(k)) + '</span>').join('');
  return '<div class="segbar" role="img" aria-label="' + esc(t('cycle') + ' ' + sq.length) + '">' + runs.map(r => '<i style="flex:' + r.n + ';background:' + S.colors[r.k] + '"></i>').join('') + '</div><div class="row" style="margin-top:8px;gap:6px">' + chips + '</div>';
}
function tokHtml(k) { return '<span class="tok" style="background:' + S.colors[k] + '">' + esc(t(k + 's')) + '</span>'; }
function vShifts() {
  const a = activeP();
  let html = '<section class="card"><div class="row between"><h2>' + esc(t('profiles')) + '</h2><button class="btn primary" type="button" data-act="newProfile">' + ICON.plus + esc(t('newProfile')) + '</button></div><div class="list">';
  html += S.profiles.map(p => {
    const s = seqOf(p);
    return '<div class="item pcard"><div class="grow"><div class="t">' + esc(p.name) + (a && a.id === p.id ? ' <span class="chip">' + esc(t('active')) + '</span>' : '') + '</div>' +
      '<div class="small muted">' + esc(p.mode === 'full' ? t('modeFull') + ' ' + p.work + '/' + p.off : t('modePeriods')) + ' · ' + esc(t('cycle')) + ' ' + s.length + ' · ' + esc(fmtDate(parseIso(p.anchor))) + '</div>' +
      seqSummary(p) + '</div>' +
      '<div class="pact">' + (a && a.id === p.id ? '' : '<button class="btn" type="button" data-act="activate" data-id="' + p.id + '">' + esc(t('useThis')) + '</button>') +
      '<button class="btn icon" type="button" data-act="shareProfile" data-id="' + p.id + '" aria-label="' + esc(t('share')) + '">' + ICON.share + '</button>' +
      '<button class="btn icon" type="button" data-act="editProfile" data-id="' + p.id + '" aria-label="' + esc(t('edit')) + '">' + ICON.pen + '</button></div></div>';
  }).join('') || '<p class="muted">' + esc(t('cdNoProfile')) + '</p>';
  html += '</div></section>';
  if (S.profiles.length > 1) {
    html += '<section class="card"><h2>' + ICON.users.replace('<svg', '<svg style="width:20px;height:20px;vertical-align:-4px"') + ' ' + esc(t('compareWith')) + '</h2><div class="row"><select data-act="pickCompare" class="grow" aria-label="' + esc(t('compareWith')) + '"><option value="">' + esc(t('none')) + '</option>' +
      S.profiles.filter(p => !a || p.id !== a.id).map(p => '<option value="' + p.id + '"' + (S.compare === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></div>' +
      (S.compare ? sw('compareOn', S.compareOn, t('compare')) : '') + '</section>';
  }
  return html;
}
function vSettings() {
  const seg = (act, cur2, opts) => '<div class="seg" role="group">' + opts.map(([v, l]) => '<button type="button" data-act="' + act + '" data-v="' + v + '" aria-pressed="' + (String(cur2) === String(v)) + '">' + esc(l) + '</button>').join('') + '</div>';
  let html = '<section class="card"><h2>' + esc(t('lang')) + '</h2>' + seg('lang', S.lang, [['ar', 'العربية'], ['en', 'English']]) +
    '<h3>' + esc(t('theme')) + '</h3>' + seg('theme', S.theme, Object.keys(T.ar.themes).map(k => [k, t('themes')[k]])) + '</section>';
  html += '<section class="card"><h2>' + esc(t('weekStart')) + '</h2>' + seg('weekStart', S.weekStart, [[6, t('wd')[6]], [0, t('wd')[0]], [1, t('wd')[1]]]) +
    '<h3>' + esc(t('weekend')) + ' <span class="small">(' + esc(t('weekendHint')) + ')</span></h3><div class="days7">' +
    [0, 1, 2, 3, 4, 5, 6].map(w => '<button type="button" data-act="weekend" data-v="' + w + '" aria-pressed="' + S.weekend.includes(w) + '">' + esc(t('wds')[w]) + '</button>').join('') + '</div></section>';
  html += '<section class="card"><h2>' + esc(t('hijri')) + '</h2>' + sw('showHijri', S.showHijri, t('showHijri')) +
    '<div class="row between" style="min-height:44px"><span>' + esc(t('hijriOffset')) + '</span>' + seg('hijriOffset', S.hijriOffset, [[-1, '-1'], [0, '0'], [1, '+1']]) + '</div>' +
    '<h3>' + esc(t('hijriFix')) + '</h3><p class="small muted">' + esc(t('hijriFixHint')) + '</p>';
  const hNow = toHijri(todayDn());
  const opts = []; for (let i = -2; i <= 14; i++) { const a = (hNow.y - 1) * 12 + (hNow.m - 1) + i; const y = Math.floor(a / 12) + 1, m = a % 12 + 1; opts.push([y + '-' + m, t('hmonths')[m - 1] + ' ' + y]); }
  html += '<div class="pair"><label class="field">' + esc(t('month')) + '<select id="hfM">' + opts.map(([v, l]) => '<option value="' + v + '"' + (v === hNow.y + '-' + hNow.m ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select></label>' +
    '<label class="field">' + esc(t('startsOn')) + '<input type="date" id="hfD" value="' + iso(monthStart(hNow.y, hNow.m)) + '"></label></div><button class="btn primary full" type="button" data-act="hijriFix" style="margin-top:10px">' + esc(t('apply')) + '</button>';
  const fixes = Object.keys(S.hijriMonthStarts);
  if (fixes.length) html += '<div class="list" style="margin-top:8px">' + fixes.map(k => { const [y, m] = k.split('-').map(Number); return '<div class="item"><div class="grow">' + esc(t('hmonths')[m - 1] + ' ' + y) + ': ' + esc(fmtDate(parseIso(S.hijriMonthStarts[k]))) + '</div><button class="btn icon ghost" type="button" data-act="delFix" data-k="' + k + '" aria-label="' + esc(t('del')) + '">' + ICON.trash + '</button></div>'; }).join('') + '</div>';
  html += '</section>';
  const ck = ['W', 'M', 'E', 'N', 'O', 'annual', 'sick', 'emergency', 'compassionate', 'holiday', 'note', 'common'];
  html += '<section class="card"><h2>' + esc(t('colors')) + '</h2><div class="list">' + ck.map(k => '<label class="item" style="cursor:pointer"><span class="grow">' + esc(t(k)) + '</span><input type="color" data-color="' + k + '" value="' + S.colors[k] + '" aria-label="' + esc(t(k)) + '"></label>').join('') +
    '</div><div class="row" style="margin-top:8px"><button class="btn ghost" type="button" data-act="resetColors">↺</button></div></section>';
  html += '<section class="card"><h2>' + esc(t('notif')) + '</h2>' + sw('notif', S.notif, t('notifOn')) + '<p class="small muted">' + esc(t('notifHint')) + '</p>' +
    '<h3>' + esc(t('ics')) + '</h3><div class="row"><label class="field">' + esc(t('icsRange')) + '<select id="icsR"><option value="3">' + esc(t('monthsN')(3)) + '</option><option value="6" selected>' + esc(t('monthsN')(6)) + '</option><option value="12">' + esc(t('monthsN')(12)) + '</option></select></label></div>' +
    '<div class="grid2" style="margin-top:10px"><button class="btn" type="button" data-act="icsShifts">' + ICON.cal + esc(t('icsShifts')) + '</button><button class="btn" type="button" data-act="icsNotes">' + ICON.cal + esc(t('icsNotes')) + '</button></div></section>';
  html += '<section class="card"><h2>' + esc(t('backup')) + '</h2><p class="small muted">' + esc(t('backupHint')) + '</p><div class="grid2"><button class="btn" type="button" data-act="exportJson">' + esc(t('exportJson')) + '</button>' +
    '<label class="btn" style="cursor:pointer">' + esc(t('importJson')) + '<input type="file" accept="application/json,.json" id="impJson" class="sr"></label></div>' +
    '<button class="btn danger full" type="button" data-act="resetAll" style="margin-top:10px">' + ICON.trash + esc(t('resetAll')) + '</button></section>';
  html += '<div class="credit"><img src="icon-192.png" alt="" style="width:56px;height:56px;border-radius:14px"><div><b>' + esc(t('app')) + '</b></div><div>' + esc(t('credit')) + ' <b>' + esc(t('author')) + '</b></div><div class="small">' + esc(t('version')) + ' ' + VERSION + '</div></div>';
  return html;
}

/* ---------------- Sheets ---------------- */
function daySheet(n) {
  const p = activeP(), c = compareP(), x = info(n, p);
  let html = '<h2>' + esc(fmtDate(n, true)) + '</h2><p class="muted" style="margin-top:-6px">' + esc(fmtH(n)) + '</p><div class="row" style="margin-bottom:10px">';
  if (x.k) html += '<span class="chip"><i class="dot" style="background:' + S.colors[x.k] + '"></i>' + esc((p ? p.name + ': ' : '') + t(x.k)) + (isWork(x.k) && p ? ' · ' + esc(((p.hours || {})[x.k] || DEF_HOURS[x.k]).s + '–' + ((p.hours || {})[x.k] || DEF_HOURS[x.k]).e) : '') + '</span>';
  if (c) { const k2 = shiftAt(c, n); if (k2) html += '<span class="chip"><i class="dot" style="background:' + S.colors[k2] + '"></i>' + esc(c.name + ': ' + t(k2)) + '</span>'; }
  if (x.lv) html += '<span class="chip"><i class="dot" style="background:' + S.colors[x.lv.type] + '"></i>' + esc(t(x.lv.type + 'L')) + '</span>';
  if (x.hol) html += '<span class="chip"><i class="dot" style="background:' + S.colors.holiday + '"></i>' + esc(holName(x.hol)) + '</span>';
  html += '</div><h3>' + esc(t('note')) + '</h3><div class="list">' + x.notes.map(no => '<div class="item"><i class="dot" style="background:' + S.colors.note + '"></i><div class="grow"><div>' + esc(no.text) + '</div>' + (no.time ? '<div class="small muted">' + esc(t('reminder')) + ' ' + esc(no.time) + '</div>' : '') + '</div>' +
    '<button class="btn icon ghost" type="button" data-act="noteIcs" data-n="' + n + '" data-id="' + no.id + '" aria-label="' + esc(t('toCal')) + '">' + ICON.cal + '</button>' +
    '<button class="btn icon ghost" type="button" data-act="delNote" data-n="' + n + '" data-id="' + no.id + '" aria-label="' + esc(t('del')) + '">' + ICON.trash + '</button></div>').join('') + '</div>' +
    '<div class="pair" style="margin-top:10px"><label class="field">' + esc(t('noteText')) + '<input type="text" id="noteT" maxlength="200"></label><label class="field">' + esc(t('time')) + '<input type="time" id="noteTm"></label></div>' +
    '<button class="btn primary full" type="button" data-act="addNote" data-n="' + n + '" style="margin-top:10px">' + ICON.plus + esc(t('addNote')) + '</button>' +
    '<div class="actions"><button class="btn" type="button" data-act="newLeave" data-n="' + n + '">' + ICON.palm + esc(t('addLeaveHere')) + '</button><button class="btn" type="button" data-act="close">' + esc(t('close')) + '</button></div>';
  openSheet(html);
}
function leaveSheet(l, startN) {
  const isNew = !l; l = l || { id: uid(), type: 'annual', s: iso(startN || todayDn()), e: iso(startN || todayDn()), note: '' };
  const types = ['annual', 'sick', 'emergency', 'compassionate'];
  openSheet('<h2>' + esc(isNew ? t('newLeave') : t('edit')) + '</h2><div class="row"><label class="field">' + esc(t('type')) + '<select id="lvT">' + types.map(k => '<option value="' + k + '"' + (l.type === k ? ' selected' : '') + '>' + esc(t(k + 'L')) + '</option>').join('') + '</select></label></div>' +
    '<div class="pair" style="margin-top:8px"><label class="field">' + esc(t('from')) + '<input type="date" id="lvS" value="' + l.s + '"></label><label class="field">' + esc(t('to')) + '<input type="date" id="lvE" value="' + l.e + '"></label></div>' +
    '<div class="row" style="margin-top:8px"><label class="field">' + esc(t('optNote')) + '<input type="text" id="lvN" maxlength="120" value="' + esc(l.note) + '"></label></div>' +
    '<div class="actions"><button class="btn primary" type="button" data-act="saveLeave" data-id="' + l.id + '">' + esc(t('save')) + '</button><button class="btn" type="button" data-act="close">' + esc(t('cancel')) + '</button>' +
    (isNew ? '' : '<button class="btn danger span2" type="button" data-act="delLeave" data-id="' + l.id + '">' + ICON.trash + esc(t('del')) + '</button>') + '</div>');
}
let draft = null;
function profileSheet(p) {
  const isNew = !p;
  draft = p ? JSON.parse(JSON.stringify(p)) : { id: uid(), name: S.profiles.length ? t('newProfile') + ' ' + (S.profiles.length + 1) : t('defaultProfile'), anchor: iso(todayDn()), mode: 'full', work: 14, off: 14, seq: ['M', 'M', 'E', 'E', 'N', 'N', 'O', 'O', 'O', 'O'], hours: JSON.parse(JSON.stringify(DEF_HOURS)) };
  draft.hours = Object.assign(JSON.parse(JSON.stringify(DEF_HOURS)), draft.hours || {});
  draft._new = isNew; renderProfileSheet();
}
function renderProfileSheet() {
  const p = draft, hr = k => '<div class="pair3" style="margin-top:8px"><span>' + tokHtml(k) + '</span><label class="field">' + esc(t('start')) + '<input type="time" data-hr="' + k + '.s" value="' + p.hours[k].s + '"></label><label class="field">' + esc(t('end')) + '<input type="time" data-hr="' + k + '.e" value="' + p.hours[k].e + '"></label></div>';
  let html = '<h2>' + esc(p._new ? t('newProfile') : t('edit')) + '</h2>' +
    '<div class="pair"><label class="field">' + esc(t('name')) + '<input type="text" id="pfN" maxlength="40" value="' + esc(p.name) + '"></label><label class="field">' + esc(t('anchor')) + '<input type="date" id="pfA" value="' + p.anchor + '"></label></div>' +
    '<h3>' + esc(t('mode')) + '</h3><div class="seg" role="group"><button type="button" data-act="pfMode" data-v="full" aria-pressed="' + (p.mode === 'full') + '">' + esc(t('modeFull')) + '</button><button type="button" data-act="pfMode" data-v="periods" aria-pressed="' + (p.mode === 'periods') + '">' + esc(t('modePeriods')) + '</button></div>';
  if (p.mode === 'full') {
    html += '<div class="pair" style="margin-top:8px"><label class="field">' + esc(t('workDays')) + '<input type="number" min="1" max="120" inputmode="numeric" id="pfW" value="' + p.work + '"></label><label class="field">' + esc(t('offDays')) + '<input type="number" min="0" max="120" inputmode="numeric" id="pfO" value="' + p.off + '"></label></div>' +
      '<div class="row" style="margin-top:8px">' + [[14, 14], [28, 28], [21, 7], [7, 7], [4, 4], [5, 2]].map(([w, o]) => '<button class="btn" type="button" data-act="pfPreset" data-w="' + w + '" data-o="' + o + '">' + w + '/' + o + '</button>').join('') + '</div>' +
      '<h3>' + esc(t('hours')) + '</h3>' + hr('W');
  } else {
    html += '<h3>' + esc(t('seqTitle')) + ' (' + p.seq.length + ')</h3><p class="small muted">' + esc(t('seqHint')) + '</p><div class="seq" aria-live="polite">' + (p.seq.map(tokHtml).join('') || '—') + '</div>' +
      '<div class="row">' + ['M', 'E', 'N', 'O'].map(k => '<button class="btn" type="button" data-act="seqAdd" data-k="' + k + '" style="border-color:' + S.colors[k] + '">+ ' + esc(t(k)) + '</button>').join('') +
      '<button class="btn ghost" type="button" data-act="seqUndo">' + esc(t('undo')) + '</button><button class="btn ghost" type="button" data-act="seqClear">' + esc(t('clear')) + '</button></div>' +
      '<h3>' + esc(t('presets')) + '</h3><div class="row">' + [['MMEENNOOOO', '2-2-2-4'], ['MMNNOOOO', '2-2-4'], ['MENO', '1-1-1-1'], ['MMMMEEEENNNNOOOO', '4-4-4-4'], ['NNNNOOOO', '4N-4'], ['MMMMMOO', '5-2']].map(([s, l]) => '<button class="btn" type="button" data-act="seqPreset" data-s="' + s + '">' + l + '</button>').join('') + '</div>' +
      '<h3>' + esc(t('hours')) + '</h3>' + hr('M') + hr('E') + hr('N');
  }
  html += '<div class="actions"><button class="btn primary" type="button" data-act="saveProfile">' + esc(t('save')) + '</button><button class="btn" type="button" data-act="close">' + esc(t('cancel')) + '</button>' +
    (p._new ? '' : '<button class="btn danger span2" type="button" data-act="delProfile">' + ICON.trash + esc(t('del')) + '</button>') + '</div>';
  const keep = $('#overlay').classList.contains('open') ? $('#sheet').scrollTop : 0;
  openSheet(html); $('#sheet').scrollTop = keep;
}
function syncDraft() {
  const g = id => document.getElementById(id);
  if (g('pfN')) draft.name = g('pfN').value.trim() || draft.name;
  if (g('pfA')) draft.anchor = g('pfA').value || draft.anchor;
  if (g('pfW')) draft.work = Math.max(1, +g('pfW').value || 1);
  if (g('pfO')) draft.off = Math.max(0, +g('pfO').value || 0);
  document.querySelectorAll('[data-hr]').forEach(i => { const [k, f] = i.dataset.hr.split('.'); if (i.value) draft.hours[k][f] = i.value; });
}
function holSheet(key) {
  const h = holidaysOfYear(cur.y).find(x => x.key === key); if (!h) return;
  openSheet('<h2>' + esc(holName(h)) + '</h2><p class="muted">' + esc(fmtH(h.s)) + '</p><div class="pair"><label class="field">' + esc(t('from')) + '<input type="date" id="hoS" value="' + iso(h.s) + '"></label><label class="field">' + esc(t('to')) + '<input type="date" id="hoE" value="' + iso(h.e) + '"></label></div>' +
    '<div class="actions"><button class="btn primary" type="button" data-act="saveHol" data-key="' + key + '">' + esc(t('save')) + '</button><button class="btn" type="button" data-act="close">' + esc(t('cancel')) + '</button>' +
    (h.edited ? '<button class="btn span2" type="button" data-act="resetHol" data-key="' + key + '">' + esc(t('resetDate')) + '</button>' : '') + '</div>');
}

/* ---------------- Share link + QR ---------------- */
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
function shareUrl(p) {
  const o = { n: p.name, a: p.anchor, m: p.mode === 'full' ? 'f' : 'p', w: p.work, o: p.off, s: p.mode === 'full' ? '' : p.seq.join(''), h: p.hours };
  const base = location.href.split('#')[0].split('?')[0];
  return base + '#s=' + b64e(JSON.stringify(o));
}
function drawQR(text, canvas) {
  const q = new QRLib(-1, 1); q.addData(text); q.make();
  const N = q.getModuleCount(), sc = Math.max(4, Math.floor(480 / (N + 8))), size = (N + 8) * sc;
  canvas.width = canvas.height = size; const g = canvas.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#1B2A4A';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (q.isDark(r, c)) g.fillRect((c + 4) * sc, (r + 4) * sc, sc, sc);
}
function shareSheet(p) {
  const url = shareUrl(p);
  openSheet('<h2>' + esc(t('shareTitle')) + ': ' + esc(p.name) + '</h2><p class="small muted">' + esc(t('shareHint')) + '</p><div class="qr"><canvas id="qrC" role="img" aria-label="QR"></canvas></div>' +
    '<input type="text" readonly value="' + esc(url) + '" id="shU" aria-label="URL" style="direction:ltr;font-size:13px"><div class="row" style="margin-top:10px"><button class="btn primary" type="button" data-act="copyLink">' + esc(t('copyLink')) + '</button>' +
    (navigator.share ? '<button class="btn" type="button" data-act="nativeShare">' + ICON.share + esc(t('share')) + '</button>' : '') + '<span class="grow"></span><button class="btn ghost" type="button" data-act="close">' + esc(t('close')) + '</button></div>');
  try { drawQR(url, $('#qrC')); } catch (e) { $('#qrC').remove(); }
}
let pendingImport = null;
function checkImport() {
  const m = location.hash.match(/#s=([A-Za-z0-9_-]+)/); if (!m) return;
  try {
    const o = JSON.parse(b64d(m[1]));
    pendingImport = { id: uid(), name: String(o.n || 'Shift').slice(0, 40), anchor: /^\d{4}-\d{2}-\d{2}$/.test(o.a) ? o.a : iso(todayDn()), mode: o.m === 'f' ? 'full' : 'periods', work: +o.w || 14, off: +o.o || 0, seq: String(o.s || '').split('').filter(k => 'MENO'.includes(k)), hours: Object.assign(JSON.parse(JSON.stringify(DEF_HOURS)), o.h || {}) };
    openSheet('<h2>' + esc(t('importAsk')) + '</h2><p><b>' + esc(pendingImport.name) + '</b></p>' + seqSummary(pendingImport) +
      '<div class="row" style="margin-top:12px"><button class="btn primary" type="button" data-act="importAdd">' + esc(t('importAdd')) + '</button>' + (S.profiles.length ? '<button class="btn" type="button" data-act="importCompare">' + esc(t('importCompare')) + '</button>' : '') + '<button class="btn ghost" type="button" data-act="close">' + esc(t('cancel')) + '</button></div>');
  } catch (e) {}
  try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) {}
}

/* ---------------- ICS ---------------- */
const icsD = n => iso(n).replace(/-/g, '');
const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
function icsWrap(evs) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ejazati//AR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc(t('app'))]
    .concat(evs.map(e => ['BEGIN:VEVENT', 'UID:' + e.uid + '@ejazati', 'DTSTAMP:' + stamp].concat(e.lines).concat(['SUMMARY:' + icsEsc(e.sum)], e.alarm ? ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.sum), 'TRIGGER:' + e.alarm, 'END:VALARM'] : [], ['END:VEVENT']).join('\r\n')))
    .concat(['END:VCALENDAR']).join('\r\n');
}
function icsShifts(months) {
  const p = activeP(); if (!p) return toast(t('cdNoProfile'));
  const s0 = todayDn(), f = fromDn(s0), e0 = dn(f.y, f.m + months, f.d);
  const evs = []; let n = s0;
  while (n < e0) {
    const lv = leaveAt(n), k = lv ? 'L:' + lv.type : shiftAt(p, n); let m = n + 1;
    while (m < e0) { const lv2 = leaveAt(m); const k2 = lv2 ? 'L:' + lv2.type : shiftAt(p, m); if (k2 !== k) break; m++; }
    const nm = k && k.startsWith('L:') ? t(k.slice(2) + 'L') : t(k);
    const len = m - n;
    if (k && k !== 'O' && !k.startsWith('L:') && p.mode === 'periods') {
      for (let d = n; d < m; d++) {
        const h = p.hours[k] || DEF_HOURS[k], st = icsD(d) + 'T' + h.s.replace(':', '') + '00';
        const endDay = hoursOf(p, k) && h.e <= h.s ? d + 1 : d;
        evs.push({ uid: p.id + '-' + d, sum: p.name + ' · ' + nm, lines: ['DTSTART:' + st, 'DTEND:' + icsD(endDay) + 'T' + h.e.replace(':', '') + '00'], alarm: '-PT60M' });
      }
    } else if (k) {
      evs.push({ uid: p.id + '-' + n + '-' + k, sum: p.name + ' · ' + nm + ' (' + len + ')', lines: ['DTSTART;VALUE=DATE:' + icsD(n), 'DTEND;VALUE=DATE:' + icsD(m)], alarm: k === 'W' ? '-PT12H' : null });
    }
    n = m;
  }
  shareOrDownload('ejazati-shifts.ics', new Blob([icsWrap(evs)], { type: 'text/calendar' }));
}
function noteEvent(n, no) {
  return no.time ? { uid: no.id, sum: no.text, lines: ['DTSTART:' + icsD(n) + 'T' + no.time.replace(':', '') + '00', 'DURATION:PT30M'], alarm: '-PT0M' }
    : { uid: no.id, sum: no.text, lines: ['DTSTART;VALUE=DATE:' + icsD(n), 'DTEND;VALUE=DATE:' + icsD(n + 1)], alarm: '-PT9H' };
}
function icsNotes() {
  const evs = []; Object.keys(S.notes).forEach(k => { const n = parseIso(k); if (n >= todayDn() - 1) S.notes[k].forEach(no => evs.push(noteEvent(n, no))); });
  shareOrDownload('ejazati-notes.ics', new Blob([icsWrap(evs)], { type: 'text/calendar' }));
}

/* ---------------- Month image (Canvas) ---------------- */
async function exportImage() {
  try { await Promise.all([document.fonts.load('700 40px Thmanyah'), document.fonts.load('400 20px Thmanyah')]); } catch (e) {}
  const { y, m } = cur, p = activeP(), c = compareP(), rtl = S.lang === 'ar';
  const W = 1080, rowsN = Math.ceil(((fromDn(dn(y, m, 1)).w - S.weekStart + 7) % 7 + daysInMonth(y, m)) / 7), H = 200 + 24 + rowsN * Math.min(150, 860 / rowsN) + 330, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const dark = S.theme === 'dark';
  const BG = dark ? '#0B0F17' : '#F7F3EC', TX = dark ? '#EEF1F6' : '#1B2A4A', MU = dark ? '#A3ABBC' : '#5D6577', CB = dark ? '#151B27' : '#FFFFFF';
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  g.direction = rtl ? 'rtl' : 'ltr';
  const F = (w, s) => w + ' ' + s + 'px Thmanyah, system-ui, sans-serif';
  const rr = (x, yy, w, h, r) => { g.beginPath(); g.moveTo(x + r, yy); g.arcTo(x + w, yy, x + w, yy + h, r); g.arcTo(x + w, yy + h, x, yy + h, r); g.arcTo(x, yy + h, x, yy, r); g.arcTo(x, yy, x + w, yy, r); g.closePath(); };
  // logo
  const lx = rtl ? W - 60 - 84 : 60, ly = 56;
  g.fillStyle = '#F4ECDF'; rr(lx, ly, 84, 84, 20); g.fill();
  g.save(); g.translate(lx + 42, ly + 42); const R = 27;
  g.fillStyle = '#E9724C'; g.beginPath(); g.arc(0, 0, R, Math.PI / 2, Math.PI * 1.5); g.fill();
  g.fillStyle = '#1B2A4A'; g.beginPath(); g.arc(0, 0, R, -Math.PI / 2, Math.PI / 2); g.fill();
  g.fillStyle = '#FFF4E6'; g.beginPath(); g.arc(-12, 0, 6, 0, 7); g.fill();
  g.fillStyle = '#F4ECDF'; g.beginPath(); g.arc(12, 0, 7, 0, 7); g.fill(); g.fillStyle = '#1B2A4A'; g.beginPath(); g.arc(15, -2.5, 6, 0, 7); g.fill();
  g.restore();
  g.textAlign = rtl ? 'right' : 'left'; g.fillStyle = TX;
  const tx = rtl ? W - 60 - 84 - 24 : 60 + 84 + 24;
  g.font = F(700, 52); g.fillText(t('months')[m - 1] + ' ' + y, tx, 102);
  const h1 = toHijri(dn(y, m, 1)), h2 = toHijri(dn(y, m, daysInMonth(y, m)));
  g.font = F(400, 26); g.fillStyle = MU;
  g.fillText((p ? p.name + (c ? ' | ' + c.name : '') + ' · ' : '') + t('hmonths')[h1.m - 1] + (h1.m !== h2.m ? ' – ' + t('hmonths')[h2.m - 1] : '') + ' ' + h2.y + (rtl ? 'هـ' : ' AH'), tx, 140);
  // grid
  const gx = 60, gw = W - 120, cw = gw / 7, top = 200, wo = weekOrder();
  const colX = i => rtl ? gx + gw - (i + 1) * cw : gx + i * cw;
  g.textAlign = 'center'; g.font = F(700, 24);
  wo.forEach((w, i) => { g.fillStyle = S.weekend.includes(w) ? '#E9724C' : MU; g.fillText(t('wds')[w], colX(i) + cw / 2, top); });
  const lead = (fromDn(dn(y, m, 1)).w - S.weekStart + 7) % 7, D = daysInMonth(y, m), rows = Math.ceil((lead + D) / 7), ch = Math.min(150, 860 / rows);
  for (let d = 1; d <= D; d++) {
    const idx = lead + d - 1, r = Math.floor(idx / 7), ci = idx % 7, n = dn(y, m, d), x = info(n, p);
    const X = colX(ci) + 5, Y2 = top + 24 + r * ch, w = cw - 10, h = ch - 10;
    g.fillStyle = CB; rr(X, Y2, w, h, 18); g.fill();
    const col = x.lv ? S.colors[x.lv.type] : x.k ? S.colors[x.k] : null;
    const k2 = c ? shiftAt(c, n) : null, col2 = k2 ? S.colors[k2] : null;
    g.save(); rr(X, Y2, w, h, 18); g.clip();
    if (c) {
      const half = w / 2, aX = rtl ? X + half : X, bX = rtl ? X : X + half;
      if (col) { g.globalAlpha = .22; g.fillStyle = col; g.fillRect(aX, Y2, half, h); g.globalAlpha = 1; g.fillRect(aX, Y2 + h - 8, half, 8); }
      if (col2) { g.globalAlpha = .22; g.fillStyle = col2; g.fillRect(bX, Y2, half, h); g.globalAlpha = 1; g.fillRect(bX, Y2 + h - 8, half, 8); }
    } else if (col) { g.globalAlpha = .22; g.fillStyle = col; g.fillRect(X, Y2, w, h); g.globalAlpha = 1; g.fillRect(X, Y2 + h - 8, w, 8); }
    g.restore();
    if (c && (x.lv || x.k === 'O') && k2 === 'O') { g.strokeStyle = S.colors.common; g.lineWidth = 5; rr(X + 2.5, Y2 + 2.5, w - 5, h - 5, 16); g.stroke(); }
    if (x.hol) { g.strokeStyle = S.colors.holiday; g.lineWidth = 4; rr(X + 2, Y2 + 2, w - 4, h - 4, 16); g.stroke(); g.fillStyle = S.colors.holiday; g.beginPath(); g.arc(rtl ? X + w - 18 : X + 18, Y2 + 18, 7, 0, 7); g.fill(); }
    if (x.notes.length) { g.fillStyle = S.colors.note; g.beginPath(); g.arc(rtl ? X + 18 : X + w - 18, Y2 + 18, 7, 0, 7); g.fill(); }
    g.fillStyle = S.weekend.includes(fromDn(n).w) ? '#E9724C' : TX; g.font = F(700, Math.round(ch * .27)); g.fillText(String(d), X + w / 2, Y2 + ch * .36);
    if (S.showHijri) { const hh = toHijri(n); g.fillStyle = MU; g.font = F(400, Math.round(ch * .14)); g.fillText(String(hh.d), X + w / 2, Y2 + ch * .55); }
    let tag = x.lv ? t(x.lv.type) : x.k ? t(x.k + 's') : ''; if (c) tag = (x.lv ? t(x.lv.type + 'i') : x.k ? t(x.k + 'i') : '') + (k2 ? '/' + t(k2 + 'i') : '');
    g.fillStyle = TX; g.font = F(700, Math.round(ch * (c ? .12 : .15))); g.fillText(tag, X + w / 2, Y2 + h - 18);
  }
  // stats + legend
  const st = monthStats(y, m); let sy = top + 24 + rows * ch + 40;
  const items = [[st.work, t('statWork')], [st.off, t('statOff')], [st.annual, t('statAnnual')], [st.other, t('statOther')], [Math.round(st.hours), t('statHours')]];
  if (c) items.push([st.common, t('statCommon')]);
  const sw2 = gw / items.length;
  items.forEach(([v, l], i) => { const cx = rtl ? gx + gw - (i + .5) * sw2 : gx + (i + .5) * sw2; g.fillStyle = TX; g.font = F(700, 44); g.fillText(String(v), cx, sy + 30); g.fillStyle = MU; g.font = F(400, 22); g.fillText(l, cx, sy + 64); });
  sy += 110;
  if (st.hol.length) {
    g.textAlign = rtl ? 'right' : 'left'; g.font = F(400, 24); g.fillStyle = TX;
    const lines = []; st.hol.forEach(o => { const s = holName(o.h) + ': ' + t(o.st === 'work' ? 'holWork' : o.st === 'leave' ? 'holLeave' : 'holOff'); if (!lines.includes(s)) lines.push(s); });
    lines.slice(0, 3).forEach((s, i) => g.fillText('• ' + s, rtl ? W - 60 : 60, sy + i * 34)); sy += Math.min(3, lines.length) * 34;
  }
  g.textAlign = 'center'; g.fillStyle = MU; g.font = F(400, 22); g.fillText(t('generated'), W / 2, H - 40);
  cv.toBlob(b => b && shareOrDownload('ejazati-' + y + '-' + String(m).padStart(2, '0') + '.png', b), 'image/png');
}

/* ---------------- Reminders ---------------- */
let actx;
function beep() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [0, .25, .5].forEach(dt => { const o = actx.createOscillator(), gg = actx.createGain(); o.frequency.value = 880; o.connect(gg); gg.connect(actx.destination); gg.gain.setValueAtTime(.0001, actx.currentTime + dt); gg.gain.exponentialRampToValueAtTime(.3, actx.currentTime + dt + .02); gg.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + dt + .2); o.start(actx.currentTime + dt); o.stop(actx.currentTime + dt + .22); });
  } catch (e) {}
}
function checkReminders() {
  const k = iso(todayDn()), list = S.notes[k]; if (!list) return;
  const now = new Date(), hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  let ch = false;
  list.forEach(no => {
    if (no.time && !no.done && no.time <= hm) {
      no.done = true; ch = true; toast('⏰ ' + no.text); beep();
      try { if (S.notif && 'Notification' in window && Notification.permission === 'granted') new Notification(t('app'), { body: no.text, icon: 'icon-192.png' }); } catch (e) {}
    }
  });
  if (ch) save();
}

/* ---------------- Events ---------------- */
document.addEventListener('click', async e => {
  const tab = e.target.closest('[data-tab]'); if (tab) { view = tab.dataset.tab; render(); window.scrollTo(0, 0); return; }
  if (e.target.id === 'overlay') { closeSheet(); return; }
  const day = e.target.closest('[data-day]'); if (day) { daySheet(+day.dataset.day); return; }
  if (e.target.closest('#fab')) { const f = fromDn(todayDn()); cur = { y: f.y, m: f.m }; render(); return; }
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT') return;
  const a = b.dataset.act, id = b.dataset.id;
  const shiftMonth = d => { let m = cur.m + d, y = cur.y; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } cur = { y, m }; render(); };
  switch (a) {
    case 'prev': shiftMonth(-1); break;
    case 'next': shiftMonth(1); break;
    case 'close': closeSheet(); break;
    case 'exportImg': exportImage(); break;
    case 'dismissMsg': if (!S.dismissed.includes(id)) S.dismissed.push(id); save(); render(); break;
    case 'adoptOfficial': if (b.dataset.kind === 'hol') delete S.holidays.overrides[b.dataset.key]; else delete S.hijriMonthStarts[b.dataset.key.slice(2)]; save(); render(); toast(t('saved')); break;
    case 'keepMine': S.kept[b.dataset.key] = b.dataset.sig; save(); render(); break;
    case 'toggleCompare': S.compareOn = !S.compareOn; save(); render(); break;
    case 'addNote': {
      const n = +b.dataset.n, tx = $('#noteT').value.trim(); if (!tx) { $('#noteT').focus(); return; }
      const k = iso(n); (S.notes[k] = S.notes[k] || []).push({ id: uid(), text: tx, time: $('#noteTm').value || '' }); save(); daySheet(n); render(); toast(t('saved')); break;
    }
    case 'delNote': { const k = iso(+b.dataset.n); S.notes[k] = (S.notes[k] || []).filter(x => x.id !== id); if (!S.notes[k].length) delete S.notes[k]; save(); daySheet(+b.dataset.n); render(); break; }
    case 'noteIcs': { const n = +b.dataset.n, no = (S.notes[iso(n)] || []).find(x => x.id === id); if (no) shareOrDownload('ejazati-note.ics', new Blob([icsWrap([noteEvent(n, no)])], { type: 'text/calendar' })); break; }
    case 'newLeave': leaveSheet(null, b.dataset.n ? +b.dataset.n : null); break;
    case 'editLeave': leaveSheet(S.leaves.find(l => l.id === id)); break;
    case 'saveLeave': {
      let s = $('#lvS').value, en = $('#lvE').value; if (!s || !en) return toast(t('invalid'));
      if (en < s) [s, en] = [en, s];
      const o = { id, type: $('#lvT').value, s, e: en, note: $('#lvN').value.trim() };
      const i = S.leaves.findIndex(l => l.id === id); if (i >= 0) S.leaves[i] = o; else S.leaves.push(o);
      save(); closeSheet(); render(); toast(t('saved')); break;
    }
    case 'delLeave': if (confirm(t('confirmDel'))) { S.leaves = S.leaves.filter(l => l.id !== id); save(); closeSheet(); render(); } break;
    case 'editHol': holSheet(b.dataset.key); break;
    case 'saveHol': { let s = $('#hoS').value, en = $('#hoE').value; if (!s || !en) return; if (en < s) [s, en] = [en, s]; S.holidays.overrides[b.dataset.key] = { s, e: en }; save(); closeSheet(); render(); break; }
    case 'resetHol': delete S.holidays.overrides[b.dataset.key]; save(); closeSheet(); render(); break;
    case 'yearPrev': cur = { y: cur.y - 1, m: cur.m }; render(); break;
    case 'yearNext': cur = { y: cur.y + 1, m: cur.m }; render(); break;
    case 'newProfile': profileSheet(null); break;
    case 'editProfile': profileSheet(S.profiles.find(p => p.id === id)); break;
    case 'activate': S.active = id; if (S.compare === id) S.compare = null; save(); render(); break;
    case 'shareProfile': shareSheet(S.profiles.find(p => p.id === id)); break;
    case 'pfMode': syncDraft(); draft.mode = b.dataset.v; renderProfileSheet(); break;
    case 'pfPreset': syncDraft(); draft.work = +b.dataset.w; draft.off = +b.dataset.o; renderProfileSheet(); break;
    case 'seqAdd': syncDraft(); if (draft.seq.length < 120) draft.seq.push(b.dataset.k); renderProfileSheet(); break;
    case 'seqUndo': syncDraft(); draft.seq.pop(); renderProfileSheet(); break;
    case 'seqClear': syncDraft(); draft.seq = []; renderProfileSheet(); break;
    case 'seqPreset': syncDraft(); draft.seq = b.dataset.s.split(''); renderProfileSheet(); break;
    case 'saveProfile': {
      syncDraft(); const p = draft;
      if (!p.anchor) return toast(t('noAnchor'));
      if (!seqOf(p).length || (p.mode === 'periods' && !p.seq.some(k => k !== 'O'))) return toast(t('invalid'));
      delete p._new; const i = S.profiles.findIndex(x => x.id === p.id); if (i >= 0) S.profiles[i] = p; else S.profiles.push(p);
      if (!S.active || !S.profiles.find(x => x.id === S.active)) S.active = p.id;
      save(); closeSheet(); render(); toast(t('saved')); break;
    }
    case 'delProfile': if (confirm(t('confirmDel'))) { S.profiles = S.profiles.filter(p => p.id !== draft.id); if (S.active === draft.id) S.active = (S.profiles[0] || {}).id || null; if (S.compare === draft.id) S.compare = null; save(); closeSheet(); render(); } break;
    case 'copyLink': { const u = $('#shU').value; try { await navigator.clipboard.writeText(u); } catch (er) { $('#shU').select(); try { document.execCommand('copy'); } catch (x) {} } toast(t('copied')); break; }
    case 'nativeShare': try { await navigator.share({ title: t('app'), url: $('#shU').value }); } catch (er) {} break;
    case 'importAdd': case 'importCompare': {
      if (!pendingImport) return; S.profiles.push(pendingImport);
      if (!S.active) S.active = pendingImport.id;
      else if (a === 'importCompare') { S.compare = pendingImport.id; S.compareOn = true; }
      pendingImport = null; save(); closeSheet(); view = 'cal'; render(); toast(t('saved')); break;
    }
    case 'lang': S.lang = b.dataset.v; save(); render(); break;
    case 'theme': S.theme = b.dataset.v; save(); render(); break;
    case 'weekStart': S.weekStart = +b.dataset.v; save(); render(); break;
    case 'weekend': { const v = +b.dataset.v; if (S.weekend.includes(v)) S.weekend = S.weekend.filter(x => x !== v); else { if (S.weekend.length >= 2) return toast(t('maxWeekend')); S.weekend.push(v); } save(); render(); break; }
    case 'hijriOffset': S.hijriOffset = +b.dataset.v; save(); render(); break;
    case 'hijriFix': { const k = $('#hfM').value, d = $('#hfD').value; if (!d) return toast(t('invalid')); S.hijriMonthStarts[k] = d; save(); render(); toast(t('saved')); break; }
    case 'delFix': delete S.hijriMonthStarts[b.dataset.k]; save(); render(); break;
    case 'resetColors': S.colors = Object.assign({}, DEF_COLORS); save(); render(); break;
    case 'icsShifts': icsShifts(+$('#icsR').value); break;
    case 'icsNotes': icsNotes(); break;
    case 'exportJson': download('ejazati-backup-' + iso(todayDn()) + '.json', JSON.stringify(S, null, 1), 'application/json'); break;
    case 'resetAll': if (confirm(t('confirmReset'))) { try { localStorage.removeItem(KEY); } catch (er) {} load(); render(); } break;
  }
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.id === 'hfM') { const [y, m] = el.value.split('-').map(Number); const d = $('#hfD'); if (d) d.value = iso(monthStart(y, m)); return; }
  if (el.dataset.act === 'pickActive') { S.active = el.value; if (S.compare === el.value) S.compareOn = false; save(); render(); return; }
  if (el.dataset.act === 'pickCompare') { S.compare = el.value || null; S.compareOn = !!el.value; save(); render(); return; }
  if (el.dataset.sw) {
    const k = el.dataset.sw, v = el.checked;
    if (k === 'exclOff' || k === 'exclHol') S.balance[k] = v;
    else if (k === 'notif') {
      S.notif = v;
      if (v && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (er) {} }
    } else S[k] = v;
    save(); render(); return;
  }
  if (el.dataset.hol) { S.holidays.enabled[el.dataset.hol] = el.checked; save(); render(); return; }
  if (el.dataset.bal) { S.balance[el.dataset.bal] = Math.max(0, +el.value || 0); save(); render(); return; }
  if (el.dataset.color) { S.colors[el.dataset.color] = el.value; save(); render(); return; }
  if (el.id === 'impJson' && el.files[0]) {
    try { const d = JSON.parse(await el.files[0].text()); if (!d || typeof d !== 'object' || !Array.isArray(d.profiles)) throw 0; localStorage.setItem(KEY, JSON.stringify(d)); load(); render(); toast(t('imported')); }
    catch (er) { toast(t('invalid')); }
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#overlay').classList.contains('open')) closeSheet(); });
// swipe months
let tx0 = null, ty0 = null;
document.addEventListener('touchstart', e => { if (view !== 'cal' || !e.target.closest('#grid')) { tx0 = null; return; } tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
document.addEventListener('touchend', e => {
  if (tx0 == null) return; const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0; tx0 = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { const fwd = S.lang === 'ar' ? dx > 0 : dx < 0; let m = cur.m + (fwd ? 1 : -1), y = cur.y; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } cur = { y, m }; render(); }
}, { passive: true });

/* ---------------- Admin updates (updates.json) ---------------- */
async function syncRemote() {
  if (!/^https?:/.test(location.protocol)) return;
  try {
    const r = await fetch('updates.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json(); if (!j || typeof j !== 'object') return;
    const changed = JSON.stringify(j) !== JSON.stringify(REMOTE);
    REMOTE = j; try { localStorage.setItem(RKEY, JSON.stringify(j)); } catch (e) {}
    if (changed) { holCache = {}; if (!$('#overlay').classList.contains('open')) render(); }
  } catch (e) {}
}

/* ---------------- Boot ---------------- */
load();
render();
checkImport();
setInterval(checkReminders, 20000); checkReminders();
syncRemote();
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkReminders(); render(); syncRemote(); } });
if ('serviceWorker' in navigator && location.protocol === 'https:') { try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) {} }
window.__ejazati = { setRemote: j => { REMOTE = j; holCache = {}; render(); }, toHijri, monthStart, holidaysOfYear, shiftAt, iso, dn, fromDn, state: () => S };
})();
