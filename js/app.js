/*
  app.js - entry point of OSM Notes+.
  Wires up events and holds the app state.
*/

import { initMap, zoomIn, zoomOut, locateUser, toggleLayer, showDummyTooltip } from './map.js';

// ---------- Map ----------
initMap();

// ---------- Map control buttons (click events) ----------
document.getElementById('btn-zoom-in').addEventListener('click', zoomIn);
document.getElementById('btn-zoom-out').addEventListener('click', zoomOut);
document.getElementById('btn-locate').addEventListener('click', locateUser);
document.getElementById('btn-layers').addEventListener('click', toggleLayer);

// Controls that are only for looks (legend, share, add note, query)
document.querySelectorAll('[data-dummy]').forEach((button) => {
  button.addEventListener('click', () => showDummyTooltip(button));
});
