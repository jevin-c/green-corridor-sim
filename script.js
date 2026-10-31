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
const hospitalSelect = document.getElementById('hospitalSelect');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resultsList = document.getElementById('results');
const locateBtn = document.getElementById('locateBtn');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');

// ---------- State ----------
let startMarker = null;
let endMarker = null;
let routeLine = null;     // the blue line on the map
let routeCoords = [];     // route points as [lat, lng] (used for animation in Step 7)
let routeRequestId = 0;   // used to ignore outdated route responses

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

// ---------- Route (OSRM free demo server) ----------
function removeRoute() {
  routeRequestId++;           // cancels any route request still in progress
  if (routeLine) map.removeLayer(routeLine);
  routeLine = null;
  routeCoords = [];
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
    statusText.textContent = 'Route ready: ' + km + ' km, about ' + mins + ' min (normal traffic).';
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