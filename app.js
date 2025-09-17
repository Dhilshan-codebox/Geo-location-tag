const express = require("express");
const path = require("path");
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
          href="https://api.olamaps.io/sdk/css?key=4oR744Q1apy1OhG7xeffl6LvXpF8MT0kIrsRvE36"
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
            const otherMarkers = {};

            window.addEventListener("load", () => {
                if (!window.OlaMaps) {
                    alert("Ola Maps SDK failed to load.");
                    return;
                }

                // Initialize 3D Ola Map
                const olaMaps = new window.OlaMaps({
                    apiKey: "4oR744Q1apy1OhG7xeffl6LvXpF8MT0kIrsRvE36",
                    mode: "3d",
                    threedTileset: "https://api.olamaps.io/tiles/vector/v1/3dtiles/tileset.json"
                });

                const map = olaMaps.init({
                    style: "https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json",
                    container: "map",
                    zoom: 16,
                    pitch: 60,   // tilt for 3D
                    bearing: -20
                });

                // Track live location with HIGH ACCURACY
                if (navigator.geolocation) {
                    navigator.geolocation.watchPosition(
                        (position) => {
                            const { latitude, longitude, accuracy } = position.coords;
                            const coords = [longitude, latitude];

                            // First fix → center map + create marker
                            if (!myMarker) {
                                map.setCenter(coords);
                                myMarker = new olaMaps.Marker({ color: "blue" })
                                    .setLngLat(coords)
                                    .addTo(map);
                            } else {
                                myMarker.setLngLat(coords);
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

                // Handle other users’ markers
                socket.on("receive-location", (data) => {
                    const { id, latitude, longitude } = data;
                    const coords = [longitude, latitude];

                    if (!otherMarkers[id]) {
                        otherMarkers[id] = new olaMaps.Marker({ color: "red" })
                            .setLngLat(coords)
                            .addTo(map);
                    } else {
                        otherMarkers[id].setLngLat(coords);
                    }
                });

                // Remove marker when user disconnects
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
