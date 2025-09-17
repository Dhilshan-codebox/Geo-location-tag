const express = require("express");
const http = require("http");
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>3D Live Location Map</title>
        <style>
            body, html { margin: 0; padding: 0; height: 100%; }
            #map { width: 100%; height: 100%; }
        </style>
        <!-- Ola Maps CSS -->
        <link
          href="https://api.olamaps.io/sdk/css?key=YOUR_API_KEY"
          rel="stylesheet"
        />
    </head>
    <body>
        <div id="map"></div>

        <!-- Socket.io client -->
        <script src="/socket.io/socket.io.js"></script>
        <!-- Ola Maps SDK -->
        <script src="https://unpkg.com/olamaps-web-sdk@latest/dist/olamaps-web-sdk.umd.js"></script>

        <script>
            const socket = io();
            let myMarker = null;
            let myAccuracyCircle = null;
            const otherMarkers = {};

            window.addEventListener("load", () => {
                if (!window.OlaMaps) {
                    alert("Ola Maps SDK failed to load.");
                    return;
                }

                const olaMaps = new window.OlaMaps({
                    apiKey: "YOUR_API_KEY"
                });

                const map = olaMaps.init({
                    style: "https://api.olamaps.io/tiles/vector/v1/styles/satellite-standard/style.json",
                    container: "map",
                    zoom: 17,
                    pitch: 60,
                    bearing: -20
                });

                // ✅ Wait until the map is fully ready
                map.on("load", () => {
                    if (navigator.geolocation) {
                        navigator.geolocation.watchPosition(
                            (position) => {
                                const { latitude, longitude, accuracy } = position.coords;
                                const coords = [longitude, latitude];

                                if (!myMarker) {
                                    map.setCenter(coords);

                                    // Create user marker
                                    myMarker = olaMaps.addMarker({
                                        map,
                                        lngLat: coords,
                                        color: "blue"
                                    });

                                    // Accuracy circle
                                    myAccuracyCircle = olaMaps.addCircle({
                                        map,
                                        center: coords,
                                        radius: accuracy,
                                        color: "rgba(0, 0, 255, 0.2)"
                                    });
                                } else {
                                    myMarker.setLngLat(coords);
                                    myAccuracyCircle.setCenter(coords).setRadius(accuracy);
                                }

                                // Send my location to server
                                socket.emit("send-location", { latitude, longitude, accuracy });
                            },
                            (error) => console.error("Geolocation error:", error),
                            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                        );
                    } else {
                        alert("Geolocation not supported in your browser.");
                    }
                });

                // ✅ Other users’ markers
                socket.on("receive-location", (data) => {
                    const { id, latitude, longitude } = data;
                    const coords = [longitude, latitude];

                    if (!otherMarkers[id]) {
                        otherMarkers[id] = olaMaps.addMarker({
                            map,
                            lngLat: coords,
                            color: "red"
                        });
                    } else {
                        otherMarkers[id].setLngLat(coords);
                    }
                });

                // ✅ Remove marker when user disconnects
                socket.on("user-disconnected", (id) => {
                    if (otherMarkers[id]) {
                        otherMarkers[id].remove();
                        delete otherMarkers[id];
                    }
                });
            });
        </script>
    </body>
    </html>
  `);
});

// Socket.io events
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("send-location", (data) => {
    io.emit("receive-location", { id: socket.id, ...data });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    io.emit("user-disconnected", socket.id);
  });
});

// Start server
server.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
