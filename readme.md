# OSM Notes+

A student redesign concept of [openstreetmap.org](https://www.openstreetmap.org). It keeps the familiar OSM layout (navbar, left sidebar, full-screen map, right-side map controls) and adds one focused improvement: a **Notes panel** that lets a contributor find, filter and sort OpenStreetMap map notes (reported map errors) in an area, **oldest first**.

> Student project — not affiliated with OpenStreetMap. Map data © OpenStreetMap contributors.

## Problem
New and occasional OpenStreetMap contributors want to fix reported map errors in their area. openstreetmap.org shows notes only as individual map pins:
- You can't filter them by status or age.
- You can't sort them by priority.
- You can't see what kind of problem each note is.

As a result, years-old reports stay unresolved and newcomers don't know where to start.

Evidence: GitHub issues openstreetmap-website [#3584](https://github.com/openstreetmap/openstreetmap-website/issues/3584) (no open-only / age filter for notes) and [#5294](https://github.com/openstreetmap/openstreetmap-website/issues/5294) (notes lack structured data), plus r/openstreetmap threads about old unresolved notes.

**Goal:** help a contributor find the oldest unresolved notes in an area and act on them in under a minute, inside the familiar OSM interface.

**Target users:** new and occasional OSM contributors, such as students at mapathons, local volunteers and community mapping groups.

## Features
**OSM-style shell**
- Navbar with a generic map icon (not the official OSM logo), dummy links and a highlighted **Notes** link.
- 360 px sidebar, full-screen Leaflet map, and a right-side control stack.
- Footer with "© OpenStreetMap contributors" and the student-project disclaimer.

**Map**
- Centred on Bengaluru with OpenStreetMap tiles.
- Working controls:
  - **Zoom + / −**
  - **My location** (Geolocation API, with a friendly message if denied)
  - **Layers** (switches between Standard and Humanitarian tiles)
- Legend, Share, Add note and Query show a "Not part of this prototype" tooltip.

**Notes filter form**
- Fields: Area or city, **Use my location**, Status chips (Open / Closed / All), Older than (Any, 6 months, 1 year, 3 years) and Max results (1–100).
- Validation:
  - Area is required (2–100 characters) unless your location is shared.
  - Max results must be a whole number from 1 to 100.
  - Errors appear inline under each field and clear as soon as you type.

**Searching**
1. The area name is geocoded with Nominatim.
2. The box is clamped to at most 0.5° × 0.5° (the Notes API limit).
3. Notes are fetched from the OSM Notes API.
4. Each note is normalized into a simple object.
5. Each note is labelled with a type (Missing road, Wrong name, Closed shop, …) by keyword matching against `data/noteTypes.json`.

**Results list**
- Sorted oldest first, with a result count.
- Each card shows:
  - an age badge (gray under 1 year, amber 1–3 years, red 3+ years)
  - the note type
  - a 2-line preview
  - the created date
  - an Open/Closed pill

**Map markers**
- One marker per result (red = open, green = closed).
- Clicking a card highlights it and flies to its marker.
- Clicking a marker highlights its card and scrolls to it.

**Note detail view**
- Back button, id, age badge, type, created date and reporter.
- The full report and the comment thread.
- **Open on OpenStreetMap** and **Copy link** (shows "Copied!").

**States**
- **Loading:** skeleton cards, plus a disabled form and a spinner on the submit button.
- **Empty:** e.g. "No open notes older than 1 year here", with **Widen search**, which doubles the area up to the limit.
- **Errors** (each with **Retry**): Area not found, Location blocked, No connection, Area too large (HTTP 400), and Server problem (other HTTP errors).

**Live re-filtering**
- Changing Status or "Older than" re-filters the stored notes **without a new request**.
- It only refetches when closed notes are needed but only open ones were fetched.

**Search this area**
- After you pan or zoom to a different area, a button appears on the map that searches the visible area.

**Responsive**
- Below 768 px, the sidebar becomes a foldable **bottom sheet** (max 60% height) over a full-screen map, and the map controls reduce to zoom, locate and layers. After a search, the sheet scrolls to the results.
- Below 1024 px, the navbar links collapse into a **menu button**.

**Accessibility**
- Labels for every input, and a `fieldset`/`legend` for the status chips.
- `aria-label` on icon buttons, and `aria-expanded` on the menu and sheet toggles.
- `aria-live="polite"` on results, `role="alert"` on errors, and green focus rings.
- Note cards can be selected with **Enter** or **Space**.
- Note text is **HTML-escaped**, because it is written by the public.

## How to run
ES modules and `fetch()` don't work from `file://`, so serve the folder with a local server:

```bash
npx serve .
```

Then open the URL it prints (usually http://localhost:3000). You can also use the VS Code **Live Server** extension. An internet connection is needed for the map tiles and APIs.

## Tech stack
- **HTML5:** semantic `header`, `nav`, `aside`, `main`, `section`, `article`, `form`, `fieldset`, `label`, `footer`.
- **Tailwind CSS (Play CDN)**, plus a small `css/styles.css` for reusable bits (chips, badges, focus rings).
- **Vanilla JavaScript (ES modules)**, no frameworks and no build step.
- **Leaflet 1.9.4** for the map.

## Project structure
```
index.html          page layout (navbar, sidebar, map, controls, footer)
css/styles.css      small custom styles
js/app.js           entry point: app state + all event listeners
js/api.js           fetch calls (Nominatim, Notes API, local JSON) + normalization
js/map.js           Leaflet map, tile layers, map controls, note markers
js/ui.js            sidebar rendering: form errors, cards, detail view, states
js/utils.js         helpers: geolocation, validation, dates, bbox, type detection, filtering
data/noteTypes.json note types and their keywords (used to label notes)
```

## APIs used (all free, no API key)
| Purpose | Endpoint |
| --- | --- |
| Standard map tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Humanitarian map tiles | `https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png` |
| Geocoding (area → coordinates) | `https://nominatim.openstreetmap.org/search?q=<area>&format=json&limit=1` |
| Notes in a bounding box | `https://api.openstreetmap.org/api/0.6/notes.json?bbox=<minLon>,<minLat>,<maxLon>,<maxLat>&limit=1000&closed=<n>` |
| Note types (local JSON) | `data/noteTypes.json` |

`closed=0` returns only open notes and `closed=-1` returns open plus all closed notes. Nominatim is only called when the form is submitted (never on each keystroke), to respect its 1 request/second limit.

## How the assignment requirements are met
### Form and validation
- The `<form>` uses `novalidate`, and its validation lives in `validateSearch()` in `utils.js`.
- Inline error messages use `aria-invalid` and a red border, and focus moves to the first invalid field.
- Errors clear on `input`.
- While loading, the submit button is disabled and shows a spinner, and a result count is shown on success.

### Fetch and JSON
- **Calls:** `fetch()` with `async`/`await` in `api.js` for Nominatim, the OSM Notes API (GeoJSON) and the local `data/noteTypes.json`.
- **Normalization:** each response is turned into a simple note object.
- **Errors:** a custom `ApiError` class gives each failure a type (`not-found`, `too-large`, `network`, `http`), so every failure gets its own message and a Retry button.

### JavaScript events
| Event | Where |
| --- | --- |
| `submit` | Notes form: validate and search |
| `input` | Area and Max results: clear the inline error while typing |
| `change` | Status chips and Older than: re-filter results without refetching |
| `click` | Map controls, Notes link, Use my location, Clear location, note cards (event delegation), View, map markers, Back, Copy link, Retry, Widen search, Search this area, menu button, sheet handle |
| `moveend` (Leaflet) | Map: show the "Search this area" button |
| `keydown` | Enter/Space on note cards; Escape closes the mobile menu |

### Other browser APIs
- **Geolocation API:** "My location" and "Use my location".
- **Clipboard API:** "Copy link".
- **FormData:** reading the form.

## Known limitations
- **1,000 notes per request.** The Notes API returns at most 1,000 notes. In busy areas, Closed/All (`closed=-1`) can hit this cap, so the very oldest notes might not be included.
- **Search area limited to 0.5° × 0.5°.** A big place like "India" is searched only around its centre.
- **Type detection is simple.** It uses English keyword matching, so many notes end up as "Other", and notes in other languages are usually not recognised.
- **Fixed box around your location.** "Use my location" searches a fixed ~0.1° (about 11 km) box around you.
- **"Search this area" and zooming in.** The button only appears when you move away from, or zoom out of, the searched area. Zooming further into it doesn't show the button.
- **Copy link needs a secure context.** It works on `localhost` and `https`, but not from a LAN IP over plain `http`.
- **Not production-ready.** The Tailwind Play CDN is meant for prototypes. A real site should use a Tailwind build step.
- **Light use only.** Nominatim and the OSM tile servers have usage policies that only allow light, non-commercial use like this prototype.

## Future work
- Log in with an OSM account (OAuth 2) to **comment on, close or reopen notes** directly.
- **Add new notes** from the map.
- **Saved settings** (home area, default filters) and shareable URLs with the filters in them.
- **Structured note tags** stored in the OSM database (see issue #5294), instead of keyword guessing.
- Marker clustering for areas with many notes.
- Multi-language type detection.
- Routing to a note, and an offline mode for field mapping.

## Manual test checklist
1. **Layout:** at 1440 px you see the navbar, the 360 px sidebar, the map of Bengaluru, 8 map controls and the footer attribution.
2. **Map controls:** + and − zoom, Layers switches the tiles, My location flies to you (or shows the "denied" message), and Legend/Share/Add note/Query show the "Not part of this prototype" tooltip.
3. **Validation:**
   - An empty area shows an inline error, which clears while you type.
   - `a` shows "at least 2 characters".
   - A Max results of `0`, `150` or blank shows "1 to 100".
   - Use my location makes an empty area valid.
4. **Search:** `Indiranagar, Bengaluru` shows skeleton cards, then a result count and cards sorted oldest first. Badge colours match the ages, and markers appear on the map.
5. **Card and marker linking:** a card click highlights the card and flies to its marker. A marker click highlights its card and scrolls to it.
6. **Detail view:** View shows the full report and comments. Open on OpenStreetMap opens a new tab, Copy link shows "Copied!", and Back returns to the same card.
7. **Re-filtering:** Open → All makes one new `closed=-1` request. Changing "Older than" or switching back to Open makes no request.
8. **Empty state:** strict filters on a small area show "No … notes … here" and a **Widen search** button, which grows the area until the limit.
9. **Errors and Retry:**
   - `zzqqxx` shows Area not found.
   - DevTools Offline shows No connection, and Retry works once you're back online.
   - Blocked location shows Location blocked.
10. **Search this area:** drag the map away from or zoom out of the results and the button appears. Clicking it searches the visible area. Clicking a card does not make it appear.
11. **Mobile (390 px):**
    - The bottom sheet is at most 60% of the screen and the handle folds it.
    - Only zoom, locate and layers controls show.
    - The menu button opens the dropdown and Escape closes it.
12. **Keyboard:** Tab through everything and check the green focus rings. Enter on a card selects it, and focus goes to Back when a note opens.
