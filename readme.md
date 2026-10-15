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
js/map.js           Leaflet map, tile layers, map controls, note markers
js/ui.js            sidebar rendering: notes panel, form errors, cards, detail view
js/utils.js         helpers: geolocation, validation, dates, bbox, type detection, filtering
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
- **Results list**:
  - Notes are filtered by Status and "Older than", sorted **oldest first**, and cut to Max results.
  - A result count is shown, e.g. "Showing 20 of 103 notes, oldest first."
  - Each card shows an age badge (gray under 1 year, amber 1–3 years, red 3+ years), the note type, a 2-line preview of the report, the created date and an Open/Closed pill.
  - Note text is HTML-escaped before it is shown, because it is written by the public.
- **Map markers**: one per result, red for open and green for closed. The map moves to the searched area.
  - Clicking a card highlights the card, highlights its marker and flies the map to it.
  - Clicking a marker highlights its marker and scrolls to its card.
- **Loading state**: while searching, the whole form is disabled, the submit button shows a spinner and "Searching…", and three pulsing skeleton cards appear.
- **Empty state**: for example "No open notes older than 1 year here", with a **Widen search** button that doubles the search box (up to the 0.5° limit). At the limit, the button is replaced by a hint to change the filters.
- **Error states** with a **Retry** button that repeats the exact failed action:
  - Area not found
  - Location blocked / unavailable
  - No connection (network error)
  - Area too large (HTTP 400)
  - Server problem (other HTTP errors)
- **Live re-filtering**: changing Status or "Older than" after a search re-filters the stored notes with **no new request**. The one exception is switching from Open to Closed/All when only open notes were fetched: then it refetches with `closed=-1`.
- **Search this area**: after you pan or zoom to a different area (`moveend`), a button appears at the top of the map that searches the visible area. It does not appear after the app's own map moves (fitting results, flying to a card).
- **Responsive layout**:
  - **Desktop (md, 768 px and up):** a 360 px sidebar next to the map.
  - **Mobile (below 768 px):** the sidebar becomes a **bottom sheet** over a full-screen map. It is at most 60% of the screen height, has a rounded top and scrolls. Tapping the handle folds it down to show more map, and it opens again on a new search or a marker tap.
  - Map controls on mobile are reduced to zoom, locate and layers.
  - Below 1024 px, the navbar links collapse into a **menu button** that toggles a dropdown (Escape closes it). The full link set is too wide to fit between 768 and 1024 px, so the menu stays until 1024 px.
- **Accessibility**:
  - Every input has a `<label>`, and the status chips sit in a `<fieldset>` with a `<legend>`.
  - Icon-only buttons have `aria-label`s.
  - The menu button and sheet handle use `aria-expanded`.
  - The results area is `aria-live="polite"` (and `aria-busy` while loading); map messages use `role="status"`; error panels use `role="alert"`.
  - Links, buttons, chips and cards get a green focus ring.
  - Cards can be reached with Tab and selected with **Enter** or **Space**.
  - Opening a note moves focus to "Back", and Back returns focus to the card.
- **Note detail view** (the **View** button on a card): Back button, note id, age badge, type, status, created date and reporter, the full report, the comment thread, an **Open on OpenStreetMap** link, and **Copy link** (shows "Copied!").

## JavaScript events used (so far)
| Event | Where |
| --- | --- |
| `submit` | Notes form: validate and search |
| `input` | Area and Max results: clear the inline error while typing |
| `change` | Status chips and Older than: re-filter results without refetching |
| `moveend` (Leaflet) | Map: show the "Search this area" button |
| `keydown` | Enter/Space on note cards, Escape closes the mobile menu |
| `click` | Map controls, Notes link, Use my location, Clear location, note cards (event delegation), View, map markers, Back, Copy link, Retry, Widen search, Search this area, menu button, sheet handle |

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
- [x] Step 5: Sorted note list, map markers and detail view
- [x] Step 6: Loading, empty and error states with live re-filtering
- [x] Step 7: Responsive layout (mobile bottom sheet) and accessibility
