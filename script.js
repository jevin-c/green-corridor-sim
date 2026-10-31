// ---------- Map setup (Mumbai, satellite view) ----------
const MUMBAI = [19.0760, 72.8777];
const map = L.map('map').setView(MUMBAI, 12);

// Satellite imagery (Esri World Imagery)
L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
  }
).addTo(map);

// Road and place names on top of the satellite view
L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  { maxZoom: 19 }
).addTo(map);

// ---------- Page elements ----------
const statusText = document.getElementById('status');
const msgText = document.getElementById('msg');
const resetBtn = document.getElementById('resetBtn');
const dispatchBtn = document.getElementById('dispatchBtn');
const hospitalSelect = document.getElementById('hospitalSelect');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsList = document.getElementById('results');
const locateBtn = document.getElementById('locateBtn');
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');

// ---------- State ----------
let startMarker = null;
let endMarker = null;
let routeLine = null;     // the blue line on the map
let routeCoords = [];     // route points as [lat, lng]
let routeRequestId = 0;   // used to ignore outdated route responses
let routeInfoText = '';   // "Route ready: ..." text, reused after reset of animation

// Animation state
let ambulanceMarker = null;
let animationId = null;   // id from requestAnimationFrame
let lastFrameTime = 0;
let progress = 0;         // metres travelled along the route
let segLengths = [];      // length of each small piece of the route (metres)
let totalLength = 0;      // total route length (metres)
let animState = 'idle';   // 'idle', 'running', 'paused' or 'finished'

// ---------- Speed slider ----------
// Speeds are in metres per second of simulated travel (not real ambulance speed)
const SPEEDS = [150, 300, 600, 1200, 2400];
const SPEED_NAMES = ['Slow', 'Easy', 'Normal', 'Fast', 'Very fast'];

function updateSpeedLabel() {
  speedLabel.textContent = SPEED_NAMES[speedSlider.value - 1];
}
speedSlider.addEventListener('input', updateSpeedLabel);
updateSpeedLabel();

