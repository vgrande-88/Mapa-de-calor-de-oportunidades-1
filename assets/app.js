// ==============================
// Configuración Inicial del Mapa
// ==============================
const burgosCoords = [42.34399, -3.69691]; // Centro de Burgos
const map = L.map('map', { zoomControl: false }).setView(burgosCoords, 14);

// Usamos un mapa base oscuro para que el calor resalte más
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

L.control.zoom({ position: 'bottomleft' }).addTo(map);

// Variables globales
let heatLayer = null;
let currentMode = 'empleo';

// ==============================
// Simulación de Datos por Barrios
// ==============================
const barrios = [
  { name: "Centro", coords: [42.3412, -3.7018], radius: 0.005 },
  { name: "Gamonal", coords: [42.3510, -3.6680], radius: 0.008 },
  { name: "G-3", coords: [42.3565, -3.6745], radius: 0.004 },
  { name: "Huelgas", coords: [42.3375, -3.7202], radius: 0.005 },
  { name: "San Pedro de la Fuente", coords: [42.3460, -3.7150], radius: 0.004 },
  { name: "Fuentecillas", coords: [42.3480, -3.7250], radius: 0.006 }
];

// Generador de puntos aleatorios simulando actividad
function generateLivePoints(mode) {
  const points = [];
  barrios.forEach(barrio => {
    let count = 20; // Actividad base

    // Cambiamos la densidad dependiendo del botón pulsado
    if (mode === 'empleo') {
      if (barrio.name === 'Centro' || barrio.name === 'Gamonal') count = 50;
    } else if (mode === 'vivienda') {
      if (barrio.name === 'G-3' || barrio.name === 'Fuentecillas') count = 40;
    } else if (mode === 'servicios') {
      if (barrio.name === 'Centro' || barrio.name === 'G-3') count = 60;
    }

    // Generar las coordenadas con cierta dispersión aleatoria
    for (let i = 0; i < count; i++) {
      const lat = barrio.coords[0] + (Math.random() - 0.5) * barrio.radius * 2;
      const lng = barrio.coords[1] + (Math.random() - 0.5) * barrio.radius * 2;
      const intensity = Math.random() * 0.8 + 0.2; // Intensidad del punto
      points.push([lat, lng, intensity]);
    }
  });
  return points;
}

// ==============================
// Actualización del Mapa de Calor
// ==============================
function updateHeatmap() {
  const data = generateLivePoints(currentMode);
  
  // Si ya existe una capa, la borramos antes de poner la nueva
  if (heatLayer) {
    map.removeLayer(heatLayer);
  }

  // Crear la nueva capa de calor
  heatLayer = L.heatLayer(data, {
    radius: 25,
    blur: 15,
    maxZoom: 17,
    gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red' }
  }).addTo(map);

  // Actualizar el texto del HUD
  document.getElementById('update-text').innerText = `Datos de ${currentMode} actualizados`;
}

// ==============================
// Interacciones de la Interfaz
// ==============================
window.changeMode = function(mode) {
  currentMode = mode;
  
  // Actualizar los botones visualmente
  document.querySelectorAll('.btn-group button').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`btn-${mode}`).classList.add('active');
  
  // Refrescar el mapa inmediatamente
  updateHeatmap();
}

// Iniciar al cargar la ventana
window.onload = () => {
  updateHeatmap();
  // El "Tiempo real": recarga los datos cada 5 segundos
  setInterval(updateHeatmap, 5000);
};

