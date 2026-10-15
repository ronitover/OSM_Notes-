/*
  ui.js - functions that change what the sidebar shows:
  the notes panel, form errors, result cards and the note detail view.
*/

import { formatDate, formatAge, ageCategory, escapeHtml } from './utils.js';

// Map form field names to the ids of their input and error elements
const FIELDS = {
  area: { input: 'area', error: 'area-error' },
  maxResults: { input: 'max-results', error: 'max-results-error' }
};

/**
 * Show the "Find old map notes" panel (and hide the detail view).
 * focusArea: put the cursor in the area box (true when opened from the Notes link).
 */
export function showNotesPanel(focusArea = true) {
  document.getElementById('detail-view').classList.add('hidden');
  document.getElementById('notes-panel').classList.remove('hidden');
  if (focusArea) document.getElementById('area').focus();
}

/** Read the current form values into a plain object. */
export function getFormValues(form) {
  const data = new FormData(form);
  return {
    area: data.get('area').trim(),
    status: data.get('status'),                  // 'open' | 'closed' | 'all'
    olderThanDays: Number(data.get('olderThan')), // 0 = any age
    // Empty box -> NaN, so validation catches it
    maxResults: data.get('maxResults') === '' ? NaN : Number(data.get('maxResults'))
  };
}

/** Show an inline error message under a field and mark the field invalid. */
export function showFieldError(name, message) {
  const input = document.getElementById(FIELDS[name].input);
  const error = document.getElementById(FIELDS[name].error);
  error.textContent = message;
  error.classList.remove('hidden');
  input.setAttribute('aria-invalid', 'true');
}

/** Hide the error under a field. */
export function clearFieldError(name) {
  const input = document.getElementById(FIELDS[name].input);
  const error = document.getElementById(FIELDS[name].error);
  error.textContent = '';
  error.classList.add('hidden');
  input.removeAttribute('aria-invalid');
}

/** Show all errors from validateSearch() and focus the first bad field. */
export function showFormErrors(errors) {
  Object.keys(FIELDS).forEach((name) => {
    if (errors[name]) showFieldError(name, errors[name]);
    else clearFieldError(name);
  });

  const firstBad = Object.keys(FIELDS).find((name) => errors[name]);
  if (firstBad) document.getElementById(FIELDS[firstBad].input).focus();
}

/** Show or hide the "Using your location" line under the area field. */
export function setLocationStatus(position) {
  const box = document.getElementById('location-status');
  if (position) {
    document.getElementById('location-text').textContent =
      `Using your location (${position.lat.toFixed(4)}, ${position.lon.toFixed(4)})`;
    box.classList.remove('hidden');
    box.classList.add('flex');
  } else {
    box.classList.add('hidden');
    box.classList.remove('flex');
  }
}

/** Disable the "Use my location" button while the browser is locating. */
export function setLocatingButton(isLocating) {
  const button = document.getElementById('btn-use-location');
  button.disabled = isLocating;
  button.querySelector('span').textContent = isLocating ? 'Locating…' : 'Use my location';
}

// ---------- Small HTML pieces shared by cards and the detail view ----------

/** Coloured age badge, e.g. "4 years old" in red. */
function ageBadgeHtml(note) {
  return `<span class="age-badge age-${ageCategory(note.ageDays)}">${formatAge(note.ageDays)} old</span>`;
}

/** Outlined "Open" / "Closed" pill. */
function statusPillHtml(note) {
  const label = note.status === 'open' ? 'Open' : 'Closed';
  return `<span class="status-pill status-${note.status}">${label}</span>`;
}

// ---------- Results list ----------

/**
 * Show the result count and one card per note.
 * shown = notes to display, matching = how many matched the filters in total.
 */
export function renderResults(shown, matching) {
  const count = document.getElementById('result-count');
  const list = document.getElementById('results-list');
  document.getElementById('results-state').innerHTML = '';

  count.textContent = `Showing ${shown.length} of ${matching} note${matching === 1 ? '' : 's'}, oldest first.`;

  // Build all cards as one HTML string. Note text is escaped (it comes from users).
  list.innerHTML = shown.map((note) => `
    <li>
      <article class="note-card bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-pointer hover:border-gray-400"
               data-id="${note.id}" tabindex="0" aria-label="${escapeHtml(note.type)} note, ${formatAge(note.ageDays)} old">
        <div class="flex items-center gap-2 mb-1">
          ${ageBadgeHtml(note)}
          <span class="text-xs font-medium text-gray-700">${escapeHtml(note.type)}</span>
          <span class="ml-auto">${statusPillHtml(note)}</span>
        </div>
        <p class="text-sm text-gray-800 line-clamp-2 break-words">${escapeHtml(note.text)}</p>
        <div class="flex items-center mt-2 text-xs text-gray-500">
          <span>Created ${formatDate(note.createdAt)}</span>
          <button type="button" class="btn-view ml-auto px-2 py-1 rounded text-green-700 font-semibold hover:bg-green-50">View</button>
        </div>
      </article>
    </li>`).join('');
}

