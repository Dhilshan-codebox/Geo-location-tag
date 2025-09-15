const express = require("express");
const app = express();
const path = require("path");
const http = require("http");
const socketio = require("socket.io");

// Create HTTP server and bind socket.io
const server = http.createServer(app);
const io = socketio(server);

// Set view engine
app.set("view engine", "ejs");

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Socket.io connection handling
io.on("connection", function (socket) {
    console.log("New user connected:", socket.id);

    socket.on("send-location", function (data) {
        io.emit("receive-location", { id: socket.id, ...data });
    });

    socket.on("disconnect", function () {
        console.log("User disconnected:", socket.id);
        io.emit("user-disconnected", socket.id);
    });
});

// Route for homepage
app.get("/", function (req, res) {
    res.render("index"); // Make sure you have "views/index.ejs"
});

// Start server
server.listen(3000, function () {
    console.log("Server running on http://localhost:3000");
});
