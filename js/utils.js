/*
  utils.js - small helper functions with no DOM or map code.
*/

/**
 * Ask the browser for the user's position (Geolocation API).
 * Wrapped in a Promise so we can use "await".
 * Resolves to { lat, lon }. Rejects with an Error that has a friendly
 * message and a "code": 'unsupported' | 'denied' | 'unavailable'.
 */
export function getUserPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      const err = new Error('Your browser does not support location.');
      err.code = 'unsupported';
      reject(err);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      }),
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        const err = new Error(denied
          ? 'Location permission was denied. You can still search by area name.'
          : 'Could not get your location. Please try again.');
        err.code = denied ? 'denied' : 'unavailable';
        reject(err);
      },
      { timeout: 10000 }
    );
  });
}

/**
 * Check the search form values.
 * Returns an object of error messages, e.g. { area: '...' }.
 * An empty object means the form is valid.
 */
export function validateSearch(values, hasLocation) {
  const errors = {};
  const area = values.area;

  // Area is required (2-100 chars) unless the user shared their location
  if (area.length === 0) {
    if (!hasLocation) errors.area = 'Enter an area or city, or use your location.';
  } else if (area.length < 2) {
    errors.area = 'Area must be at least 2 characters.';
  } else if (area.length > 100) {
    errors.area = 'Area must be 100 characters or fewer.';
  }

  // Max results must be a whole number from 1 to 100
  const max = values.maxResults;
  if (!Number.isInteger(max) || max < 1 || max > 100) {
    errors.maxResults = 'Enter a whole number from 1 to 100.';
  }

  return errors;
}
