const socket = io();

// High accuracy options for geolocation
const geoOptions = {
    enableHighAccuracy: true, // Forces GPS instead of network-based location
    timeout: 10000,           // Allow more time for a precise fix
    maximumAge: 0             // Do not use cached locations
};

// Watch position with higher accuracy
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            console.log(`Lat: ${latitude}, Lng: ${longitude}, Accuracy: ${accuracy} meters`);

            // Send position to server
            socket.emit("send-location", { latitude, longitude, accuracy });
        },
        (error) => {
            console.error("Geolocation error:", error);
        },
        geoOptions
    );
}

// Initialize Leaflet map
const map = L.map("map").setView([0, 0], 18); // Zoom in more for better precision

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 20
}).addTo(map);

// Store user markers
const markers = {};

// Show accuracy circles
const accuracyCircles = {};

socket.on("receive-location", (data) => {
    const { id, latitude, longitude, accuracy } = data;

    // Center map on user only if they are new
    if (!markers[id]) {
        map.setView([latitude, longitude], 18);
    }

    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]);
        accuracyCircles[id].setLatLng([latitude, longitude]).setRadius(accuracy);
    } else {
        markers[id] = L.marker([latitude, longitude]).addTo(map);
        accuracyCircles[id] = L.circle([latitude, longitude], {
            radius: accuracy,
            color: "blue",
            fillColor: "blue",
            fillOpacity: 0.2
        }).addTo(map);
    }
});

socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        map.removeLayer(accuracyCircles[id]);
        delete markers[id];
        delete accuracyCircles[id];
    }
});
