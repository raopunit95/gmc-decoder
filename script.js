/* ============================================================
   GMC Policy Decoder
   Reads policy_data.json and answers one question:
   "For <corporate> / <grade>, what is covered for <condition>?"
   ============================================================ */

'use strict';

const DATA_URL = 'policy_data.json';
const MAX_OPTIONS = 40;

const state = {
  data: null,
  corporate: null,   // corporate record
  grade: null,       // grade record
  treatment: null    // treatment name (string)
};

const $ = (id) => document.getElementById(id);

/* ─────────────────── Boot ─────────────────── */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  const panel = document.querySelector('#searchView .panel');
  panel.insertAdjacentHTML('afterbegin',
    '<div class="loading" id="boot"><div class="spinner"></div>Loading policy data…</div>');

  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${DATA_URL}`);
    state.data = await res.json();
  } catch (err) {
    $('boot').outerHTML =
      `<div class="fatal"><strong>Could not load policy data.</strong>
       <p>${escapeHtml(err.message)}</p>
       <p>If you opened this file directly from disk, serve the folder over HTTP instead
          (<code>python3 -m http.server</code>) — browsers block <code>fetch</code> on <code>file://</code>.</p></div>`;
    return;
  }

  $('boot').remove();
  wireUp();
  renderDataline();
}

function renderDataline() {
  const m = state.data.meta;
  $('dataline').textContent =
    `${m.corporateCount} corporates · ${m.treatmentCount} conditions · ` +
    `${m.coverageRules.toLocaleString('en-IN')} coverage rules · updated ${m.generatedAt.slice(0, 10)}`;
}

/* ─────────────────── Wiring ─────────────────── */

function wireUp() {
  setupCombo({
    input: $('corporateInput'),
    list: $('corporateList'),
    getItems: () => state.data.corporates.map((c) => ({
      value: c.name,
      sub: c.hasGrades ? `${c.grades.length} plan grades` : 'Single plan',
      payload: c
    })),
    onPick: pickCorporate,
    onClear: () => { pickCorporate(null); }
  });

  setupCombo({
    input: $('treatmentInput'),
    list: $('treatmentList'),
    getItems: () => (state.data.treatments || []).map((t) => ({ value: t, payload: t })),
    onPick: pickTreatment,
    onClear: () => { pickTreatment(null); }
  });

  $('decodeBtn').addEventListener('click', decode);
  $('backBtn').addEventListener('click', showSearch);

  // Suggested-condition chips on the "not listed" card.
  $('resultBody').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-goto]');
    if (!chip) return;
    state.treatment = chip.dataset.goto;
    $('treatmentInput').value = state.treatment;
    decode();
  });
}

/* ─────────────────── Selection handlers ─────────────────── */

function pickCorporate(corporate) {
  state.corporate = corporate;
  state.grade = null;

  const gradeField = $('gradeField');
  const treatmentField = $('treatmentField');

  if (!corporate) {
    gradeField.hidden = true;
    treatmentField.hidden = true;
    $('corporateHint').textContent = 'Type at least one letter to see matches.';
    refreshDecodeButton();
    return;
  }

  $('corporateHint').textContent =
    `${corporate.entityIds.length} policy ${corporate.entityIds.length === 1 ? 'entity' : 'entities'} mapped to this company.`;

  renderGrades(corporate);
  gradeField.hidden = false;
  treatmentField.hidden = false;
  $('treatmentHint').textContent = `${state.data.treatments.length} conditions available.`;
  refreshDecodeButton();
}

