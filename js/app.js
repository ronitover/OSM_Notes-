/*
  app.js - entry point of OSM Notes+.
  Wires up events and holds the app state.
*/

import { initMap, zoomIn, zoomOut, locateUser, toggleLayer, showDummyTooltip } from './map.js';
import { validateSearch, bboxAroundPoint } from './utils.js';
import { geocodeArea, fetchNotes, loadNoteTypes, normalizeNote } from './api.js';
import {
  showNotesPanel, getFormValues, showFormErrors, showFieldError, clearFieldError,
  setLocationStatus, setLocatingButton
} from './ui.js';

// ---------- App state ----------
const state = {
  location: null, // { lat, lon } once the user shares their location
  noteTypes: [],  // loaded once from data/noteTypes.json
  notes: []       // normalized notes from the last search
};

// ---------- Map ----------
initMap();

// ---------- Map control buttons (click events) ----------
document.getElementById('btn-zoom-in').addEventListener('click', zoomIn);
document.getElementById('btn-zoom-out').addEventListener('click', zoomOut);
document.getElementById('btn-layers').addEventListener('click', toggleLayer);
document.getElementById('btn-locate').addEventListener('click', () => {
  // The map already shows a message on failure, so just ignore the error here
  locateUser().catch(() => {});
});

// Controls that are only for looks (legend, share, add note, query)
document.querySelectorAll('[data-dummy]').forEach((button) => {
  button.addEventListener('click', () => showDummyTooltip(button));
});

// ---------- Notes panel ----------
const form = document.getElementById('notes-form');

// Show the panel on page load and whenever the Notes link is clicked
showNotesPanel();
document.getElementById('nav-notes').addEventListener('click', (event) => {
  event.preventDefault(); // stop the "#" link jumping the page
  showNotesPanel();
});

// "Use my location" (click): share location, which counts as a valid area
document.getElementById('btn-use-location').addEventListener('click', async () => {
  setLocatingButton(true);
  try {
    state.location = await locateUser();
    setLocationStatus(state.location);
    clearFieldError('area');
  } catch (error) {
    state.location = null;
    setLocationStatus(null);
    showFieldError('area', error.message);
  } finally {
    setLocatingButton(false);
  }
});

// "Clear" next to the location line (click): stop using the location
document.getElementById('btn-clear-location').addEventListener('click', () => {
  state.location = null;
  setLocationStatus(null);
});

// Live validation (input): clear a field's error as soon as the user types
document.getElementById('area').addEventListener('input', () => clearFieldError('area'));
document.getElementById('max-results').addEventListener('input', () => clearFieldError('maxResults'));

// Form submit: validate, then find the area and fetch its notes
form.addEventListener('submit', async (event) => {
  event.preventDefault(); // stay on the page, we handle the search in JS

  const values = getFormValues(form);
  const errors = validateSearch(values, state.location !== null);
  showFormErrors(errors);
  if (Object.keys(errors).length > 0) return; // stop if anything is invalid

  try {
    // 1. Work out the bounding box: typed area wins over shared location
    let bbox;
    if (values.area) {
      const place = await geocodeArea(values.area);
      bbox = place.bbox;
    } else {
      bbox = bboxAroundPoint(state.location.lat, state.location.lon);
    }

    // 2. Load note types once (local JSON file)
    if (state.noteTypes.length === 0) {
      state.noteTypes = await loadNoteTypes();
    }

    // 3. Fetch notes: closed=0 for only open, closed=-1 for open + closed
    const closedParam = values.status === 'open' ? 0 : -1;
    const features = await fetchNotes(bbox, closedParam);

    // 4. Convert to our simple note objects
    state.notes = features.map((feature) => normalizeNote(feature, state.noteTypes));
    console.log(`Found ${state.notes.length} notes:`, state.notes);
  } catch (error) {
    // Error panels come in Step 6; for now just log the typed error
    console.error(`Search failed [${error.kind || 'unknown'}]:`, error.message);
  }
});
