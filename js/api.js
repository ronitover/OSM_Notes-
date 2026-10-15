/*
  api.js - all network calls (fetch) and turning API data into our own note objects.

  APIs used (free, no key):
  - Nominatim geocoding: area name -> coordinates
  - OSM Notes API: notes inside a bounding box
  - data/noteTypes.json: local list of note types + keywords
*/

import { parseOsmDate, ageInDays, clampBbox, detectType } from './utils.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOTES_URL = 'https://api.openstreetmap.org/api/0.6/notes.json';

/**
 * Our own error type, so the UI can show the right message for each problem.
 * kind: 'not-found' | 'too-large' | 'network' | 'http'
 */
export class ApiError extends Error {
  constructor(kind, message, status = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status; // HTTP status code, if there was one
  }
}

/**
 * fetch() + JSON with clear errors.
 * - fetch itself throws when there is no connection -> 'network'
 * - HTTP 400 from the Notes API means the area is too big -> 'too-large'
 * - any other non-OK status -> 'http'
 */
async function getJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new ApiError('network', 'Network error. Check your internet connection and try again.');
  }

  if (response.status === 400) {
    throw new ApiError('too-large', 'This area is too large. Zoom in or search a smaller place.', 400);
  }
  if (!response.ok) {
    throw new ApiError('http', `The server returned an error (HTTP ${response.status}). Please try again later.`, response.status);
  }
  return response.json();
}

/**
 * Look up an area name with Nominatim.
 * Returns { lat, lon, bbox } where bbox = { minLon, minLat, maxLon, maxLat }.
 * Only called on form submit (Nominatim allows max 1 request per second).
 */
export async function geocodeArea(name) {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(name)}&format=json&limit=1`;
  const results = await getJson(url);

  // Empty array = nothing found
  if (results.length === 0) {
    throw new ApiError('not-found', `We couldn't find "${name}". Check the spelling or try a bigger place.`);
  }

  const place = results[0];
  // Nominatim's boundingbox order is [south, north, west, east], all strings
  const [south, north, west, east] = place.boundingbox.map(Number);

  return {
    lat: Number(place.lat),
    lon: Number(place.lon),
    bbox: { minLon: west, minLat: south, maxLon: east, maxLat: north }
  };
}

/**
 * Get notes inside a bbox from the OSM Notes API.
 * closedParam: 0 = only open notes, -1 = open + all closed notes.
 * The bbox is clamped to 0.5° x 0.5° first so the API doesn't reject it.
 * Returns the raw GeoJSON features array.
 */
export async function fetchNotes(bbox, closedParam) {
  const b = clampBbox(bbox);
  // toFixed(5) keeps the URL short (~1 m precision is plenty)
  const bboxText = [b.minLon, b.minLat, b.maxLon, b.maxLat].map((n) => n.toFixed(5)).join(',');
  const url = `${NOTES_URL}?bbox=${bboxText}&limit=1000&closed=${closedParam}`;

  const data = await getJson(url);
  return data.features;
}

/** Load the list of note types and keywords from our local JSON file. */
export async function loadNoteTypes() {
  return getJson('data/noteTypes.json');
}

/**
 * Turn one GeoJSON feature from the Notes API into our simple note object:
 * { id, lat, lon, status, createdAt, ageDays, text, comments, type, url }
 */
export function normalizeNote(feature, types) {
  const props = feature.properties;
  const [lon, lat] = feature.geometry.coordinates; // GeoJSON is [lon, lat]

  const comments = props.comments.map((c) => ({
    date: parseOsmDate(c.date),
    user: c.user || 'Anonymous', // anonymous notes have no user
    action: c.action,
    text: (c.text || '').trim()
  }));

  // The first comment is the original report
  const text = comments.length > 0 && comments[0].text ? comments[0].text : '(No description)';
  const createdAt = parseOsmDate(props.date_created);

  return {
    id: props.id,
    lat,
    lon,
    status: props.status, // 'open' | 'closed'
    createdAt,
    ageDays: ageInDays(createdAt),
    text,
    comments,
    type: detectType(text, types),
    url: `https://www.openstreetmap.org/note/${props.id}`
  };
}