function renderGrades(corporate) {
  const box = $('gradeChips');
  const badge = $('gradeOptionalBadge');
  box.innerHTML = '';

  // Single, generic plan → nothing for the user to choose.
  if (!corporate.hasGrades) {
    state.grade = corporate.grades[0];
    badge.hidden = false;
    $('gradeHint').textContent = 'This company has one plan for everyone, so there is no grade to pick.';
    box.innerHTML = '<span class="chip is-selected" aria-disabled="true">Standard plan</span>';
    return;
  }

  badge.hidden = true;
  $('gradeHint').textContent = 'Not sure? Your grade is on your e-card or HR benefits portal.';

  corporate.grades.forEach((grade) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = grade.isDefault ? 'Standard / no grade' : grade.name;
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-checked', 'false');
    chip.addEventListener('click', () => {
      state.grade = grade;
      box.querySelectorAll('.chip').forEach((c) => {
        c.classList.remove('is-selected');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('is-selected');
      chip.setAttribute('aria-checked', 'true');
      refreshDecodeButton();
    });
    box.appendChild(chip);
  });
}

function pickTreatment(name) {
  state.treatment = name;
  refreshDecodeButton();
}

function refreshDecodeButton() {
  $('decodeBtn').disabled = !(state.corporate && state.grade && state.treatment);
}

/* ─────────────────── Combobox ─────────────────── */

function setupCombo({ input, list, getItems, onPick, onClear }) {
  const clearBtn = input.parentElement.querySelector('.combo-clear');
  let items = [];
  let cursor = -1;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    cursor = -1;
  };

  const open = (query) => {
    const q = query.trim().toLowerCase();
    const all = getItems();
    const matched = q
      ? all
          .filter((i) => i.value.toLowerCase().includes(q))
          .sort((a, b) => a.value.toLowerCase().indexOf(q) - b.value.toLowerCase().indexOf(q))
      : all;

    items = matched.slice(0, MAX_OPTIONS);
    list.innerHTML = '';

    if (!items.length) {
      list.innerHTML = '<li class="is-empty">No match. Try a shorter word.</li>';
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      return;
    }

    items.forEach((item, idx) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.innerHTML = highlight(item.value, q) + (item.sub ? `<span class="opt-sub">${escapeHtml(item.sub)}</span>` : '');
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        choose(idx);
      });
      list.appendChild(li);
    });

    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  const choose = (idx) => {
    const item = items[idx];
    if (!item) return;
    input.value = item.value;
    clearBtn.hidden = false;
    close();
    onPick(item.payload);
  };

  const setActive = (next) => {
    const nodes = [...list.querySelectorAll('li[role="option"]')];
    if (!nodes.length) return;
    cursor = (next + nodes.length) % nodes.length;
    nodes.forEach((n, i) => n.classList.toggle('is-active', i === cursor));
    nodes[cursor].scrollIntoView({ block: 'nearest' });
  };

  input.addEventListener('input', () => {
    clearBtn.hidden = input.value === '';
    onClear();
    open(input.value);
  });

  input.addEventListener('focus', () => open(input.value));
  input.addEventListener('blur', () => setTimeout(close, 120));

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) open(input.value); setActive(cursor + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(cursor - 1); }
    else if (e.key === 'Enter') { if (cursor >= 0) { e.preventDefault(); choose(cursor); } }
    else if (e.key === 'Escape') { close(); }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.hidden = true;
    onClear();
    input.focus();
  });
}

/* ─────────────────── Result rendering ─────────────────── */

function decode() {
  const { corporate, grade, treatment } = state;
  const profileIdx = grade.treatments[treatment];
  const body = $('resultBody');

  body.innerHTML = renderHeader(corporate, grade, treatment) +
    (profileIdx === undefined
      ? renderNotListed(treatment)
      : renderCoverage(state.data.profiles[profileIdx]));

  showResult();
}

function renderHeader(corporate, grade, treatment) {
  return `
    <div class="result-head">
      <p class="eyebrow">Coverage details</p>
      <h2>${escapeHtml(treatment)}</h2>
      <div class="result-meta">
        <span>${escapeHtml(corporate.name)}</span>
        ${corporate.hasGrades ? `<span>Grade: ${escapeHtml(grade.isDefault ? 'Standard' : grade.name)}</span>` : '<span>Single plan</span>'}
      </div>
    </div>`;
}

