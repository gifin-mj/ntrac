const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

const devices = {}; // Store device data including location and metadata

// Haversine formula to calculate distance in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radius of Earth in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

io.on('connection', (socket) => {
    console.log(`Device connected: ${socket.id}`);

    socket.on('updateLocation', (data) => {
        const { latitude, longitude } = data;
        const currentTime = Date.now();

        // Check if the device has a previous location
        if (devices[socket.id]) {
            const previousData = devices[socket.id];
            const { latitude: prevLat, longitude: prevLon, timestamp: prevTime } = previousData;

            // Calculate distance and speed
            const distance = calculateDistance(prevLat, prevLon, latitude, longitude);
            const timeElapsed = (currentTime - prevTime) / 1000; // Time in seconds
            const speed = timeElapsed > 0 ? distance / timeElapsed : 0; // Speed in m/s

            console.log(`Device ${socket.id}: Distance covered: ${distance.toFixed(2)}m, Speed: ${speed.toFixed(2)}m/s`);

            // Update the device's data
            devices[socket.id] = { latitude, longitude, timestamp: currentTime, distance, speed };
        } else {
            // First location update for the device
            devices[socket.id] = { latitude, longitude, timestamp: currentTime, distance: 0, speed: 0 };
        }

        // Emit updated device data to all clients
        io.emit('deviceLocations', devices);
    });

    socket.on('disconnect', () => {
        console.log(`Device disconnected: ${socket.id}`);
        delete devices[socket.id];
        io.emit('deviceLocations', devices);
    });
});

app.get('/', (req, res) => {
    res.render('index');
});

server.listen(3000, () => {
    console.log('Server listening on PORT: 3000');
});
