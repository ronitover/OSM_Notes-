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
js/map.js           Leaflet map, tile layers, map controls
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

## APIs used
| Purpose | Endpoint |
| --- | --- |
| Standard map tiles | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| Humanitarian map tiles | `https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png` |

## Progress
- [x] Step 1: Project scaffold and OSM-style layout shell
- [x] Step 2: Leaflet map with OSM tiles and map controls
