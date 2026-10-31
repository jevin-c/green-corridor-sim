# 🚑 Green Corridor Simulator

A web-based simulation of a **green corridor for ambulances** in Mumbai. Pick an emergency location and a hospital, and watch an ambulance follow the fastest route while the traffic signals ahead of it turn green.

> Built as my project for the **Bit n Build Ideathon 2026**.

**Live demo:** https://jevin-c.github.io/green-corridor-sim/

## The problem

Ambulances lose precious minutes stuck at red signals in heavy city traffic. A green corridor clears the signals along the ambulance's route so it can reach the hospital faster. This project is a simple simulation of that idea.

## Features

- Satellite map of Mumbai
- Set the emergency location by tapping the map, searching a place, or using live GPS location
- Pick a hospital from a quick-pick list, by searching, or by tapping the map
- Fastest road route drawn automatically, with distance and estimated time
- Animated ambulance with Dispatch, Pause, Resume and a speed slider
- Traffic signals along the route turn green as the ambulance approaches and go back to red after it passes
- Live counter of signals cleared
- Emergency-style dark interface with large buttons, and a mobile-friendly layout

## Tech stack

- HTML, CSS, JavaScript (no frameworks, no build step)
- [Leaflet](https://leafletjs.com/) for the map
- [Esri World Imagery](https://www.arcgis.com/) for satellite tiles
- [OSRM](https://project-osrm.org/) for routing
- [Nominatim (OpenStreetMap)](https://nominatim.org/) for place search

## How it works

1. The emergency location and hospital are set by the user.
2. OSRM returns the road route between them as a list of coordinates.
3. Simulated signals are placed along the route at fixed gaps.
4. On every animation frame the ambulance moves along the route. Each signal checks the distance to the ambulance: within 300 m it turns green, and after the ambulance passes it returns to red.

## Run it locally

1. Clone the repo:
   ```
   git clone https://github.com/jevin-c/green-corridor-sim.git
   ```
2. Open the folder in VS Code.
3. Install the **Live Server** extension, right-click `index.html` and choose **Open with Live Server**.

Do not open `index.html` by double-clicking. Some map tiles and the location feature need a local server or https.

## Limitations (please read)

- This is a **simulation only**. It does not control any real traffic signals.
- The signal positions are placed automatically at regular gaps, not taken from real signal data.
- Routes and times come from OSRM's public demo server and do **not** include live traffic.
- The ambulance speed on screen is a simulation speed, not a real speed.
- Hospital coordinates in the quick-pick list are approximate.
- Place search uses the free Nominatim service, so it only runs when you press Search or Enter, and it can be slow at times.
- Live location on a laptop can be off by a few hundred metres or more.

## Privacy

- Your live location is used only inside your browser to place the marker. It is not stored or sent to any server of mine.
- When you search a place, the text is sent to OpenStreetMap's Nominatim service. Routes send coordinates to the OSRM demo server, and map tiles come from Esri. These services can see your IP address, as any website would.
- This project has no backend, no accounts, no cookies and no analytics.

## Future improvements

- Use real traffic signal locations and live traffic data
- Pick the nearest hospital automatically
- Multiple ambulances at the same time
- Driver alerts and a driver-side view
- Support for other cities

## Credits

Map data © OpenStreetMap contributors. Satellite tiles © Esri, Maxar, Earthstar Geographics. Routing by OSRM.

## Author

**Jevin Castelino** - First-year engineering student