function renderCoverage(p) {
  const roomValue = formatRoom(p);
  const roomNote = p.roomType && p.roomType.toLowerCase() !== roomValue.toLowerCase()
    && !/upto room rent amount/i.test(p.roomType) ? escapeHtml(p.roomType) : '';

  const figures = [
    figure('₹', 'Covered amount', formatCovered(p.coveredAmount),
      p.coveredAmount === 0 ? 'No sub-limit on this condition' : 'Sub-limit for this condition',
      p.coveredAmount === 0),

    figure('🛏', 'Room rent', roomValue, roomNote,
      /no room rent restriction/i.test(p.roomType)),

    figure('%', 'Copay', `${p.copayPercent}%`,
      p.copayPercent === 0 ? 'You pay nothing out of pocket as copay' : `You pay ${p.copayPercent}% of the approved claim`,
      p.copayPercent === 0),

    figure('📅', 'Pre & post hospitalisation', `${p.preOpDays} / ${p.postOpDays} days`,
      `Pre-op ${p.preOpDays} days · Post-op ${p.postOpDays} days`, false)
  ];

  return `
    <div class="panel">
      <div class="figures">${figures.join('')}</div>

      ${bulletBlock('in', '✓', 'Inclusions', p.inclusions)}
      ${bulletBlock('ex', '✕', 'Exclusions', p.exclusions)}
      ${bulletBlock('rem', 'i', 'Remarks', p.remarks)}

      ${p.note ? `<div class="callout"><span>⏱</span><div><strong>Intimation</strong>${escapeHtml(p.note)}</div></div>` : ''}
    </div>`;
}

function renderNotListed(treatment) {
  // Suggest conditions that *are* configured for the selected plan.
  const others = Object.keys(state.grade.treatments)
    .filter((t) => t !== treatment)
    .slice(0, 6)
    .map((t) => `<button type="button" class="chip" data-goto="${escapeHtml(t)}">${escapeHtml(t)}</button>`)
    .join('');

  return `
    <div class="panel">
      <div class="empty">
        <div class="empty-mark">🔎</div>
        <h2>No specific entry for ${escapeHtml(treatment)}</h2>
        <p>Your employer's policy configuration has no dedicated rule for this condition under the
           selected plan. It would fall under the standard policy terms — covered up to the sum
           insured, subject to waiting periods and insurer approval.</p>
        <p>Talk to a MediBuddy care expert to confirm before you plan the procedure.</p>
        <div class="suggests">${others}</div>
      </div>
    </div>`;
}

function figure(icon, label, value, note, good) {
  return `
    <div class="figure">
      <div class="figure-label"><span aria-hidden="true">${icon}</span>${escapeHtml(label)}</div>
      <div class="figure-value${good ? ' is-good' : ''}">${value}</div>
      ${note ? `<div class="figure-note">${note}</div>` : ''}
    </div>`;
}

function bulletBlock(kind, pip, title, bullets) {
  if (!bullets || !bullets.length) return '';
  return `
    <div class="block block--${kind}">
      <div class="block-title"><span class="pip">${pip}</span>${escapeHtml(title)}</div>
      <ul class="bullets">${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
    </div>`;
}

/* ─────────────────── Formatting ─────────────────── */

function formatCovered(amount) {
  if (!amount) return 'Full sum insured';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatRoom(p) {
  if (/no room rent restriction/i.test(p.roomType)) return 'No limit';
  if (!p.roomPrice) return escapeHtml(p.roomType || 'As per policy');
  if (p.roomPriceIsPercent) return `${p.roomPrice}% of SI / day`;
  return '₹' + Number(p.roomPrice).toLocaleString('en-IN') + ' / day';
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const at = text.toLowerCase().indexOf(query);
  if (at < 0) return escapeHtml(text);
  return escapeHtml(text.slice(0, at)) +
    '<mark>' + escapeHtml(text.slice(at, at + query.length)) + '</mark>' +
    escapeHtml(text.slice(at + query.length));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

/* ─────────────────── View switching ─────────────────── */

function showResult() {
  $('searchView').classList.remove('is-active');
  $('resultView').classList.add('is-active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSearch() {
  $('resultView').classList.remove('is-active');
  $('searchView').classList.add('is-active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
