/*
  map.js - everything to do with the Leaflet map.
  Leaflet is loaded as a normal <script> in index.html, so it is
  available here as the global variable "L".
*/

// Starting view: Bengaluru
const START_CENTER = [12.9716, 77.5946];
const START_ZOOM = 13;

// The two base layers the user can switch between
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>';

const layers = {
  Standard: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: ATTRIBUTION
  }),
  Humanitarian: L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: ATTRIBUTION + ', tiles by <a href="https://www.hotosm.org/" target="_blank" rel="noopener">HOT</a>'
  })
};

let map;                       // the Leaflet map object
let currentLayer = 'Standard'; // name of the active base layer
let locationMarker = null;     // blue dot for "my location"
let messageTimer = null;       // timer used to hide the map message

/** Create the map inside <div id="map"> and add the default tiles. */
export function initMap() {
  map = L.map('map', {
    center: START_CENTER,
    zoom: START_ZOOM,
    zoomControl: false // we use our own +/- buttons on the right
  });
  layers[currentLayer].addTo(map);
  return map;
}

/** Zoom the map in or out by one level. */
export function zoomIn() {
  map.zoomIn();
}
export function zoomOut() {
  map.zoomOut();
}

/** Switch between the Standard and Humanitarian tile layers. */
export function toggleLayer() {
  map.removeLayer(layers[currentLayer]);
  currentLayer = currentLayer === 'Standard' ? 'Humanitarian' : 'Standard';
  layers[currentLayer].addTo(map);
  showMapMessage(`Map layer: ${currentLayer}`);
}

/**
 * Ask the browser for the user's position (Geolocation API),
 * then fly there and show a blue dot. Shows a friendly message on failure.
 */
export function locateUser() {
  if (!('geolocation' in navigator)) {
    showMapMessage('Your browser does not support location.');
    return;
  }

  showMapMessage('Finding your location…');

  navigator.geolocation.getCurrentPosition(
    // Success: move the map to the user's position
    (position) => {
      const latlng = [position.coords.latitude, position.coords.longitude];
      map.flyTo(latlng, 15);

      // Replace any old dot with a new one
      if (locationMarker) locationMarker.remove();
      locationMarker = L.circleMarker(latlng, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#2563eb', // blue-600
        fillOpacity: 1
      }).addTo(map).bindTooltip('You are here');

      showMapMessage('Showing your location.');
    },
    // Error: explain what went wrong in plain words
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        showMapMessage('Location permission was denied. You can still search by area name.');
      } else {
        showMapMessage('Could not get your location. Please try again.');
      }
    },
    { timeout: 10000 }
  );
}

/** Show a short message at the top of the map for a few seconds. */
export function showMapMessage(text) {
  const box = document.getElementById('map-message');
  box.textContent = text;
  box.classList.remove('hidden');

  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => box.classList.add('hidden'), 3000);
}

/** Show a small "Not part of this prototype" tooltip next to a control button. */
export function showDummyTooltip(button) {
  const tip = document.getElementById('control-tooltip');
  // Line the tooltip up with the middle of the clicked button
  tip.style.top = `${button.offsetTop + button.offsetHeight / 2}px`;
  tip.classList.remove('hidden');

  clearTimeout(tip.hideTimer);
  tip.hideTimer = setTimeout(() => tip.classList.add('hidden'), 1500);
}
