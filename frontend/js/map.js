// Map Manager using Leaflet & OSRM API for CUSAT (Cochin University of Science and Technology), Kochi

const MapManager = {
    map: null,
    routeLayer: null,
    markers: [],
    // CUSAT Main Campus Coordinates (Kalamassery, Kochi)
    campusCenter: [10.0440, 76.3260], 

    // CUSAT Campus Locations & Department Landmarks
    campusLocations: [
        { name: "CUSAT Main Gate (Kalamassery)", lat: 10.0435, lng: 76.3245 },
        { name: "School of Engineering (SOE)", lat: 10.0460, lng: 76.3265 },
        { name: "Dept of Computer Applications (DCA)", lat: 10.0425, lng: 76.3275 },
        { name: "Central Library & Administrative Block", lat: 10.0430, lng: 76.3255 },
        { name: "CUSAT Student Amenity Centre", lat: 10.0445, lng: 76.3235 },
        { name: "Dept of Ship Technology", lat: 10.0410, lng: 76.3280 },
        { name: "Siberia & Campus Hostels", lat: 10.0480, lng: 76.3250 },
        { name: "CUSAT Metro Station", lat: 10.0495, lng: 76.3200 }
    ],

    init(containerId = 'map') {
        if (this.map) return;

        // Initialize Leaflet Map centered on CUSAT Campus
        this.map = L.map(containerId, {
            zoomControl: true,
            attributionControl: false
        }).setView(this.campusCenter, 15);

        // OpenStreetMap standard tile layer — 100% Free, NO API KEY Required
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            subdomains: 'abc'
        }).addTo(this.map);

        // Render CUSAT campus location pins
        this.renderCampusSpots();
    },

    renderCampusSpots() {
        this.campusLocations.forEach(spot => {
            const icon = L.divIcon({
                className: 'custom-map-marker',
                html: `<div style="background-color: #4a3525; color: #ffffff; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; border: 1px solid #e4ded5; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">${spot.name}</div>`,
                iconSize: [120, 20],
                iconAnchor: [60, 10]
            });

            L.marker([spot.lat, spot.lng], { icon })
                .addTo(this.map)
                .bindPopup(`<b>${spot.name}</b><br>CUSAT Campus Landmark`);
        });
    },

    async drawRoute(startLat, startLng, endLat, endLng, startLabel = "Origin", endLabel = "Destination") {
        if (!this.map) return;

        // Clear existing route line and temp markers
        this.clearRoute();

        try {
            // Call Backend OSRM Proxy API
            const response = await fetch(`/api/osrm/route?start_lat=${startLat}&start_lng=${startLng}&end_lat=${endLat}&end_lng=${endLng}`);
            const data = await response.json();

            if (data.geometry && data.geometry.coordinates) {
                // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
                const latLngs = data.geometry.coordinates.map(coord => [coord[1], coord[0]]);

                // Draw Solid Warm Brown Polyline
                this.routeLayer = L.polyline(latLngs, {
                    color: '#4a3525',
                    weight: 5,
                    opacity: 0.9,
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(this.map);

                // Add Pickup and Dropoff Markers
                const startMarker = L.marker([startLat, startLng])
                    .addTo(this.map)
                    .bindPopup(`<b>Pickup:</b> ${startLabel}`).openPopup();

                const endMarker = L.marker([endLat, endLng])
                    .addTo(this.map)
                    .bindPopup(`<b>Destination:</b> ${endLabel}`);

                this.markers.push(startMarker, endMarker);

                // Fit map bounds smoothly around CUSAT route
                this.map.fitBounds(this.routeLayer.getBounds(), { padding: [40, 40] });

                return {
                    distance_km: data.distance_km,
                    duration_mins: data.duration_mins
                };
            }
        } catch (err) {
            console.error("OSRM Route drawing failed:", err);
        }
    },

    clearRoute() {
        if (this.routeLayer) {
            this.map.removeLayer(this.routeLayer);
            this.routeLayer = null;
        }
        this.markers.forEach(m => this.map.removeLayer(m));
        this.markers = [];
    }
};