// ---------- Marker icons ----------
function makeIcon(letter, cssClass) {
  return L.divIcon({
    className: '',
    html: `<div class="pin ${cssClass}">${letter}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

const emergencyIcon = makeIcon('!', 'emergency');
const hospitalIcon = makeIcon('H', 'hospital');

const ambulanceIcon = L.divIcon({
  className: '',
  html: '<div class="ambulance">🚑</div>',
  iconSize: [44, 44],
  iconAnchor: [22, 22]
});

// ---------- Small helpers ----------
function showMessage(text) {
  msgText.textContent = text;
}

function clearResults() {
  resultsList.innerHTML = '';
}

// ---------- Update panel text and step colours ----------
function updatePanel() {
  step1.className = 'step';
  step2.className = 'step';

  if (!startMarker) {
    step1.classList.add('active');
    statusText.textContent = 'Tap the map, search, or use your location to mark the emergency.';
  } else if (!endMarker) {
    step1.classList.add('done');
    step2.classList.add('active');
    statusText.textContent = 'Now choose a hospital: tap the map, search, or use the dropdown.';
  } else {
    step1.classList.add('done');
    step2.classList.add('done');
    statusText.textContent = 'Finding the fastest route...';
  }
}

// ---------- Dispatch button text and state ----------
function updateDispatchButton() {
  if (animState === 'running') {
    dispatchBtn.textContent = 'Pause';
    dispatchBtn.disabled = false;
  } else if (animState === 'paused') {
    dispatchBtn.textContent = 'Resume';
    dispatchBtn.disabled = false;
  } else if (animState === 'finished') {
    dispatchBtn.textContent = 'Dispatch again';
    dispatchBtn.disabled = false;
  } else {
    dispatchBtn.textContent = 'Dispatch';
    dispatchBtn.disabled = routeCoords.length === 0;
  }
}

// ---------- Ambulance animation ----------
function prepareRouteLengths() {
  segLengths = [];
  totalLength = 0;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const d = map.distance(routeCoords[i], routeCoords[i + 1]);
    segLengths.push(d);
    totalLength += d;
  }
}

// Finds the exact point on the route after travelling 'dist' metres
function pointAtDistance(dist) {
  let remaining = dist;
  for (let i = 0; i < segLengths.length; i++) {
    if (remaining <= segLengths[i]) {
      const t = segLengths[i] === 0 ? 0 : remaining / segLengths[i];
      const a = routeCoords[i];
      const b = routeCoords[i + 1];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    remaining -= segLengths[i];
  }
  return routeCoords[routeCoords.length - 1];
}

function animationStep(timestamp) {
  if (animState !== 'running') return;

  // Time since the last frame, capped so a background tab does not cause a jump
  const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
  lastFrameTime = timestamp;

  progress += SPEEDS[speedSlider.value - 1] * dt;

  if (progress >= totalLength) {
    ambulanceMarker.setLatLng(routeCoords[routeCoords.length - 1]);
    animState = 'finished';
    statusText.textContent = 'Ambulance has reached the hospital.';
    updateDispatchButton();
    return;
  }

  ambulanceMarker.setLatLng(pointAtDistance(progress));
  const percent = Math.round((progress / totalLength) * 100);
  statusText.textContent = 'Ambulance on the way... ' + percent + '%';

  animationId = requestAnimationFrame(animationStep);
}

function startAnimation() {
  if (routeCoords.length < 2) return;

  prepareRouteLengths();
  progress = 0;

  if (ambulanceMarker) map.removeLayer(ambulanceMarker);
  ambulanceMarker = L.marker(routeCoords[0], {
    icon: ambulanceIcon,
    zIndexOffset: 1000,
    interactive: false
  }).addTo(map);

  animState = 'running';
  lastFrameTime = performance.now();
  updateDispatchButton();
  animationId = requestAnimationFrame(animationStep);
}

function pauseAnimation() {
  animState = 'paused';
  cancelAnimationFrame(animationId);
  statusText.textContent = 'Paused at ' + Math.round((progress / totalLength) * 100) + '%.';
  updateDispatchButton();
}

function resumeAnimation() {
  animState = 'running';
  lastFrameTime = performance.now();
  updateDispatchButton();
  animationId = requestAnimationFrame(animationStep);
}

// Stops everything and removes the ambulance (used on reset or when the route changes)
function stopAnimation() {
  cancelAnimationFrame(animationId);
  animationId = null;
  animState = 'idle';
  progress = 0;
  if (ambulanceMarker) map.removeLayer(ambulanceMarker);
  ambulanceMarker = null;
}

dispatchBtn.addEventListener('click', function () {
  if (animState === 'running') {
    pauseAnimation();
  } else if (animState === 'paused') {
    resumeAnimation();
  } else {
    // idle or finished: start from the beginning
    startAnimation();
  }
});

// ---------- Route (OSRM free demo server) ----------
function removeRoute() {
  routeRequestId++;           // cancels any route request still in progress
  stopAnimation();
  if (routeLine) map.removeLayer(routeLine);
  routeLine = null;
  routeCoords = [];
  routeInfoText = '';
  updateDispatchButton();
}

async function drawRoute() {
  removeRoute();
  if (!startMarker || !endMarker) return;

  const myRequest = routeRequestId;
  const a = startMarker.getLatLng();
  const b = endMarker.getLatLng();

  // OSRM wants longitude first, then latitude
  const url =
    'https://router.project-osrm.org/route/v1/driving/' +
    a.lng + ',' + a.lat + ';' + b.lng + ',' + b.lat +
    '?overview=full&geometries=geojson';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Routing failed');
    const data = await res.json();

    // A newer request or a reset happened while we waited, so ignore this one
    if (myRequest !== routeRequestId) return;

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      statusText.textContent = 'No road route found between these two points. Try different locations.';
      return;
    }

    const route = data.routes[0];

    // GeoJSON gives [lng, lat]; Leaflet needs [lat, lng], so flip each pair
    routeCoords = route.geometry.coordinates.map(function (c) {
      return [c[1], c[0]];
    });

    routeLine = L.polyline(routeCoords, {
      color: '#29b6f6',
      weight: 6,
      opacity: 0.9
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });

    const km = (route.distance / 1000).toFixed(1);
    const mins = Math.max(1, Math.round(route.duration / 60));
    routeInfoText = 'Route ready: ' + km + ' km, about ' + mins + ' min (normal traffic). Press Dispatch.';
    statusText.textContent = routeInfoText;
    updateDispatchButton();
  } catch (err) {
    if (myRequest !== routeRequestId) return;
    statusText.textContent = 'Could not get the route. Check your internet and try again.';
  }
}

// ---------- Place the two markers ----------
function setEmergency(latlng, label) {
  if (startMarker) map.removeLayer(startMarker);
  startMarker = L.marker(latlng, { icon: emergencyIcon })
    .addTo(map)
    .bindPopup(label);
  updatePanel();
  drawRoute();
}

function setHospital(latlng, label) {
  if (endMarker) map.removeLayer(endMarker);
  endMarker = L.marker(latlng, { icon: hospitalIcon })
    .addTo(map)
    .bindPopup(label);
  updatePanel();
  drawRoute();
}

// Fills the emergency spot first, then the hospital
function placeNext(latlng, label) {
  if (!startMarker) {
    setEmergency(latlng, label || 'Emergency location');
  } else if (!endMarker) {
    setHospital(latlng, label || 'Hospital');
  }
}

// ---------- Map click ----------
map.on('click', function (e) {
  showMessage('');
  clearResults();
  placeNext(e.latlng);
});

// ---------- Hospital dropdown ----------
hospitalSelect.addEventListener('change', function () {
  if (!hospitalSelect.value) return;
  const parts = hospitalSelect.value.split(',');
  const latlng = L.latLng(parseFloat(parts[0]), parseFloat(parts[1]));
  const name = hospitalSelect.options[hospitalSelect.selectedIndex].text;
  showMessage('');
  setHospital(latlng, name);
  if (!startMarker) map.flyTo(latlng, 14);
});

// ---------- Search (OpenStreetMap Nominatim) ----------
async function searchPlace() {
  const query = searchInput.value.trim();
  if (query.length < 3) {
    showMessage('Type at least 3 letters to search.');
    return;
  }

  showMessage('Searching...');
  clearResults();

  // viewbox gently prefers results around Mumbai (bounded=0 means it is only a hint)
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in' +
    '&viewbox=72.70,19.35,73.10,18.85&bounded=0&q=' +
    encodeURIComponent(query);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Search failed');
    const places = await res.json();

    showMessage('');

    if (places.length === 0) {
      const li = document.createElement('li');
      li.className = 'no-result';
      li.textContent = 'No results found. Try a different name.';
      resultsList.appendChild(li);
      return;
    }

    places.forEach(function (place) {
      const li = document.createElement('li');
      li.textContent = place.display_name;
      li.addEventListener('click', function () {
        const latlng = L.latLng(parseFloat(place.lat), parseFloat(place.lon));
        const shortName = place.display_name.split(',')[0];
        placeNext(latlng, shortName);
        if (!endMarker) map.flyTo(latlng, 16);
        clearResults();
        searchInput.value = '';
      });
      resultsList.appendChild(li);
    });
  } catch (err) {
    showMessage('Search is unavailable right now. Check your internet and try again.');
  }
}

searchBtn.addEventListener('click', searchPlace);
searchInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') searchPlace();
});

// ---------- Live location ----------
locateBtn.addEventListener('click', function () {
  if (!navigator.geolocation) {
    showMessage('Your browser does not support location.');
    return;
  }

  showMessage('Finding your location... allow access if the browser asks.');
  clearResults();

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
      setEmergency(latlng, 'Your current location');
      if (!endMarker) map.flyTo(latlng, 16);
      showMessage('Location found (accuracy about ' + Math.round(pos.coords.accuracy) + ' m).');
    },
    function (err) {
      if (err.code === 1) {
        showMessage('Location permission denied. Allow it in the browser address bar, or search instead.');
      } else if (err.code === 2) {
        showMessage('Location unavailable. Try searching instead.');
      } else {
        showMessage('Location request timed out. Try again.');
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ---------- Reset ----------
resetBtn.addEventListener('click', function () {
  removeRoute();
  if (startMarker) map.removeLayer(startMarker);
  if (endMarker) map.removeLayer(endMarker);
  startMarker = null;
  endMarker = null;
  hospitalSelect.value = '';
  searchInput.value = '';
  clearResults();
  showMessage('');
  map.setView(MUMBAI, 12);
  updatePanel();
});

// Set the correct button state when the page first loads
updateDispatchButton();