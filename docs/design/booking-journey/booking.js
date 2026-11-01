/* Rogue Talent - discovery & booking journey mockups.
   Mock behaviour only (calendar, price maths, sheets, chips). Not product code.
   Mock "today" is Sun 1 Nov 2026, 16:20, so every screen shows the same dates. */
(function () {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var NOW = new Date(2026, 10, 1, 16, 20);
  var TODAY = new Date(2026, 10, 1);
  // Dates the model cannot be booked (blocked or already booked). The reason is never shown to clients.
  var UNAVAILABLE = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-17', '2026-11-30', '2026-12-07', '2026-12-08'];

  var body = document.body;
  var RATE = parseFloat(body.getAttribute('data-rate') || '450');
  var NOTICE_HOURS = parseFloat(body.getAttribute('data-notice-hours') || '48');
  var CTA_HREF = body.getAttribute('data-cta-href') || 'B06-checkout.html';
  // Search context: there is no single model, so no day is struck through.
  var SEARCH_MODE = body.getAttribute('data-search') === 'true';

  var state = { start: null, end: null, picking: false, conflict: null };

  function key(d) {
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function parse(k) {
    var p = k.split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }
  function fmt(d) { return DAY_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + MON_SHORT[d.getMonth()]; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function diffDays(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }
  function money(n) {
    var v = Math.round(n * 100) / 100;
    var parts = v.toFixed(2).split('.');
    var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return '£' + whole + (parts[1] === '00' ? '' : '.' + parts[1]);
  }
  function isUnavailable(d) { return !SEARCH_MODE && UNAVAILABLE.indexOf(key(d)) !== -1; }
  function isPast(d) { return d.getTime() < TODAY.getTime(); }

  function rangeHasUnavailable(a, b) {
    var d = a;
    while (d.getTime() <= b.getTime()) {
      if (isUnavailable(d)) { return d; }
      d = addDays(d, 1);
    }
    return null;
  }

  /* ---------- calendar rendering ---------- */
  function monthHtml(y, m, opts) {
    var first = new Date(y, m, 1);
    var lead = (first.getDay() + 6) % 7;
    var count = new Date(y, m + 1, 0).getDate();
    var h = '<div class="cal__month"><div class="cal__head"><span class="cal__title">' + MONTHS[m] + ' ' + y + '</span>';
    if (opts.nav) {
      var prevDisabled = (y === TODAY.getFullYear() && m === TODAY.getMonth()) ? ' disabled' : '';
      h += '<span class="cal__nav"><button type="button" class="icon-btn" data-cal-nav="-1" aria-label="Previous month"' + prevDisabled + '><i class="ico ico-chev-left"></i></button>' +
        '<button type="button" class="icon-btn" data-cal-nav="1" aria-label="Next month"><i class="ico ico-chev-right"></i></button></span>';
    }
    h += '</div><div class="cal__dow" aria-hidden="true">';
    for (var i = 0; i < 7; i++) { h += '<span>' + DOW[i] + '</span>'; }
    h += '</div><div class="cal__grid" role="grid">';
    for (var b = 0; b < lead; b++) { h += '<span class="cal__blank"></span>'; }
    for (var day = 1; day <= count; day++) {
      var d = new Date(y, m, day);
      var cls = 'cal__day';
      var attrs = '';
      var label = fmt(d);
      if (key(d) === key(TODAY)) { cls += ' is-today'; label += ', today'; }
      if (isPast(d)) { cls += ' is-past'; attrs += ' aria-disabled="true"'; label += ', past'; }
      else if (isUnavailable(d)) { cls += ' is-unavailable'; attrs += ' aria-disabled="true"'; label += ', not available'; }
      if (state.start && state.end && d.getTime() >= state.start.getTime() && d.getTime() <= state.end.getTime()) {
        cls += ' is-in';
        if (key(d) === key(state.start)) { cls += ' is-start'; }
        if (key(d) === key(state.end)) { cls += ' is-end'; }
        if (key(d) === key(state.start) || key(d) === key(state.end)) { attrs += ' aria-pressed="true"'; }
      }
      h += '<button type="button" class="' + cls + '" data-date="' + key(d) + '" aria-label="' + label + '"' + attrs + '>' + day + '</button>';
    }
    h += '</div></div>';
    return h;
  }

  function renderCal(el) {
    var layout = el.getAttribute('data-layout') || 'single';
    var base = (el.getAttribute('data-from') || '2026-11').split('-');
    var y = parseInt(base[0], 10);
    var m = parseInt(base[1], 10) - 1;
    var offset = parseInt(el.getAttribute('data-offset') || '0', 10);
    var html = '';
    if (layout === 'stack') {
      var n = parseInt(el.getAttribute('data-months') || '4', 10);
      for (var i = 0; i < n; i++) {
        var dt = new Date(y, m + i, 1);
        html += monthHtml(dt.getFullYear(), dt.getMonth(), { nav: false });
      }
      el.classList.add('cal--stack');
    } else {
      var cur = new Date(y, m + offset, 1);
      html = monthHtml(cur.getFullYear(), cur.getMonth(), { nav: true });
    }
    el.innerHTML = html;
  }

  /* ---------- bindings (text, visibility, links) ---------- */
  function setText(name, value) {
    var nodes = document.querySelectorAll('[data-bind="' + name + '"]');
    for (var i = 0; i < nodes.length; i++) { nodes[i].textContent = value; }
  }
  function setShow(name, show) {
    var nodes = document.querySelectorAll('[data-show-when="' + name + '"]');
    for (var i = 0; i < nodes.length; i++) { nodes[i].hidden = !show; }
  }

  function update() {
    var cals = document.querySelectorAll('[data-cal]');
    for (var i = 0; i < cals.length; i++) { renderCal(cals[i]); }

    var has = !!(state.start && state.end);
    var days = has ? diffDays(state.start, state.end) + 1 : 0;
    var sub = RATE * days;
    var fee = Math.round(sub * 0.15 * 100) / 100;
    var total = sub + fee;

    setShow('dates', has);
    setShow('nodates', !has);
    setShow('conflict', !!state.conflict);
    var inNotice = false;
    if (has) {
      inNotice = (state.start.getTime() - NOW.getTime()) < NOTICE_HOURS * 3600000;
    }
    setShow('notice', has && inNotice);
    if (state.conflict) { setText('conflictDate', fmt(state.conflict)); }

    setText('startval', has ? fmt(state.start) : 'Add date');
    setText('endval', has ? fmt(state.end) : 'Add date');
    var vals = document.querySelectorAll('[data-bind="startval"], [data-bind="endval"]');
    for (var s = 0; s < vals.length; s++) {
      if (has) { vals[s].classList.remove('is-empty'); } else { vals[s].classList.add('is-empty'); }
    }
    setText('dates', has ? (days === 1 ? fmt(state.start) : fmt(state.start) + ' to ' + fmt(state.end)) : '');
    setText('days', has ? days + (days === 1 ? ' full day' : ' full days') : '');
    setText('rate', has ? money(RATE) + ' x ' + days + (days === 1 ? ' day' : ' days') : '');
    setText('sub', has ? money(sub) : '');
    setText('fee', has ? money(fee) : '');
    setText('total', has ? money(total) : '');
    setText('keeps', has ? money(sub) : '');
    setText('summaryMain', has ? (days === 1 ? fmt(state.start) : fmt(state.start) + ' to ' + fmt(state.end)) : 'No dates chosen yet');
    setText('summarySub', has ? (days === 1 ? '1 full day.' : days + ' full days. Your end date counts as a full day.') : 'Tap a day to start, then tap an end day. Tap one day twice for a single day.');
    setText('ctaLabel', has ? 'Request to book' : 'Select dates');
    setText('sheetCta', has ? 'Request to book' : 'Select your dates');

    var ctas = document.querySelectorAll('[data-cta]');
    for (var c = 0; c < ctas.length; c++) { ctas[c].setAttribute('href', has ? CTA_HREF : '#'); }
    var sheetBtns = document.querySelectorAll('[data-sheet-cta]');
    for (var sb = 0; sb < sheetBtns.length; sb++) {
      sheetBtns[sb].setAttribute('href', has ? CTA_HREF : '#');
      if (has) { sheetBtns[sb].classList.remove('rt-btn--disabled'); } else { sheetBtns[sb].classList.add('rt-btn--disabled'); }
    }
  }

  function pick(d) {
    state.conflict = null;
    if (!state.picking || !state.start) {
      state.start = d; state.end = d; state.picking = true;
    } else if (d.getTime() < state.start.getTime()) {
      state.start = d; state.end = d; state.picking = true;
    } else {
      var bad = rangeHasUnavailable(state.start, d);
      if (bad) {
        state.conflict = bad; state.start = d; state.end = d; state.picking = true;
      } else {
        state.end = d; state.picking = false;
      }
    }
    update();
  }

  /* ---------- sheets, popovers ---------- */
  function openSheet(id) {
    var el = document.getElementById(id);
    if (!el) { return; }
    el.classList.add('is-open');
    if (window.innerWidth < 900) { body.classList.add('is-locked'); }
  }
  function closeSheetEl(el) {
    el.classList.remove('is-open');
    body.classList.remove('is-locked');
  }
  function openCalendar() {
    if (window.innerWidth >= 900) {
      var pop = document.getElementById('cal-popover');
      if (pop) { pop.classList.add('is-open'); return; }
    }
    openSheet('sheet-dates');
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) { return; }

    var dayBtn = t.closest('.cal__day');
    if (dayBtn) {
      if (dayBtn.getAttribute('aria-disabled') === 'true') { return; }
      pick(parse(dayBtn.getAttribute('data-date')));
      return;
    }

    var nav = t.closest('[data-cal-nav]');
    if (nav) {
      var calEl = nav.closest('[data-cal]');
      var off = parseInt(calEl.getAttribute('data-offset') || '0', 10) + parseInt(nav.getAttribute('data-cal-nav'), 10);
      if (off < 0) { off = 0; }
      calEl.setAttribute('data-offset', String(off));
      renderCal(calEl);
      return;
    }

    var opener = t.closest('[data-open-sheet]');
    if (opener) { e.preventDefault(); openSheet(opener.getAttribute('data-open-sheet')); return; }

    var closer = t.closest('[data-close-sheet]');
    if (closer) {
      var root = closer.closest('.sheet-root, .filter-panel');
      if (root) { closeSheetEl(root); }
      if (closer.tagName === 'A') { return; }
      e.preventDefault();
      return;
    }

    if (t.classList.contains('sheet-backdrop')) { closeSheetEl(t.closest('.sheet-root')); return; }

    var calOpen = t.closest('[data-open-calendar]');
    if (calOpen) { e.preventDefault(); openCalendar(); return; }

    var clear = t.closest('[data-clear-dates]');
    if (clear) { e.preventDefault(); state.start = null; state.end = null; state.picking = false; state.conflict = null; update(); return; }

    var popClose = t.closest('[data-close-popover]');
    if (popClose) { e.preventDefault(); var pp = popClose.closest('.popover'); if (pp) { pp.classList.remove('is-open'); } return; }

    var cta = t.closest('[data-cta], [data-sheet-cta]');
    if (cta && cta.getAttribute('href') === '#') {
      e.preventDefault();
      if (!cta.hasAttribute('data-sheet-cta')) { openCalendar(); }
      return;
    }

    var chip = t.closest('button[data-chip]');
    if (chip) {
      var group = chip.closest('[data-chip-group]');
      var single = !!group && group.getAttribute('data-chip-group') === 'single';
      var was = chip.classList.contains('rt-chip--selected');
      if (single) {
        var sibs = group.querySelectorAll('button[data-chip]');
        for (var k = 0; k < sibs.length; k++) {
          sibs[k].classList.remove('rt-chip--selected');
          sibs[k].setAttribute('aria-pressed', 'false');
        }
      }
      if (was) { chip.classList.remove('rt-chip--selected'); chip.setAttribute('aria-pressed', 'false'); }
      else { chip.classList.add('rt-chip--selected'); chip.setAttribute('aria-pressed', 'true'); }
      return;
    }

    // a click outside an open popover closes it
    var pops = document.querySelectorAll('.popover.is-open');
    for (var p = 0; p < pops.length; p++) {
      if (!pops[p].contains(t)) { pops[p].classList.remove('is-open'); }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = document.querySelectorAll('.sheet-root.is-open, .filter-panel.is-open, .popover.is-open');
      for (var i = 0; i < open.length; i++) { open[i].classList.remove('is-open'); }
      body.classList.remove('is-locked');
    }
  });

  /* ---------- radio cards (location type) ---------- */
  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input || input.type !== 'radio') { return; }
    var card = input.closest('.radio-card');
    if (!card) { return; }
    var list = card.parentNode.querySelectorAll('.radio-card');
    for (var i = 0; i < list.length; i++) { list[i].classList.remove('is-checked'); }
    card.classList.add('is-checked');
    var reveals = document.querySelectorAll('[data-reveal-when]');
    for (var r = 0; r < reveals.length; r++) {
      reveals[r].hidden = reveals[r].getAttribute('data-reveal-when') !== input.value;
    }
  });

  /* ---------- checkout: sending the request goes to the confirmation screen ---------- */
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.classList && f.classList.contains('checkout-main')) {
      e.preventDefault();
      window.location.href = 'B07-request-sent.html';
    }
  });

  /* ---------- gallery counter ---------- */
  var track = document.querySelector('[data-gallery-track]');
  var counter = document.querySelector('[data-gallery-count]');
  if (track && counter) {
    var total = track.children.length;
    track.addEventListener('scroll', function () {
      var idx = Math.round(track.scrollLeft / track.clientWidth) + 1;
      counter.textContent = idx + ' / ' + total;
    });
  }

  /* ---------- initial state ---------- */
  var ds = body.getAttribute('data-start');
  var de = body.getAttribute('data-end');
  if (ds && de) { state.start = parse(ds); state.end = parse(de); }
  update();
})();
