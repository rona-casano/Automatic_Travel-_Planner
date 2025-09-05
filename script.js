const steps = document.querySelectorAll(".step");
let currentStep = 0;
let map, routingControl;

// Navigation
document.querySelectorAll(".next").forEach(btn => {
  btn.addEventListener("click", () => {
    if (currentStep < steps.length - 1) {
      steps[currentStep].classList.remove("active");
      steps[++currentStep].classList.add("active");
      if (currentStep === 2) generateItinerary();
    }
  });
});

document.querySelectorAll(".back").forEach(btn => {
  btn.addEventListener("click", () => {
    if (currentStep > 0) {
      steps[currentStep].classList.remove("active");
      steps[--currentStep].classList.add("active");
    }
  });
});

// Initialize Map
function initMap() {
  map = L.map('map').setView([14.5995, 120.9842], 5); // default Philippines
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

// Fetch coordinates from Nominatim
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": "travel-planner-demo" } });
  const data = await res.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } else {
    throw new Error("Destination not found");
  }
}

// Fetch POIs from Nominatim (e.g. museums, parks, restaurants)
async function fetchPOIs(dest, lat, lon) {
  const categories = ["museum", "park", "restaurant", "shopping"];
  const pois = [];

  for (let cat of categories) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cat + " in " + dest)}&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "travel-planner-demo" } });
    const data = await res.json();
    if (data.length > 0) {
      pois.push({
        name: data[0].display_name.split(",")[0],
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      });
    }
  }
  return pois;
}

// Generate Itinerary & Route
async function generateItinerary() {
  const dest = document.getElementById("destination").value || "Manila, Philippines";
  const budget = document.getElementById("budget").value;
  const pace = document.getElementById("pace").value;
  const interests = Array.from(document.querySelectorAll("input[type=checkbox]:checked"))
                         .map(cb => cb.value);

  const itineraryDiv = document.getElementById("itinerary");
  itineraryDiv.innerHTML = `<h3>Your Trip to ${dest}</h3>`;
  itineraryDiv.innerHTML += `<p>Budget: ${budget}, Pace: ${pace}</p>`;
  itineraryDiv.innerHTML += `<p>Interests: ${interests.join(", ") || "None"}</p>`;

  try {
    // Get destination center
    const center = await geocode(dest);
    map.setView([center.lat, center.lon], 13);

    // Fetch points of interest
    const pois = await fetchPOIs(dest, center.lat, center.lon);
    const waypoints = [L.latLng(center.lat, center.lon), ...pois.map(p => L.latLng(p.lat, p.lon))];

    if (routingControl) {
      map.removeControl(routingControl);
    }

    routingControl = L.Routing.control({
      waypoints: waypoints,
      routeWhileDragging: true
    }).addTo(map);

    // Itinerary list with names
    let listHTML = `<ul><li>Main Destination: ${dest}</li>`;
    pois.forEach((p, i) => {
      listHTML += `<li>Stop ${i + 1}: ${p.name}</li>`;
    });
    listHTML += "</ul>";

    itineraryDiv.innerHTML += listHTML;
  } catch (err) {
    itineraryDiv.innerHTML += `<p style="color:red;">Error: Could not generate route for "${dest}".</p>`;
  }
}

// Export as TXT
document.getElementById("export").addEventListener("click", () => {
  const plan = document.getElementById("itinerary").innerText;
  const blob = new Blob([plan], {type: "text/plain"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "travel_plan.txt";
  link.click();
});

// Reset planner
document.getElementById("reset").addEventListener("click", () => {
  currentStep = 0;
  steps.forEach(s => s.classList.remove("active"));
  steps[0].classList.add("active");
  document.querySelectorAll("input, select").forEach(el => el.value = "");
  document.querySelectorAll("input[type=checkbox]").forEach(el => el.checked = false);
  document.getElementById("itinerary").innerHTML = "";
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
});

// Run map init
window.onload = initMap;
