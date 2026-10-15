/*
  app.js - entry point of OSM Notes+.
  Wires up events and holds the app state.
*/

import {
  initMap, zoomIn, zoomOut, locateUser, toggleLayer, showDummyTooltip,
  showNoteMarkers, highlightMarker, fitToBbox, onMapMoved, getMapBbox, viewDiffersFrom
} from './map.js';
import {
  validateSearch, bboxAroundPoint, clampBbox, widenBbox, isMaxBbox, filterAndSortNotes
} from './utils.js';
import { geocodeArea, fetchNotes, loadNoteTypes, normalizeNote } from './api.js';
import {
  showNotesPanel, getFormValues, showFormErrors, clearFieldError,
  setLocationStatus, setLocatingButton, renderResults, highlightCard,
  showNoteDetail, flashCopyButton, setLoading, renderEmptyState, renderError,
  setSearchAreaButton, setMenuOpen, setSheetCollapsed, scrollToResultsOnMobile
} from './ui.js';

// ---------- App state ----------
const state = {
  location: null,     // { lat, lon } once the user shares their location
  noteTypes: [],      // loaded once from data/noteTypes.json
  notes: [],          // all normalized notes from the last search
  shown: [],          // notes currently in the list (after filters + max results)
  openNote: null,     // note shown in the detail view
  bbox: null,         // area of the last successful search
  fetchedClosed: 0,   // closed param of the last fetch: 0 = open only, -1 = open + closed
  loading: false,     // true while a search is running
  retry: null         // function the Retry button runs (repeats the failed action)
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

// ---------- Mobile menu and bottom sheet ----------
const menuButton = document.getElementById('btn-menu');

// Menu button (click): open / close the dropdown
menuButton.addEventListener('click', () => {
  setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
});

// Escape key (keydown): close the menu and return focus to its button
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    setMenuOpen(false);
    menuButton.focus();
  }
});

// Sheet handle (click): fold the bottom sheet down to see more map, or back up
document.getElementById('btn-sheet-handle').addEventListener('click', () => {
  setSheetCollapsed(!document.getElementById('sidebar').classList.contains('sheet-collapsed'));
});

// ---------- Notes panel ----------
const form = document.getElementById('notes-form');

// Show the panel on page load and whenever the Notes link is clicked
showNotesPanel(window.innerWidth >= 768); // don't pop up the phone keyboard on load
document.getElementById('nav-notes').addEventListener('click', (event) => {
  event.preventDefault(); // stop the "#" link jumping the page
  setSheetCollapsed(false);
  showNotesPanel();
});

/** "Use my location": share location, which counts as a valid area. */
async function useMyLocation() {
  setLocatingButton(true);
  try {
    state.location = await locateUser();
    setLocationStatus(state.location);
    clearFieldError('area');
  } catch (error) {
    // Show the error panel; Retry asks for the location again
    state.location = null;
    setLocationStatus(null);
    state.retry = useMyLocation;
    renderError(error);
    scrollToResultsOnMobile();
  } finally {
    setLocatingButton(false);
  }
}
document.getElementById('btn-use-location').addEventListener('click', useMyLocation);

// "Clear" next to the location line (click): stop using the location
document.getElementById('btn-clear-location').addEventListener('click', () => {
  state.location = null;
  setLocationStatus(null);
});

// Live validation (input): clear a field's error as soon as the user types
document.getElementById('area').addEventListener('input', () => clearFieldError('area'));
document.getElementById('max-results').addEventListener('input', () => clearFieldError('maxResults'));

// Form submit: validate, then search
form.addEventListener('submit', (event) => {
  event.preventDefault(); // stay on the page, we handle the search in JS

  const values = getFormValues(form);
  const errors = validateSearch(values, state.location !== null);
  showFormErrors(errors);
  if (Object.keys(errors).length > 0) return; // stop if anything is invalid

  search(values); // no bbox yet: it is worked out from the area or location
});

// ---------- Search ----------

/**
 * The one search pipeline, used by submit, Retry, Widen search,
 * re-filtering and "Search this area".
 * values: form values. bbox: area to search, or null to work it out
 * from the typed area (Nominatim) or the shared location.
 */
