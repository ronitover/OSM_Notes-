/*
  ui.js - functions that change what the sidebar shows.
  (Rendering of cards, detail view and states is added in later steps.)
*/

// Map form field names to the ids of their input and error elements
const FIELDS = {
  area: { input: 'area', error: 'area-error' },
  maxResults: { input: 'max-results', error: 'max-results-error' }
};

/** Show the "Find old map notes" panel and put the cursor in the area box. */
export function showNotesPanel() {
  document.getElementById('notes-panel').classList.remove('hidden');
  document.getElementById('area').focus();
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
