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

// ---------- Dates ----------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Turn an OSM date like "2019-05-12 10:22:33 UTC" into a Date.
 * "2019-05-12 10:22:33 UTC" -> "2019-05-12T10:22:33Z" (ISO format JS understands)
 */
export function parseOsmDate(str) {
  return new Date(str.replace(' UTC', 'Z').replace(' ', 'T'));
}

/** Whole days between a date and now. */
export function ageInDays(date) {
  return Math.floor((Date.now() - date.getTime()) / MS_PER_DAY);
}

// ---------- Bounding boxes ----------
// A bbox is { minLon, minLat, maxLon, maxLat } (west, south, east, north).

/**
 * Make sure a bbox is at most maxSize degrees wide and tall,
 * keeping the same centre. The Notes API rejects big areas (HTTP 400).
 */
export function clampBbox(bbox, maxSize = 0.5) {
  const centerLon = (bbox.minLon + bbox.maxLon) / 2;
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const halfWidth = Math.min(bbox.maxLon - bbox.minLon, maxSize) / 2;
  const halfHeight = Math.min(bbox.maxLat - bbox.minLat, maxSize) / 2;

  return {
    minLon: centerLon - halfWidth,
    minLat: centerLat - halfHeight,
    maxLon: centerLon + halfWidth,
    maxLat: centerLat + halfHeight
  };
}

/** A square bbox of "size" degrees around a point (used for "my location"). */
export function bboxAroundPoint(lat, lon, size = 0.1) {
  const half = size / 2;
  return { minLon: lon - half, minLat: lat - half, maxLon: lon + half, maxLat: lat + half };
}

// ---------- Note types ----------

/**
 * Guess what kind of problem a note is about by looking for keywords.
 * "types" comes from data/noteTypes.json: [{ type, keywords: [] }, ...].
 * The first type with a matching keyword wins; otherwise 'Other'.
 */
export function detectType(text, types) {
  const lower = text.toLowerCase();
  const match = types.find((t) => t.keywords.some((word) => lower.includes(word)));
  return match ? match.type : 'Other';
}
