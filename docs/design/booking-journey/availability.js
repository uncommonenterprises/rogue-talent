/* Rogue Talent - B03b profile availability mockup.
   Mock behaviour only. Not product code. Patterns reused from booking.js (pick logic, price maths, sheets).
   Mock "today" is Sun 1 Nov 2026, 16:20, the same as every other booking-journey screen.
   Each .pcal element is an independent calendar with its own scenario and selection.
   Scenarios: main, booked (December fully booked), sparse (unavailable by default), own (read-only), loading, error. */
(function () {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var NOW = new Date(2026, 10, 1, 16, 20);
  var TODAY = new Date(2026, 10, 1);
  var RATE = 380;            /* Imogen Hart, day rate (example data) */
  var NOTICE_HOURS = 48;     /* her minimum booking notice */
  var CTA_HREF = 'B06-checkout.html';
  var body = document.body;

  /* Dates Imogen cannot be booked (blocked or already booked). The reason is never shown. */
  var BUSY_MAIN = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-14', '2026-11-15', '2026-11-17', '2026-11-21', '2026-11-22', '2026-11-30', '2026-12-07', '2026-12-08'];
  /* "Unavailable by default": only these dates are open. */
  var OPEN_SPARSE = ['2026-11-24', '2026-11-25', '2026-12-08', '2026-12-09', '2026-12-10', '2026-12-15', '2027-01-12', '2027-01-13'];
  /* December fully booked; January partly booked. */
  var BUSY_BOOKED_JAN = ['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08', '2027-01-11'];

  function key(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function parse(k) { var p = k.split('-'); return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10)); }
  function fmt(d) { return DAY_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + MON_SHORT[d.getMonth()]; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function diffDays(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }
  function money(n) {
    var v = Math.round(n * 100) / 100, parts = v.toFixed(2).split('.');
    return '£' + parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts[1] === '00' ? '' : '.' + parts[1]);
  }
  function isPast(d) { return d.getTime() < TODAY.getTime(); }
  /* Today and anything inside the notice window counts as not available. */
  function inNotice(d) { return d.getTime() < NOW.getTime() + NOTICE_HOURS * 3600000; }

  function isFree(d, sc) {
    if (isPast(d) || inNotice(d)) { return false; }
    var k = key(d);
    if (sc === 'sparse') { return OPEN_SPARSE.indexOf(k) !== -1; }
    if (sc === 'booked') {
      if (d.getFullYear() === 2026 && d.getMonth() === 11) { return false; }
      return BUSY_BOOKED_JAN.indexOf(k) === -1 && BUSY_MAIN.indexOf(k) === -1;
    }
    return BUSY_MAIN.indexOf(k) === -1;
  }
  function rangeHasBusy(a, b, sc) {
    var d = a;
    while (d.getTime() <= b.getTime()) { if (!isFree(d, sc)) { return d; } d = addDays(d, 1); }
    return null;
  }

  /* ---------- per-calendar setup ---------- */
  function baseOf(el) {
    var p = (el.getAttribute('data-from') || '2026-11').split('-');
    return { y: parseInt(p[0], 10), m: parseInt(p[1], 10) - 1 };
  }
  function minOffset(el) {
    var b = baseOf(el);
    return -((b.y - TODAY.getFullYear()) * 12 + (b.m - TODAY.getMonth()));
  }
  function scenarioOf(el) { return el.getAttribute('data-scenario') || 'main'; }

  function monthFree(y, m, sc) {
    var n = new Date(y, m + 1, 0).getDate(), c = 0;
    for (var i = 1; i <= n; i++) { if (isFree(new Date(y, m, i), sc)) { c++; } }
    return c;
  }

  function monthHtml(el, y, m, withNav) {
    var st = el._st, sc = scenarioOf(el), readonly = el.hasAttribute('data-readonly');
    var first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, count = new Date(y, m + 1, 0).getDate();
    var h = '<div class="cal__month"><div class="cal__head"><span class="cal__title">' + MONTHS[m] + ' ' + y + '</span>';
    if (withNav) {
      var atMin = (y === TODAY.getFullYear() && m === TODAY.getMonth());
      h += '<span class="cal__nav"><button type="button" class="icon-btn" data-cal-nav="-1" aria-label="Previous month"' + (atMin ? ' disabled' : '') + '><i class="ico ico-chev-left"></i></button>' +
        '<button type="button" class="icon-btn" data-cal-nav="1" aria-label="Next month"><i class="ico ico-chev-right"></i></button></span>';
    }
    h += '</div><div class="cal__dow" aria-hidden="true">';
    for (var i = 0; i < 7; i++) { h += '<span>' + DOW[i] + '</span>'; }
    h += '</div><div class="cal__grid" role="grid">';
    for (var b = 0; b < lead; b++) { h += '<span class="cal__blank"></span>'; }
    for (var day = 1; day <= count; day++) {
      var d = new Date(y, m, day), cls = 'cal__day', attrs = '', label = fmt(d);
      var free = isFree(d, sc);
      if (key(d) === key(TODAY)) { cls += ' is-today'; label += ', today'; }
      if (isPast(d)) { cls += ' is-past'; attrs += ' aria-disabled="true"'; label += ', past'; }
      else if (!free) { cls += ' is-unavailable'; attrs += ' aria-disabled="true"'; label += ', not available'; }
      else { cls += ' is-free'; label += ', free'; }
      if (st.start && st.end && d.getTime() >= st.start.getTime() && d.getTime() <= st.end.getTime()) {
        cls += ' is-in';
        if (key(d) === key(st.start)) { cls += ' is-start'; }
        if (key(d) === key(st.end)) { cls += ' is-end'; }
        if (key(d) === key(st.start) || key(d) === key(st.end)) { attrs += ' aria-pressed="true"'; label += ', selected'; }
      }
      if (readonly) { h += '<span class="' + cls + ' is-readonly" role="gridcell" aria-label="' + label + '">' + day + '</span>'; }
      else { h += '<button type="button" class="' + cls + '" data-date="' + key(d) + '" aria-label="' + label + '"' + attrs + '>' + day + '</button>'; }
    }
    h += '</div></div>';
    return h;
  }

  function emptyHtml(el, y, m) {
    var sc = scenarioOf(el), off = parseInt(el.getAttribute('data-offset') || '0', 10);
    for (var i = 1; i <= 12; i++) {
      var dt = new Date(y, m + i, 1);
      if (monthFree(dt.getFullYear(), dt.getMonth(), sc) > 0) {
        return '<div class="pcal-empty"><p><strong>No free dates in ' + MONTHS[m] + '.</strong> <button type="button" class="link-btn" data-cal-goto="' + (off + i) + '">See ' + MONTHS[dt.getMonth()] + '</button></p></div>';
      }
    }
    return '<div class="pcal-empty"><p><strong>No free dates in ' + MONTHS[m] + '.</strong> No dates are open in the next 12 months.</p></div>';
  }

  function skeletonHtml() {
    var h = '<div class="cal__month" aria-busy="true"><div class="cal__head"><span class="skel skel--title"></span></div><div class="pcal-skel" aria-hidden="true">';
    for (var i = 0; i < 35; i++) { h += '<span class="skel"></span>'; }
    h += '</div><p class="xs muted" role="status">Loading Imogen\'s calendar</p></div>';
    return h;
  }
  function errorHtml() {
    return '<div class="notice notice--error"><i class="ico ico-alert"></i><p>We couldn\'t load Imogen\'s calendar. <button type="button" class="link-btn" data-retry>Try again</button></p></div>';
  }

  function renderCal(el) {
    var sc = scenarioOf(el), layout = el.getAttribute('data-layout') || 'single';
    if (sc === 'loading') { el.innerHTML = skeletonHtml(); return; }
    if (sc === 'error') { el.innerHTML = errorHtml(); return; }
    var b = baseOf(el), off = parseInt(el.getAttribute('data-offset') || '0', 10), html = '';
    if (layout === 'stack') {
      var n = parseInt(el.getAttribute('data-months') || '4', 10);
      for (var i = 0; i < n; i++) { var dt = new Date(b.y, b.m + i, 1); html += monthHtml(el, dt.getFullYear(), dt.getMonth(), false); }
      el.classList.add('cal--stack');
    } else {
      var cur = new Date(b.y, b.m + off, 1);
      html = monthHtml(el, cur.getFullYear(), cur.getMonth(), true);
      if (monthFree(cur.getFullYear(), cur.getMonth(), sc) === 0) { html += emptyHtml(el, cur.getFullYear(), cur.getMonth()); }
    }
    el.innerHTML = html;
  }

  /* ---------- scope bindings (one panel or sheet at a time) ---------- */
  function scopeOf(el) { return el.closest('[data-pscope]') || document; }
  function setText(scope, name, value) {
    var nodes = scope.querySelectorAll('[data-bind="' + name + '"]');
    for (var i = 0; i < nodes.length; i++) { nodes[i].textContent = value; }
  }
  function setShow(scope, name, show) {
    var nodes = scope.querySelectorAll('[data-show-when="' + name + '"]');
    for (var i = 0; i < nodes.length; i++) { nodes[i].hidden = !show; }
  }

  function nextFree(sc, n) {
    var out = [], d = TODAY, guard = 0;
    while (out.length < n && guard < 400) { if (isFree(d, sc)) { out.push(d); } d = addDays(d, 1); guard++; }
    return out;
  }
  function renderNextFree(scope, sc) {
    var holders = scope.querySelectorAll('[data-nextfree]');
    for (var i = 0; i < holders.length; i++) {
      var list = nextFree(sc, 3), h = '';
      if (!list.length) { holders[i].innerHTML = ''; continue; }
      h = '<span class="nf-lbl">Next free</span>';
      for (var j = 0; j < list.length; j++) {
        h += '<button type="button" class="rt-chip" data-pick-date="' + key(list[j]) + '">' + fmt(list[j]) + '</button>';
      }
      holders[i].innerHTML = h;
    }
  }

  function update(el) {
    var st = el._st, sc = scenarioOf(el), scope = scopeOf(el);
    renderCal(el);
    renderNextFree(scope, sc);
    var has = !!(st.start && st.end);
    var days = has ? diffDays(st.start, st.end) + 1 : 0;
    var sub = RATE * days, fee = Math.round(sub * 0.15 * 100) / 100, total = sub + fee;
    setShow(scope, 'dates', has);
    setShow(scope, 'nodates', !has);
    setShow(scope, 'conflict', !!st.conflict);
    if (st.conflict) { setText(scope, 'conflictDate', fmt(st.conflict)); }
    setText(scope, 'startval', has ? fmt(st.start) : 'Add date');
    setText(scope, 'endval', has ? fmt(st.end) : 'Add date');
    var vals = scope.querySelectorAll('[data-bind="startval"], [data-bind="endval"]');
    for (var s = 0; s < vals.length; s++) { if (has) { vals[s].classList.remove('is-empty'); } else { vals[s].classList.add('is-empty'); } }
    setText(scope, 'rate', has ? money(RATE) + ' x ' + days + (days === 1 ? ' day' : ' days') : '');
    setText(scope, 'sub', has ? money(sub) : '');
    setText(scope, 'fee', has ? money(fee) : '');
    setText(scope, 'total', has ? money(total) : '');
    setText(scope, 'keeps', has ? money(sub) : '');
    setText(scope, 'summaryMain', has ? (days === 1 ? fmt(st.start) : fmt(st.start) + ' to ' + fmt(st.end)) : '');
    setText(scope, 'summarySub', has ? (days === 1 ? '1 full day. Tap a later free day to add days.' : days + ' full days. Your end date counts as a full day.') : '');
    setText(scope, 'ctaLabel', has ? 'Request to book' : 'Select dates');
    setText(scope, 'sheetCta', has ? 'Request to book' : 'Select your dates');
    var ctas = scope.querySelectorAll('[data-cta]');
    for (var c = 0; c < ctas.length; c++) { ctas[c].setAttribute('href', has ? CTA_HREF : '#'); }
    var sheetBtns = scope.querySelectorAll('[data-sheet-cta]');
    for (var sb = 0; sb < sheetBtns.length; sb++) {
      sheetBtns[sb].setAttribute('href', has ? CTA_HREF : '#');
      if (has) { sheetBtns[sb].classList.remove('rt-btn--disabled'); } else { sheetBtns[sb].classList.add('rt-btn--disabled'); }
    }
  }

  function pick(el, d) {
    var st = el._st, sc = scenarioOf(el);
    st.conflict = null;
    if (!st.picking || !st.start) { st.start = d; st.end = d; st.picking = true; }
    else if (d.getTime() < st.start.getTime()) { st.start = d; st.end = d; st.picking = true; }
    else {
      var bad = rangeHasBusy(st.start, d, sc);
      if (bad) { st.conflict = bad; st.start = d; st.end = d; st.picking = true; }
      else { st.end = d; st.picking = false; }
    }
    update(el);
  }

  /* ---------- sheets ---------- */
  function openSheet(id) {
    var s = document.getElementById(id);
    if (!s) { return; }
    s.classList.add('is-open');
    if (window.innerWidth < 900) { body.classList.add('is-locked'); }
  }
  function closeSheetEl(s) { s.classList.remove('is-open'); body.classList.remove('is-locked'); }

  function calsIn(scope) { return scope.querySelectorAll('.pcal'); }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) { return; }

    var dayBtn = t.closest('.cal__day');
    if (dayBtn) {
      if (dayBtn.classList.contains('is-readonly') || dayBtn.getAttribute('aria-disabled') === 'true') { return; }
      var el = dayBtn.closest('.pcal');
      var d = parse(dayBtn.getAttribute('data-date'));
      var handoff = el.getAttribute('data-handoff');
      if (handoff) {
        /* Phone body calendar: tapping a free date opens the B04 sheet with that start date set. */
        var sheet = document.getElementById(handoff), target = sheet && sheet.querySelector('.pcal');
        if (target) { target._st.start = d; target._st.end = d; target._st.picking = true; target._st.conflict = null; update(target); openSheet(handoff); }
        return;
      }
      pick(el, d);
      return;
    }

    var chip = t.closest('[data-pick-date]');
    if (chip) {
      var sc = chip.closest('[data-pscope]'), cal = sc && sc.querySelector('.pcal');
      if (cal) {
        var cd = parse(chip.getAttribute('data-pick-date'));
        var h2 = cal.getAttribute('data-handoff');
        if (h2) {
          var sh = document.getElementById(h2), tg = sh && sh.querySelector('.pcal');
          if (tg) { tg._st.start = cd; tg._st.end = cd; tg._st.picking = true; update(tg); openSheet(h2); }
        } else {
          /* jump the visible month to the chosen date, then pick it */
          var b = baseOf(cal);
          cal.setAttribute('data-offset', String((cd.getFullYear() - b.y) * 12 + (cd.getMonth() - b.m)));
          pick(cal, cd);
        }
      }
      return;
    }

    var nav = t.closest('[data-cal-nav]');
    if (nav) {
      var calEl = nav.closest('.pcal');
      var off = parseInt(calEl.getAttribute('data-offset') || '0', 10) + parseInt(nav.getAttribute('data-cal-nav'), 10);
      if (off < minOffset(calEl)) { off = minOffset(calEl); }
      calEl.setAttribute('data-offset', String(off));
      renderCal(calEl);
      return;
    }

    var go = t.closest('[data-cal-goto]');
    if (go) { var gc = go.closest('.pcal'); gc.setAttribute('data-offset', go.getAttribute('data-cal-goto')); renderCal(gc); return; }

    var retry = t.closest('[data-retry]');
    if (retry) { e.preventDefault(); return; }

    var opener = t.closest('[data-open-sheet]');
    if (opener) { e.preventDefault(); openSheet(opener.getAttribute('data-open-sheet')); return; }

    var closer = t.closest('[data-close-sheet]');
    if (closer) {
      var root = closer.closest('.sheet-root');
      if (root) { closeSheetEl(root); }
      if (closer.tagName === 'A' && closer.getAttribute('href') !== '#') { return; }
      e.preventDefault();
      return;
    }
    if (t.classList.contains('sheet-backdrop')) { closeSheetEl(t.closest('.sheet-root')); return; }

    var clear = t.closest('[data-clear-dates]');
    if (clear) {
      e.preventDefault();
      var sc2 = clear.closest('[data-pscope]'), c2 = sc2 && sc2.querySelector('.pcal');
      if (c2) { c2._st.start = null; c2._st.end = null; c2._st.picking = false; c2._st.conflict = null; update(c2); }
      return;
    }

    var cta = t.closest('[data-cta], [data-sheet-cta], [data-bar-cta]');
    if (cta && cta.getAttribute('href') === '#') {
      e.preventDefault();
      if (cta.hasAttribute('data-sheet-cta')) { return; }
      if (cta.hasAttribute('data-bar-cta')) { openSheet('sheet-dates'); return; }
      /* Desktop panel "Select dates": the calendar is already on screen, so move to the first free day. */
      var psc = cta.closest('[data-pscope]'), first = psc && psc.querySelector('.cal__day.is-free');
      if (first) { first.focus(); }
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = document.querySelectorAll('.sheet-root.is-open');
      for (var i = 0; i < open.length; i++) { open[i].classList.remove('is-open'); }
      body.classList.remove('is-locked');
    }
  });

  /* ---------- gallery counter is not needed here; init all calendars ---------- */
  var cals = document.querySelectorAll('.pcal');
  for (var i = 0; i < cals.length; i++) {
    var el = cals[i];
    el._st = { start: null, end: null, picking: false, conflict: null };
    var ds = el.getAttribute('data-start');
    if (ds) { el._st.start = parse(ds); el._st.end = parse(ds); el._st.picking = true; }
    update(el);
  }
})();
