// Create the map and centre it on Mumbai
const map = L.map('map').setView([19.0760, 72.8777], 12);

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