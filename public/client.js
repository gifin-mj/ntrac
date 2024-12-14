const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const socket = io();
const deviceMarkers = {};

const GEO_TIMEOUT = 5000; // Timeout in milliseconds (10 seconds)

if (navigator.geolocation) {
    // Start watching the position
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;

            // Send location to the server
            socket.emit('updateLocation', { latitude, longitude });
        },
        (error) => {
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    console.error('User denied the request for Geolocation.');
                    break;
                case error.POSITION_UNAVAILABLE:
                    console.error('Location information is unavailable.');
                    break;
                case error.TIMEOUT:
                    console.error('The request to get user location timed out.');
                    break;
                default:
                    console.error('An unknown error occurred.');
                    break;
            }
        },
        {
            enableHighAccuracy: true, // Use GPS if possible
            timeout: GEO_TIMEOUT, // Timeout for a location request
            maximumAge: 0, // Don't use cached positions
        }
    );
} else {
    alert('Geolocation is not supported by your browser');
}

// Listen for updates on other devices' locations
socket.on('deviceLocations', (devices) => {
    Object.keys(devices).forEach((deviceId) => {
        const { latitude, longitude, distance, speed } = devices[deviceId];
        if (!deviceMarkers[deviceId]) {
            deviceMarkers[deviceId] = L.marker([latitude, longitude])
                .addTo(map)
                .bindPopup(`Device: ${deviceId}<br>Distance: ${distance.toFixed(2)}m<br>Speed: ${speed.toFixed(2)}m/s`);
        } else {
            deviceMarkers[deviceId].setLatLng([latitude, longitude]);
            deviceMarkers[deviceId].bindPopup(`Device: ${deviceId}<br>Distance: ${distance.toFixed(2)}m<br>Speed: ${speed.toFixed(2)}m/s`);
        }
    });

    Object.keys(deviceMarkers).forEach((deviceId) => {
        if (!devices[deviceId]) {
            map.removeLayer(deviceMarkers[deviceId]);
            delete deviceMarkers[deviceId];
        }
    });
});