async function search(values, bbox = null) {
  state.loading = true;
  setLoading(true);
  setSheetCollapsed(false); // make sure the results are visible on mobile
  setSearchAreaButton(false);

  try {
    // 1. Work out the bounding box if we don't have one: typed area wins over location
    if (!bbox) {
      if (values.area) {
        const place = await geocodeArea(values.area);
        bbox = place.bbox;
      } else {
        bbox = bboxAroundPoint(state.location.lat, state.location.lon);
      }
    }
    bbox = clampBbox(bbox); // keep it within the Notes API size limit

    // 2. Load note types once (local JSON file)
    if (state.noteTypes.length === 0) {
      state.noteTypes = await loadNoteTypes();
    }

    // 3. Fetch notes: closed=0 for only open, closed=-1 for open + closed
    const closedParam = values.status === 'open' ? 0 : -1;
    const features = await fetchNotes(bbox, closedParam);

    // 4. Save the results, move the map there and show them
    state.notes = features.map((feature) => normalizeNote(feature, state.noteTypes));
    state.bbox = bbox;
    state.fetchedClosed = closedParam;
    fitToBbox(bbox);
    setLoading(false);
    updateResults(values);
    scrollToResultsOnMobile();
  } catch (error) {
    // Forget old results, show the right error panel; Retry repeats this exact search
    setLoading(false);
    state.notes = [];
    state.bbox = null;
    showNoteMarkers([], selectNoteFromMarker);
    state.retry = () => search(values, bbox);
    renderError(error);
    scrollToResultsOnMobile();
  } finally {
    state.loading = false;
  }
}

// ---------- Results ----------

/**
 * Filter + sort the stored notes, keep the first "maxResults",
 * then draw the cards and the map markers (or the empty state).
 */
function updateResults(values) {
  const matching = filterAndSortNotes(state.notes, values);
  state.shown = matching.slice(0, values.maxResults);
  showNoteMarkers(state.shown, selectNoteFromMarker);

  if (matching.length === 0) {
    renderEmptyState(values, !isMaxBbox(state.bbox));
  } else {
    renderResults(state.shown, matching.length);
  }
}

// Re-filtering (change): Status or "Older than" changed after a search
form.addEventListener('change', (event) => {
  if (!['status', 'olderThan'].includes(event.target.name)) return;
  if (!state.bbox || state.loading) return; // no search yet, or one is running

  const values = getFormValues(form);
  const errors = validateSearch({ ...values, area: '' }, true); // area was already checked: only check max results
  showFormErrors(errors);
  if (Object.keys(errors).length > 0) return;

  // We only fetched open notes, but now closed ones are needed: fetch again
  if (values.status !== 'open' && state.fetchedClosed === 0) {
    search(values, state.bbox);
  } else {
    updateResults(values); // no network request, just filter the stored notes
  }
});

// Retry and Widen search buttons live inside the state panel (rebuilt each time)
document.getElementById('results-state').addEventListener('click', (event) => {
  if (event.target.closest('#btn-retry') && state.retry) {
    state.retry();
  }
  if (event.target.closest('#btn-widen')) {
    search(getFormValues(form), widenBbox(state.bbox)); // twice as big, within the limit
  }
});

/** Find a shown note by id. */
function findNote(id) {
  return state.shown.find((note) => note.id === id);
}

/** Marker click: make sure the list is visible, highlight the card and marker. */
function selectNoteFromMarker(id) {
  setSheetCollapsed(false);
  showNotesPanel(false);
  highlightCard(id);
  highlightMarker(id);
}

// Card clicks (one listener on the list = "event delegation")
document.getElementById('results-list').addEventListener('click', (event) => {
  const card = event.target.closest('.note-card');
  if (!card) return;
  const note = findNote(Number(card.dataset.id));

  highlightCard(note.id);
  highlightMarker(note.id, true); // fly to the marker

  // The "View" button inside the card opens the detail view
  if (event.target.closest('.btn-view')) {
    state.openNote = note;
    showNoteDetail(note);
  }
});

// Keyboard (keydown): Enter or Space on a focused card works like a click
document.getElementById('results-list').addEventListener('keydown', (event) => {
  const isCard = event.target.classList.contains('note-card');
  if (isCard && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault(); // stop Space from scrolling the list
    event.target.click();
  }
});

// ---------- Search this area ----------

// moveend: show the button when the map shows a different area than the last search
onMapMoved(() => {
  if (state.loading) return;
  setSearchAreaButton(viewDiffersFrom(state.bbox));
});

// Search the area currently visible on the map (typed area is ignored)
document.getElementById('btn-search-area').addEventListener('click', () => {
  const values = { ...getFormValues(form), area: '' };
  const errors = validateSearch(values, true); // the map area counts as a valid area
  showFormErrors(errors);
  if (Object.keys(errors).length > 0) return;

  search(values, getMapBbox());
});

// ---------- Detail view ----------

// The detail view's HTML is rebuilt for every note, so listen on its container
document.getElementById('detail-view').addEventListener('click', async (event) => {
  // Back button: return to the list with the same card highlighted
  if (event.target.closest('#btn-back')) {
    showNotesPanel(false);
    const card = highlightCard(state.openNote.id);
    if (card) card.focus();
  }

  // Copy link button: copy the note URL to the clipboard
  if (event.target.closest('#btn-copy-link')) {
    try {
      await navigator.clipboard.writeText(state.openNote.url);
      flashCopyButton('Copied!');
    } catch {
      flashCopyButton('Copy failed');
    }
  }
});
