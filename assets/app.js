// ==============================
// Config
// ==============================
const centroBurgos = [42.34399, -3.69691];
const zoomInicial = 13;

// UI
const panel = document.getElementById("panel");
const btnTogglePanel = document.getElementById("btnTogglePanel");
const btnClosePanel = document.getElementById("btnClosePanel");
const btnCenter = document.getElementById("btnCenter");
const searchInput = document.getElementById("searchInput");
const searchHint = document.getElementById("searchHint");
const listEl = document.getElementById("list");
const countPill = document.getElementById("countPill");
const statusCount = document.getElementById("statusCount");

// ==============================
// Map init
// ==============================
const map = L.map("map", { zoomControl: true }).setView(centroBurgos, zoomInicial);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// ==============================
// State
// ==============================
let allFeatures = [];
let activeId = null;

const markerById = new Map();
const cardById = new Map();

// ==============================
// Helpers
// ==============================
function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makeId(feature) {
  const p = feature.properties || {};
  if (p.id) return String(p.id);
  if (p.titulo) return String(p.titulo).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  return "p-" + Math.random().toString(16).slice(2);
}

// ===== Paleta de alto contraste (tipo “neón”) =====
const palette = [
  "#00E5FF", // cian
  "#FF1744", // rojo
  "#FFEA00", // amarillo
  "#00E676", // verde
  "#7C4DFF", // violeta
  "#FF9100", // naranja
  "#1DE9B6", // turquesa
  "#FF4081", // rosa
  "#76FF03", // lima
  "#2979FF", // azul
  "#F500FF", // magenta
  "#FFD600"  // dorado
];

function colorForIndex(i) {
  if (i < palette.length) return palette[i];
  const hue = (i * 137.508) % 360;
  return `hsl(${hue} 95% 55%)`;
}

// ===== Pin tipo gota invertida =====
function pinIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div class="pin-drop" style="--pin:${color}"></div>`,
    // El divIcon necesita un tamaño/ancla coherente:
    iconSize: [26, 26],
    // El “pico” está abajo (tras rotar -45º), anclamos aprox ahí
    iconAnchor: [13, 26],
    popupAnchor: [0, -24],
  });
}

function setActive(id) {
  if (activeId && cardById.get(activeId)) cardById.get(activeId).classList.remove("active");
  activeId = id;
  if (activeId && cardById.get(activeId)) cardById.get(activeId).classList.add("active");
}

function openProject(id) {
  const marker = markerById.get(id);
  if (!marker) return;

  setActive(id);
  map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), { animate: true });
  marker.openPopup();
}

function renderList(features) {
  listEl.innerHTML = "";
  cardById.clear();

  countPill.textContent = String(features.length);
  statusCount.textContent = String(allFeatures.length);

  features.forEach((f) => {
    const p = f.properties || {};
    const id = p._id;
    const titulo = p.titulo || "Proyecto";
    const desc = p.descripcion || "";
    const url = p.url || "";
    const cat = p.categoria || "Proyecto";
    const color = p._color || "#00E5FF";

    const card = document.createElement("div");
    card.className = "card";
    card.tabIndex = 0;

    card.innerHTML = `
      <h3>
        <span class="dot" style="--dot:${escapeHtml(color)}"></span>
        ${escapeHtml(titulo)}
      </h3>
      ${desc ? `<p>${escapeHtml(desc)}</p>` : ""}
      <div class="meta">
        <span class="tag">${escapeHtml(cat)}</span>
        ${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Abrir</a>` : ""}
      </div>
    `;

    card.addEventListener("click", () => openProject(id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") openProject(id);
    });

    listEl.appendChild(card);
    cardById.set(id, card);
  });

  if (activeId && cardById.get(activeId)) cardById.get(activeId).classList.add("active");
}

function applySearch() {
  const q = (searchInput.value || "").trim().toLowerCase();
  if (!q) {
    searchHint.textContent = "";
    renderList(allFeatures);
    return;
  }

  const filtered = allFeatures.filter((f) => {
    const p = f.properties || {};
    const hay = `${p.titulo || ""} ${p.descripcion || ""} ${p.categoria || ""}`.toLowerCase();
    return hay.includes(q);
  });

  searchHint.textContent = `${filtered.length} resultado(s)`;
  renderList(filtered);
}

// ==============================
// Load GeoJSON points
// ==============================
fetch("data/proyectos.geojson")
  .then((r) => {
    if (!r.ok) throw new Error(`No se pudo cargar data/proyectos.geojson (HTTP ${r.status})`);
    return r.json();
  })
  .then((geojson) => {
    (geojson.features || []).forEach((f, i) => {
      if (!f.properties) f.properties = {};
      f.properties._id = makeId(f);
      // Si defines "color" en GeoJSON, se respeta; si no, se asigna por índice
      f.properties._color = f.properties.color || colorForIndex(i);
    });

    allFeatures = (geojson.features || []);

    const capa = L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => {
        const p = feature.properties || {};
        const color = p._color || "#00E5FF";
        return L.marker(latlng, { icon: pinIcon(color) });
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties || {};
        const id = p._id;

        const titulo = p.titulo || "Proyecto";
        const desc = p.descripcion ? `<p>${escapeHtml(p.descripcion)}</p>` : "";
        const url = p.url
          ? `<p><a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">Abrir recurso</a></p>`
          : "";

        layer.bindPopup(`<h3>${escapeHtml(titulo)}</h3>${desc}${url}`);

        markerById.set(id, layer);
        layer.on("click", () => setActive(id));
      },
    }).addTo(map);

    const bounds = capa.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.18));

    countPill.textContent = String(allFeatures.length);
    statusCount.textContent = String(allFeatures.length);
    renderList(allFeatures);
  })
  .catch((err) => {
    console.error(err);
    alert("Error cargando chinchetas. Revisa consola (F12).");
  });

// ==============================
// Map click → coords (debug)
// ==============================
map.on("click", (e) => {
  console.log("Coordenadas (lat, lon):", e.latlng.lat, e.latlng.lng);
});

// ==============================
// UI actions
// ==============================
btnCenter.addEventListener("click", () => {
  map.setView(centroBurgos, zoomInicial, { animate: true });
});

btnTogglePanel.addEventListener("click", () => {
  panel.classList.toggle("closed");
});

btnClosePanel.addEventListener("click", () => {
  panel.classList.add("closed");
});

searchInput.addEventListener("input", applySearch);