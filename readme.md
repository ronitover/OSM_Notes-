# OSM Notes+

A student redesign concept of [openstreetmap.org](https://www.openstreetmap.org). It keeps the familiar OSM layout (navbar, left sidebar, full-screen map, right-side map controls) and adds a **Notes panel** for finding, filtering and sorting OpenStreetMap map notes (reported map errors), oldest first.

> Student project — not affiliated with OpenStreetMap. Map data © OpenStreetMap contributors.

## Problem
openstreetmap.org shows notes only as individual map pins. You can't filter them by status or age, or sort them by priority. Old reports stay unresolved, and newcomers don't know where to start.

**Goal:** help a contributor find the oldest unresolved notes in an area and act on them in under a minute.

## Tech stack
- HTML5 (semantic elements)
- Tailwind CSS (Play CDN) + a small `css/styles.css`
- Vanilla JavaScript (ES modules)
- Leaflet 1.9.4 for the map

## How to run
ES modules and `fetch()` don't work from `file://`, so serve the folder with a local server:

```bash
npx serve .
```

Then open the URL it prints (usually http://localhost:3000). You can also use the VS Code **Live Server** extension.

## Project structure
```
index.html          page layout (navbar, sidebar, map, controls, footer)
css/styles.css      small custom styles
js/app.js           entry point: wires events, holds state
js/api.js           fetch calls (Nominatim, Notes API, local JSON) + normalization
js/map.js           Leaflet map, tile layers, map controls
js/ui.js            sidebar rendering: notes panel, form errors
js/utils.js         helpers: geolocation, validation, dates, bbox, type detection
data/noteTypes.json note types and their keywords (used to label notes)
CONTEXT.md          project brief / scope
```

## Features so far
- OSM-style layout: navbar, 360 px sidebar, full-screen map, right-side control stack, attribution footer.
- Leaflet map centred on Bengaluru with OpenStreetMap tiles (attribution always visible).
- Custom map controls:
  - **Zoom + / −**
  - **My location**: uses the browser Geolocation API, flies to you and shows a blue dot. If permission is denied, you get a friendly message.
  - **Layers**: switches between Standard and Humanitarian (HOT) tiles.
  - Legend, Share, Add note and Query are for looks only and show a "Not part of this prototype" tooltip.
- **Notes filter form** in the sidebar ("Find old map notes"). It is shown on page load and when you click **Notes**:
  - Area or city (text), plus a **Use my location** button.
  - Status chips: Open / Closed / All.
  - Older than: Any age, 6 months, 1 year, 3 years.
  - Max results: 1–100 (default 20).
- **Validation and feedback**:
  - Area is required (2–100 characters) unless you shared your location. If you type an area, it is used instead of your location.
  - Max results must be a whole number from 1 to 100.
  - Errors appear inline under each field, the field gets a red border, and focus moves to the first bad field.
  - Errors clear as soon as you start typing (`input` event).
  - If location is denied, the message appears under the area field.
- **Fetching notes** (on a valid submit):
  1. A typed area is turned into a bounding box with **Nominatim**. A shared location uses a ~0.1° box around you instead.
  2. The box is clamped to at most 0.5° × 0.5°, because the Notes API rejects big areas with HTTP 400.
  3. Notes come from the **OSM Notes API** (`closed=0` for Open, `closed=-1` for Closed/All).
  4. Each note is normalized into a simple object: id, lat/lon, status, created date, age in days, report text, comments and URL.
  5. A **type** (Missing road, Wrong name, Closed shop, …) is guessed by keyword matching against `data/noteTypes.json`.
  6. Errors are typed (`not-found`, `too-large`, `network`, `http`), so each one can get its own message.

## JavaScript events used (so far)
| Event | Where |
| --- | --- |
| `submit` | Notes form: validate and search |
| `input` | Area and Max results: clear the inline error while typing |
| `click` | Map controls, Notes link, Use my location, Clear location |

## APIs used
| Purpose | Endpoint |
| --- | --- |
| Standard map tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Humanitarian map tiles | `https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png` |
| Geocoding (area → coordinates) | `https://nominatim.openstreetmap.org/search?q=<area>&format=json&limit=1` |
| Notes in a bounding box | `https://api.openstreetmap.org/api/0.6/notes.json?bbox=<minLon>,<minLat>,<maxLon>,<maxLat>&limit=1000&closed=<n>` |
| Note types (local JSON) | `data/noteTypes.json` |

All APIs are free and need no key. Nominatim is called only when the form is submitted (never on each keystroke), to respect its 1 request/second limit.

## Progress
- [x] Step 1: Project scaffold and OSM-style layout shell
- [x] Step 2: Leaflet map with OSM tiles and map controls
- [x] Step 3: Notes filter form with validation and feedback
- [x] Step 4: Fetch and normalize notes from the OSM Notes API
