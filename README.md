# Green Corridor Simulator

A web-based simulation of an ambulance **green corridor** for Mumbai. Choose an emergency location and a hospital, and watch an ambulance follow the fastest route while the traffic signals ahead of it turn green.

> Developed for the **Bit n Build Ideathon 2026**.

**Live demo:** coming soon

## Overview

Ambulances lose valuable minutes at red signals in dense city traffic. A green corridor clears the signals along an ambulance's route so it can reach the hospital faster. This project is a simple, visual simulation of that idea, built to explain how such a system could work.

## Features

- Satellite map of Mumbai
- Set the emergency location by tapping the map, searching for a place, or using the device's live location
- Choose a hospital from a quick-pick list, by search, or by tapping the map
- Fastest road route drawn automatically, with distance and estimated travel time
- Animated ambulance with Dispatch, Pause, Resume and an adjustable simulation speed
- Simulated traffic signals along the route that turn green as the ambulance approaches and return to red after it passes
- Live counter of signals cleared
- High-contrast interface with large controls, and a responsive layout for phones

## How it works

1. The user sets an emergency location and a hospital.
2. The routing service returns the road route between them as a list of coordinates.
3. Simulated signals are placed along the route at regular intervals.
4. On every animation frame the ambulance moves along the route. Each signal measures its distance to the ambulance: within 300 m it turns green, and once the ambulance has passed it returns to red.

## Tech stack

| Area | Technology |
| --- | --- |
| Front end | HTML, CSS, JavaScript (no frameworks, no build step) |
| Map | [Leaflet](https://leafletjs.com/) |
| Satellite imagery | [Esri World Imagery](https://www.arcgis.com/) |
| Routing | [OSRM](https://project-osrm.org/) |
| Place search | [Nominatim](https://nominatim.org/) (OpenStreetMap) |

## Run locally

1. Clone the repository:
   ```
   git clone https://github.com/jevin-c/green-corridor-sim.git
   ```
2. Open the folder in VS Code.
3. Install the **Live Server** extension, right-click `index.html`, and choose **Open with Live Server**.

Opening `index.html` directly from the file system is not supported. Map tiles and the location feature require a local server or HTTPS.

## Project structure

```
green-corridor-sim/
├── index.html    Page layout and control panel
├── style.css     Styling and responsive layout
├── script.js     Map, search, routing, animation and signal logic
└── README.md
```

## Limitations

- This is a **simulation only**. It does not connect to or control any real traffic signals.
- Signal positions are generated at regular intervals along the route and are not based on real signal data.
- Routes and travel times come from a public demo routing server and do not include live traffic.
- The on-screen ambulance speed is a simulation speed, not a real vehicle speed.
- Hospital coordinates in the quick-pick list are approximate.
- Place search runs only when Search is pressed, in line with the free service's usage limits.
- Device location accuracy varies. It is typically much better on phones than on laptops.

## Future improvements

- Real traffic signal locations and live traffic data
- Automatic selection of the nearest suitable hospital
- Multiple ambulances running at the same time
- A driver-side view with voice and visual alerts
- Support for additional cities

## Credits

Map data &copy; OpenStreetMap contributors. Satellite imagery &copy; Esri, Maxar, Earthstar Geographics. Routing by the Open Source Routing Machine (OSRM).

## Author

Developed by [@jevin-c](https://github.com/jevin-c)