/** Clear the count and list (e.g. when a new search starts). */
export function clearResults() {
  document.getElementById('result-count').textContent = '';
  document.getElementById('results-state').innerHTML = '';
  document.getElementById('results-list').innerHTML = '';
}

/** Highlight one card (and un-highlight the rest), then scroll it into view. */
export function highlightCard(id) {
  document.querySelectorAll('.note-card').forEach((card) => {
    card.classList.toggle('is-selected', card.dataset.id === String(id));
  });

  const card = document.querySelector(`.note-card[data-id="${id}"]`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return card;
}

// ---------- Detail view ----------

// Friendlier words for the comment actions from the API
const ACTION_LABELS = {
  opened: 'reported',
  commented: 'commented',
  closed: 'resolved',
  reopened: 'reopened',
  hidden: 'hid'
};

/** Fill and show the detail view for one note (hides the notes panel). */
export function showNoteDetail(note) {
  const detail = document.getElementById('detail-view');
  const reporter = note.comments.length > 0 ? note.comments[0].user : 'Anonymous';
  const replies = note.comments.slice(1); // first comment is the report itself

  const repliesHtml = replies.length === 0
    ? '<p class="text-sm text-gray-500">No comments yet.</p>'
    : `<ol class="space-y-2">${replies.map((c) => `
        <li class="bg-white rounded border border-gray-200 p-2">
          <p class="text-xs text-gray-500 mb-1">
            <strong class="text-gray-700">${escapeHtml(c.user)}</strong>
            ${ACTION_LABELS[c.action] || escapeHtml(c.action)} · ${formatDate(c.date)}
          </p>
          ${c.text ? `<p class="text-sm whitespace-pre-line break-words">${escapeHtml(c.text)}</p>` : ''}
        </li>`).join('')}</ol>`;

  detail.innerHTML = `
    <button id="btn-back" type="button" class="mb-3 inline-flex items-center gap-1 text-sm text-green-700 font-medium hover:underline">
      <span aria-hidden="true">←</span> Back to results
    </button>

    <article class="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <h2 class="text-lg font-semibold mb-2">Note #${note.id}</h2>
      <div class="flex flex-wrap items-center gap-2 mb-2">
        ${ageBadgeHtml(note)}
        <span class="text-xs font-medium text-gray-700">${escapeHtml(note.type)}</span>
        ${statusPillHtml(note)}
      </div>
      <p class="text-xs text-gray-500 mb-3">
        Created ${formatDate(note.createdAt)} by ${escapeHtml(reporter)}
      </p>

      <h3 class="text-sm font-semibold mb-1">Report</h3>
      <p class="text-sm whitespace-pre-line break-words mb-4">${escapeHtml(note.text)}</p>

      <h3 class="text-sm font-semibold mb-2">Comments (${replies.length})</h3>
      ${repliesHtml}

      <div class="flex gap-2 mt-4">
        <a href="${note.url}" target="_blank" rel="noopener"
           class="flex-1 text-center rounded bg-green-700 hover:bg-green-800 text-white text-sm font-semibold py-2">
          Open on OpenStreetMap
        </a>
        <button id="btn-copy-link" type="button"
                class="rounded border border-gray-300 hover:bg-gray-100 text-sm px-3 py-2">Copy link</button>
      </div>
    </article>`;

  document.getElementById('notes-panel').classList.add('hidden');
  detail.classList.remove('hidden');
  document.getElementById('btn-back').focus(); // keyboard users start at "Back"
}

/** Change the Copy link button text for 2 seconds ("Copied!" or an error). */
export function flashCopyButton(text) {
  const button = document.getElementById('btn-copy-link');
  if (!button) return;
  button.textContent = text;
  setTimeout(() => { button.textContent = 'Copy link'; }, 2000);
}

// ---------- Loading, empty and error states ----------

/**
 * Loading on/off: disable the whole form, show the spinner in the submit
 * button and (when starting) show grey "skeleton" cards as placeholders.
 */
export function setLoading(isLoading) {
  const form = document.getElementById('notes-form');
  form.querySelectorAll('input, select, button').forEach((el) => { el.disabled = isLoading; });

  document.getElementById('submit-spinner').classList.toggle('hidden', !isLoading);
  document.getElementById('submit-label').textContent = isLoading ? 'Searching…' : 'Find notes';
  document.getElementById('results').setAttribute('aria-busy', String(isLoading));

  if (isLoading) {
    clearResults();
    document.getElementById('result-count').textContent = 'Searching for notes…';
    // Three pulsing placeholder cards
    const skeleton = `
      <li class="bg-white rounded-lg border border-gray-200 p-3 animate-pulse" aria-hidden="true">
        <div class="flex gap-2 mb-2"><div class="h-4 w-16 bg-gray-200 rounded-full"></div><div class="h-4 w-20 bg-gray-200 rounded"></div></div>
        <div class="h-3 bg-gray-200 rounded mb-1.5"></div>
        <div class="h-3 w-2/3 bg-gray-200 rounded mb-2"></div>
        <div class="h-3 w-24 bg-gray-200 rounded"></div>
      </li>`;
    document.getElementById('results-list').innerHTML = skeleton.repeat(3);
  }
}

// Text for the "Older than" values, used in the empty state message
const AGE_TEXT = { 182: '6 months', 365: '1 year', 1095: '3 years' };

/**
 * Empty state: nothing matched. Shows a "Widen search" button
 * (or a hint if the area is already as big as we can search).
 */
export function renderEmptyState(values, canWiden) {
  const statusWord = values.status === 'all' ? '' : `${values.status} `;
  const ageWords = values.olderThanDays ? ` older than ${AGE_TEXT[values.olderThanDays]}` : '';

  clearResults();
  document.getElementById('results-state').innerHTML = `
    <div class="bg-white rounded-lg border border-gray-200 p-4 text-center">
      <p class="text-sm font-medium mb-1">No ${statusWord}notes${ageWords} here</p>
      <p class="text-sm text-gray-600 mb-3">
        ${canWiden ? 'Try a larger area or change the filters.' : 'This is the largest area we can search. Try changing the filters.'}
      </p>
      ${canWiden ? `<button id="btn-widen" type="button"
              class="rounded bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-4 py-2">Widen search</button>` : ''}
    </div>`;
}

// Title for each kind of error (kinds come from ApiError and getUserPosition)
const ERROR_TITLES = {
  'not-found': 'Area not found',
  'too-large': 'Area too large',
  network: 'No connection',
  http: 'Server problem',
  denied: 'Location blocked',
  unavailable: 'Location unavailable',
  unsupported: 'Location not supported'
};

/** Error panel with a title, the friendly message and a Retry button. */
export function renderError(error) {
  const title = ERROR_TITLES[error.kind || error.code] || 'Something went wrong';
  const message = error.kind || error.code ? error.message : 'Please try again.';

  clearResults();
  document.getElementById('results-state').innerHTML = `
    <div class="bg-red-50 rounded-lg border border-red-200 p-4" role="alert">
      <p class="text-sm font-semibold text-red-800 mb-1">${escapeHtml(title)}</p>
      <p class="text-sm text-red-700 mb-3">${escapeHtml(message)}</p>
      <button id="btn-retry" type="button"
              class="rounded border border-red-300 bg-white hover:bg-red-100 text-red-800 text-sm font-semibold px-4 py-2">Retry</button>
    </div>`;
}

/** Show or hide the "Search this area" button over the map. */
export function setSearchAreaButton(visible) {
  const button = document.getElementById('btn-search-area');
  button.classList.toggle('hidden', !visible);
  button.classList.toggle('inline-flex', visible);
}

// ---------- Mobile: menu and bottom sheet ----------

/** Open or close the mobile dropdown menu. */
export function setMenuOpen(isOpen) {
  const menu = document.getElementById('mobile-menu');
  const button = document.getElementById('btn-menu');
  menu.classList.toggle('hidden', !isOpen);
  menu.classList.toggle('flex', isOpen);
  button.setAttribute('aria-expanded', String(isOpen));
  button.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
}

/** Fold the mobile bottom sheet down (only the handle shows) or back up. */
export function setSheetCollapsed(isCollapsed) {
  const handle = document.getElementById('btn-sheet-handle');
  document.getElementById('sidebar').classList.toggle('sheet-collapsed', isCollapsed);
  handle.setAttribute('aria-expanded', String(!isCollapsed));
  handle.setAttribute('aria-label', isCollapsed ? 'Show notes panel' : 'Hide notes panel');
}
