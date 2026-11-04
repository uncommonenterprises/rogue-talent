/* Review tool mockups - small demo behaviour only. Nothing here is product code. */
(function () {
  'use strict';

  /* Checklist -> Approve gate (R02, R04) */
  var panel = document.getElementById('review-panel');
  if (panel && panel.hasAttribute('data-interactive')) {
    var boxes = panel.querySelectorAll('input[type="checkbox"]');
    var approve = panel.querySelector('[data-approve]');
    var hint = panel.querySelector('[data-approve-hint]');
    var total = boxes.length;
    var update = function () {
      var n = 0;
      boxes.forEach(function (b) { if (b.checked) n++; });
      document.querySelectorAll('[data-checked-count]').forEach(function (el) { el.textContent = n; });
      var ready = n === total;
      approve.classList.toggle('rt-btn--disabled', !ready);
      approve.setAttribute('aria-disabled', ready ? 'false' : 'true');
      approve.setAttribute('tabindex', ready ? '0' : '-1');
      if (hint) hint.textContent = ready ? 'All ' + total + ' ticked. You can approve.' : 'Tick all ' + total + ' to approve.';
    };
    boxes.forEach(function (b) { b.addEventListener('change', update); });
    approve.addEventListener('click', function (e) { if (approve.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
    update();
  }

  /* Phone gallery counter (R02) */
  var track = document.querySelector('[data-gallery-track]');
  var counter = document.querySelector('[data-gallery-count]');
  if (track && counter) {
    track.addEventListener('scroll', function () {
      var i = Math.round(track.scrollLeft / track.clientWidth) + 1;
      counter.textContent = i + ' / ' + track.children.length;
    });
  }

  /* Queue tabs and empty-state demo (R01) */
  var tabs = document.querySelectorAll('[data-tab]');
  if (tabs.length) {
    var waiting = document.getElementById('q-waiting');
    var decided = document.getElementById('q-decided');
    var empty = document.getElementById('q-empty');
    var emptyTitle = document.getElementById('q-empty-title');
    var emptyText = document.getElementById('q-empty-text');
    var summary = document.getElementById('q-summary');
    var current = 'all';
    var forcedEmpty = false;
    var copy = {
      all: ['Nothing waiting', 'Every submission has a decision. When someone submits, it appears here and you get an email.'],
      model: ['No models waiting', 'Every model profile has a decision. Clients may still be waiting.'],
      client: ['No clients waiting', 'Every client has a decision. Models may still be waiting.']
    };
    var render = function () {
      var isDecided = current === 'decided';
      decided.hidden = !isDecided;
      var shown = 0;
      waiting.querySelectorAll('.q-row').forEach(function (r) {
        var show = !forcedEmpty && (current === 'all' || r.getAttribute('data-type') === current);
        r.hidden = !show;
        if (show) shown++;
      });
      waiting.hidden = isDecided || shown === 0;
      empty.hidden = isDecided || shown !== 0;
      if (!isDecided && shown === 0) {
        var c = copy[current] || copy.all;
        emptyTitle.textContent = c[0];
        emptyText.textContent = c[1];
      }
      summary.hidden = isDecided || forcedEmpty;
    };
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        current = t.getAttribute('data-tab');
        tabs.forEach(function (o) {
          var on = o === t;
          o.classList.toggle('rt-tab--active', on);
          o.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        render();
      });
    });
    var demo = document.querySelector('[data-demo-empty]');
    if (demo) {
      demo.addEventListener('click', function () {
        forcedEmpty = !forcedEmpty;
        demo.textContent = forcedEmpty ? 'Show the queue again' : 'Preview empty state';
        render();
      });
    }
    document.querySelectorAll('[data-tab-link]').forEach(function (l) {
      l.addEventListener('click', function (e) {
        e.preventDefault();
        var t = document.querySelector('[data-tab="' + l.getAttribute('data-tab-link') + '"]');
        if (t) t.click();
      });
    });
    render();
  }

  /* Decline flow: reason + note -> live preview (R03) */
  var form = document.getElementById('decline-form');
  if (form) {
    var REASONS = {
      'photo-quality': "Some of your photos are too small, dark or blurry for us to review properly. Please add clear, well-lit photos that show your face and your full look.",
      'photos-mismatch': "We couldn't confirm that the photos in your portfolio are all of the same person. Please remove any that aren't you, and add a clear, recent photo of your face.",
      'missing-info': "Some details on your profile are missing or incomplete. Please fill in the gaps and resubmit.",
      'contact-details': "Your profile includes contact details or social handles in your photos or text. Please remove them. Messages and bookings all happen on Rogue Talent.",
      'display-name': "Your display name looks like a business name or contact detail. Please use your own name, as you'd like clients to see it.",
      'not-suitable': "Your profile isn't a fit for Rogue Talent at the moment."
    };
    var NOTE_REQUIRED = { 'not-suitable': true };
    var confirmBtn = document.querySelector('[data-confirm]');
    var pvReason = document.getElementById('pv-reason');
    var pvNoteWrap = document.getElementById('pv-note-wrap');
    var pvNote = document.getElementById('pv-note');
    var note = document.getElementById('decline-note');
    var count = document.getElementById('note-count');
    var req = document.getElementById('note-required');
    var opt = document.getElementById('note-optional');
    var help = document.getElementById('decline-help');
    var radios = form.querySelectorAll('input[name="reason"]');
    var refresh = function () {
      var chosen = form.querySelector('input[name="reason"]:checked');
      var key = chosen ? chosen.value : null;
      var text = note.value.trim();
      count.textContent = note.value.length + ' / 300';
      if (key) {
        pvReason.textContent = REASONS[key];
        pvReason.classList.remove('mail__placeholder');
      } else {
        pvReason.textContent = 'Pick a reason and the sentence we send appears here.';
        pvReason.classList.add('mail__placeholder');
      }
      pvNoteWrap.hidden = !text;
      pvNote.textContent = text;
      var needNote = !!(key && NOTE_REQUIRED[key]);
      req.hidden = !needNote;
      opt.hidden = needNote;
      var ok = !!key && (!needNote || !!text);
      confirmBtn.classList.toggle('rt-btn--disabled', !ok);
      confirmBtn.setAttribute('aria-disabled', ok ? 'false' : 'true');
      confirmBtn.setAttribute('tabindex', ok ? '0' : '-1');
      help.textContent = !key ? 'Pick a reason to continue.' : (ok ? 'Check the message above, then decline. Imogen is emailed shortly.' : 'Add a short note for this reason.');
    };
    radios.forEach(function (r) { r.addEventListener('change', refresh); });
    note.addEventListener('input', refresh);
    confirmBtn.addEventListener('click', function (e) { if (confirmBtn.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
    var fill = document.querySelector('[data-fill-example]');
    if (fill) {
      fill.addEventListener('click', function () {
        form.querySelector('input[value="photos-mismatch"]').checked = true;
        note.value = "Photos 2 and 5 look like a different person to the others.";
        refresh();
      });
    }
    refresh();
  }
})();
