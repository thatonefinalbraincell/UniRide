// Main UniRide Application Controller (Auth-First, Responsive & Role Selection Flow)

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    currentRole: null, // 'rider' or 'driver'
    activeVehicle: null,
    myVehicles: [],
    availableRides: [],

    async init() {
        this.bindEvents();

        // Check for Auto-Login from same device
        const autoUser = await AuthManager.checkAutoLogin();
        if (autoUser) {
            this.handlePostAuthFlow(autoUser);
        } else {
            this.showAuthLanding();
        }
    },

    bindEvents() {
        // Landing Auth Tab Switcher
        document.getElementById('tabBtnLogin')?.addEventListener('click', () => this.switchAuthTab('login'));
        document.getElementById('tabBtnSignup')?.addEventListener('click', () => this.switchAuthTab('signup'));

        // Form Submissions
        document.getElementById('formLandingLogin')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('formLandingSignup')?.addEventListener('submit', (e) => this.handleSignup(e));
        document.getElementById('formVehicle')?.addEventListener('submit', (e) => this.handleVehicleRegister(e));
        document.getElementById('formPostRide')?.addEventListener('submit', (e) => this.handlePostRide(e));
        document.getElementById('formRequestRide')?.addEventListener('submit', (e) => this.handleRequestRide(e));

        // Role Selection Options (Post-Login Prompt)
        document.getElementById('cardSelectRider')?.addEventListener('click', () => this.selectSessionRole('rider'));
        document.getElementById('cardSelectDriver')?.addEventListener('click', () => this.selectSessionRole('driver'));

        // Navbar Role Switch Buttons
        document.getElementById('btnRoleRider')?.addEventListener('click', () => this.switchRole('rider'));
        document.getElementById('btnRoleDriver')?.addEventListener('click', () => this.switchRole('driver'));

        // Navbar User Menu & Modals Toggle
        document.getElementById('btnLogout')?.addEventListener('click', () => AuthManager.logout());
        document.getElementById('btnOpenVehicleModal')?.addEventListener('click', () => this.showVehicleModal());
        document.getElementById('btnOpenPostRideModal')?.addEventListener('click', () => this.showPostRideModal());
        document.getElementById('btnOpenRequestRideModal')?.addEventListener('click', () => this.showRequestRideModal());

        // Modal Close Buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });

        // Vehicle Selector Dropdown
        document.getElementById('selectActiveVehicle')?.addEventListener('change', (e) => this.handleVehicleChange(e));

        // Search Filters for Rides
        document.getElementById('inputSearchOrigin')?.addEventListener('input', () => this.fetchAvailableRides());
        document.getElementById('inputSearchDest')?.addEventListener('input', () => this.fetchAvailableRides());
    },

    showAuthLanding() {
        document.getElementById('authLandingView').style.display = 'flex';
        document.getElementById('roleSelectModal').style.display = 'none';
        document.getElementById('dashboardView').style.display = 'none';
    },

    switchAuthTab(tab) {
        const loginForm = document.getElementById('formLandingLogin');
        const signupForm = document.getElementById('formLandingSignup');
        const btnLogin = document.getElementById('tabBtnLogin');
        const btnSignup = document.getElementById('tabBtnSignup');

        if (tab === 'login') {
            loginForm.style.display = 'flex';
            signupForm.style.display = 'none';
            btnLogin.classList.add('active');
            btnSignup.classList.remove('active');
        } else {
            loginForm.style.display = 'none';
            signupForm.style.display = 'flex';
            btnSignup.classList.add('active');
            btnLogin.classList.remove('active');
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        try {
            const id = document.getElementById('landingLoginId').value;
            const pass = document.getElementById('landingLoginPass').value;
            const user = await AuthManager.login(id, pass);
            this.handlePostAuthFlow(user);
        } catch (err) {
            alert(err.message);
        }
    },

    async handleSignup(e) {
        e.preventDefault();
        try {
            const userData = {
                student_id: document.getElementById('landingSignId').value,
                full_name: document.getElementById('landingSignName').value,
                email: document.getElementById('landingSignEmail').value,
                password: document.getElementById('landingSignPass').value,
                department: document.getElementById('landingSignDept').value,
                role: 'both'
            };
            const user = await AuthManager.signup(userData);
            this.handlePostAuthFlow(user);
        } catch (err) {
            alert(err.message);
        }
    },

    handlePostAuthFlow(user) {
        document.getElementById('authLandingView').style.display = 'none';

        // Check if role was already chosen for this session
        const savedRole = sessionStorage.getItem('uniride_session_role');
        if (savedRole && (savedRole === 'rider' || savedRole === 'driver')) {
            this.selectSessionRole(savedRole);
        } else {
            // Show Role Selection Prompt ("Are you a Rider or a Driver?")
            document.getElementById('roleSelectModal').style.display = 'flex';
        }
    },

    selectSessionRole(role) {
        this.currentRole = role;
        sessionStorage.setItem('uniride_session_role', role);

        document.getElementById('roleSelectModal').style.display = 'none';
        document.getElementById('dashboardView').style.display = 'flex';

        // Initialize Map & Load Workspace Data
        MapManager.init('map');
        this.updateAuthUI();
        this.switchRole(role);
        this.loadInitialData();
    },

    switchRole(role) {
        this.currentRole = role;
        sessionStorage.setItem('uniride_session_role', role);

        document.getElementById('btnRoleRider').classList.toggle('active', role === 'rider');
        document.getElementById('btnRoleDriver').classList.toggle('active', role === 'driver');

        document.getElementById('riderView').style.display = role === 'rider' ? 'flex' : 'none';
        document.getElementById('driverView').style.display = role === 'driver' ? 'flex' : 'none';

        if (role === 'driver') {
            this.fetchDriverDashboardData();
        } else {
            this.fetchAvailableRides();
            this.fetchRiderBookings();
        }
    },

    updateAuthUI() {
        const user = AuthManager.getUser();
        const userNameEl = document.getElementById('userNameDisplay');
        const userDeptEl = document.getElementById('userDeptDisplay');

        if (user) {
            if (userNameEl) userNameEl.textContent = user.full_name;
            if (userDeptEl) userDeptEl.textContent = `${user.student_id} • ${user.department || 'CUSAT'}`;
        }
    },

    async loadInitialData() {
        await this.fetchMyVehicles();
        if (this.currentRole === 'driver') {
            await this.fetchDriverDashboardData();
        } else {
            await this.fetchAvailableRides();
            await this.fetchRiderBookings();
        }
    },

    // --- Vehicle Management ---
    async fetchMyVehicles() {
        if (!AuthManager.isLoggedIn()) return;
        try {
            const resp = await fetch('/api/vehicles', { headers: AuthManager.getAuthHeader() });
            if (resp.ok) {
                this.myVehicles = await resp.json();
                this.renderVehicleSelector();
            }
        } catch (err) {
            console.error("Failed fetching vehicles:", err);
        }
    },

    renderVehicleSelector() {
        const selectEl = document.getElementById('selectActiveVehicle');
        const activeDisplay = document.getElementById('activeVehicleDisplay');
        if (!selectEl) return;

        selectEl.innerHTML = '';
        if (this.myVehicles.length === 0) {
            selectEl.innerHTML = '<option value="">No registered vehicles (Click + Add)</option>';
            if (activeDisplay) activeDisplay.textContent = 'No active vehicle';
            this.activeVehicle = null;
            return;
        }

        let activeFound = false;
        this.myVehicles.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.textContent = `${v.make_model} (${v.license_number}) - ${v.capacity} Seats`;
            if (v.is_active) {
                opt.selected = true;
                this.activeVehicle = v;
                activeFound = true;
                if (activeDisplay) activeDisplay.textContent = `${v.make_model} • ${v.license_number} (${v.capacity} Seats)`;
            }
            selectEl.appendChild(opt);
        });

        if (!activeFound && this.myVehicles.length > 0) {
            this.activeVehicle = this.myVehicles[0];
            selectEl.options[0].selected = true;
            if (activeDisplay) activeDisplay.textContent = `${this.activeVehicle.make_model} • ${this.activeVehicle.license_number}`;
        }
    },

    async handleVehicleChange(e) {
        const vehicleId = e.target.value;
        if (!vehicleId) return;

        try {
            const resp = await fetch(`/api/vehicles/${vehicleId}/set-active`, {
                method: 'PUT',
                headers: AuthManager.getAuthHeader()
            });
            if (resp.ok) {
                await this.fetchMyVehicles();
            }
        } catch (err) {
            alert('Failed to change active vehicle');
        }
    },

    async handleVehicleRegister(e) {
        e.preventDefault();
        const data = {
            license_number: document.getElementById('vehLicense').value,
            vehicle_type: document.getElementById('vehType').value,
            make_model: document.getElementById('vehMakeModel').value,
            capacity: parseInt(document.getElementById('vehCapacity').value),
            color: document.getElementById('vehColor').value
        };

        try {
            const resp = await fetch('/api/vehicles', {
                method: 'POST',
                headers: { ...AuthManager.getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result.detail || 'Registration failed');

            document.getElementById('modalVehicle').classList.remove('active');
            e.target.reset();
            alert('Vehicle registered successfully!');
            await this.fetchMyVehicles();
        } catch (err) {
            alert(err.message);
        }
    },

    // --- Driver Rides & Requests ---
    async fetchDriverDashboardData() {
        await this.fetchDriverPostedRides();
        await this.fetchDriverIncomingRequests();
    },

    async fetchDriverPostedRides() {
        try {
            const resp = await fetch('/api/rides/my-posts', { headers: AuthManager.getAuthHeader() });
            if (resp.ok) {
                const rides = await resp.json();
                this.renderDriverPostedRides(rides);
            }
        } catch (err) {
            console.error("Error fetching driver rides:", err);
        }
    },

    renderDriverPostedRides(rides) {
        const container = document.getElementById('driverRidesList');
        if (!container) return;

        if (rides.length === 0) {
            container.innerHTML = '<div class="text-muted" style="text-align: center; padding: 1.5rem;">No posted rides yet. Click "+ Post a Ride" to offer a campus lift!</div>';
            return;
        }

        container.innerHTML = rides.map(r => `
            <div class="ride-item" onclick="App.previewRideRoute(${r.origin_lat}, ${r.origin_lng}, ${r.dest_lat}, ${r.dest_lng}, '${r.origin_name}', '${r.dest_name}')">
                <div class="ride-header">
                    <span class="route-preview" title="${r.origin_name} to ${r.dest_name}">
                        <span class="truncate">${r.origin_name}</span>
                        <i class="fa-solid fa-arrow-right route-arrow"></i>
                        <span class="truncate">${r.dest_name}</span>
                    </span>
                    <span class="status-badge status-${r.status}">${r.status}</span>
                </div>
                <div class="ride-meta">
                    <span><i class="fa-regular fa-clock"></i> ${new Date(r.departure_time).toLocaleString()}</span>
                    <span><i class="fa-solid fa-chair"></i> ${r.available_seats} / ${r.total_seats} Left</span>
                </div>
                ${r.vehicle ? `<div class="truncate" style="font-size:0.78rem; color:var(--secondary);"><i class="fa-solid fa-car"></i> ${r.vehicle.make_model} (${r.vehicle.license_number})</div>` : ''}
            </div>
        `).join('');
    },

    async fetchDriverIncomingRequests() {
        try {
            const resp = await fetch('/api/requests/driver', { headers: AuthManager.getAuthHeader() });
            if (resp.ok) {
                const requests = await resp.json();
                this.renderDriverRequests(requests);
            }
        } catch (err) {
            console.error("Error fetching driver requests:", err);
        }
    },

    renderDriverRequests(requests) {
        const container = document.getElementById('driverRequestsList');
        if (!container) return;

        if (requests.length === 0) {
            container.innerHTML = '<div class="text-muted" style="text-align: center; padding: 1.5rem;">No incoming rider requests at the moment.</div>';
            return;
        }

        container.innerHTML = requests.map(req => `
            <div class="ride-item">
                <div class="ride-header">
                    <div class="driver-tag">
                        <div class="avatar-sm">${(req.rider?.full_name || 'Rider')[0]}</div>
                        <div class="truncate" style="max-width: 140px;">
                            <div class="truncate">${req.rider?.full_name || 'Student'}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${req.rider?.student_id}</div>
                        </div>
                    </div>
                    <span class="status-badge status-${req.status}">${req.status}</span>
                </div>
                <div class="route-preview" style="font-size:0.82rem;" title="${req.pickup_name} to ${req.dropoff_name}">
                    <span class="truncate">${req.pickup_name}</span>
                    <i class="fa-solid fa-arrow-right route-arrow"></i>
                    <span class="truncate">${req.dropoff_name}</span>
                </div>
                <div class="ride-meta">
                    <span>Requested Seats: <b>${req.requested_seats}</b></span>
                    ${req.status === 'pending' ? `
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-success btn-sm" onclick="App.updateRequestStatus(${req.id}, 'accepted')"><i class="fa-solid fa-check"></i> Accept</button>
                            <button class="btn btn-danger btn-sm" onclick="App.updateRequestStatus(${req.id}, 'rejected')"><i class="fa-solid fa-xmark"></i> Reject</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    },

    async updateRequestStatus(reqId, status) {
        try {
            const resp = await fetch(`/api/requests/${reqId}/status`, {
                method: 'PATCH',
                headers: { ...AuthManager.getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.detail || 'Update failed');

            alert(`Request marked as ${status}!`);
            await this.fetchDriverDashboardData();
        } catch (err) {
            alert(err.message);
        }
    },

    async handlePostRide(e) {
        e.preventDefault();
        if (!this.activeVehicle) {
            alert('Please register or select an active vehicle first!');
            return;
        }

        const originSpot = MapManager.campusLocations.find(loc => loc.name === document.getElementById('postOrigin').value) || MapManager.campusLocations[0];
        const destSpot = MapManager.campusLocations.find(loc => loc.name === document.getElementById('postDest').value) || MapManager.campusLocations[1];

        const rideData = {
            vehicle_id: this.activeVehicle.id,
            origin_name: originSpot.name,
            origin_lat: originSpot.lat,
            origin_lng: originSpot.lng,
            dest_name: destSpot.name,
            dest_lat: destSpot.lat,
            dest_lng: destSpot.lng,
            departure_time: new Date(document.getElementById('postDepTime').value).toISOString(),
            available_seats: parseInt(document.getElementById('postSeats').value),
            price_per_seat: parseFloat(document.getElementById('postPrice').value || 0),
            notes: document.getElementById('postNotes').value
        };

        try {
            const resp = await fetch('/api/rides', {
                method: 'POST',
                headers: { ...AuthManager.getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(rideData)
            });
            const res = await resp.json();
            if (!resp.ok) throw new Error(res.detail || 'Failed to post ride');

            document.getElementById('modalPostRide').classList.remove('active');
            e.target.reset();
            alert('Campus ride posted successfully!');
            await this.fetchDriverPostedRides();
        } catch (err) {
            alert(err.message);
        }
    },

    // --- Rider Section ---
    async fetchAvailableRides() {
        const origin = document.getElementById('inputSearchOrigin')?.value || '';
        const dest = document.getElementById('inputSearchDest')?.value || '';

        try {
            const resp = await fetch(`/api/rides?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}`);
            if (resp.ok) {
                this.availableRides = await resp.json();
                this.renderAvailableRides();
            }
        } catch (err) {
            console.error("Error fetching rides:", err);
        }
    },

    renderAvailableRides() {
        const container = document.getElementById('availableRidesList');
        if (!container) return;

        if (this.availableRides.length === 0) {
            container.innerHTML = '<div class="text-muted" style="text-align: center; padding: 1.5rem;">No upcoming rides found matching your query.</div>';
            return;
        }

        container.innerHTML = this.availableRides.map(r => `
            <div class="ride-item" onclick="App.previewRideRoute(${r.origin_lat}, ${r.origin_lng}, ${r.dest_lat}, ${r.dest_lng}, '${r.origin_name}', '${r.dest_name}')">
                <div class="ride-header">
                    <div class="driver-tag">
                        <div class="avatar-sm">${(r.driver?.full_name || 'Driver')[0]}</div>
                        <div class="truncate" style="max-width: 140px;">
                            <div class="truncate">${r.driver?.full_name || 'Campus Driver'}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);" class="truncate">${r.vehicle?.make_model || 'Vehicle'} • ${r.vehicle?.license_number || ''}</div>
                        </div>
                    </div>
                    <span style="font-weight:700; color:var(--primary); font-size:0.9rem;">${r.price_per_seat > 0 ? '₹' + r.price_per_seat : 'FREE'}</span>
                </div>
                <div class="route-preview" title="${r.origin_name} to ${r.dest_name}">
                    <span class="truncate">${r.origin_name}</span>
                    <i class="fa-solid fa-arrow-right route-arrow"></i>
                    <span class="truncate">${r.dest_name}</span>
                </div>
                <div class="ride-meta">
                    <span><i class="fa-regular fa-clock"></i> ${new Date(r.departure_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <span><i class="fa-solid fa-chair"></i> ${r.available_seats} left</span>
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); App.requestSeatInRide(${r.id}, '${r.origin_name}', ${r.origin_lat}, ${r.origin_lng}, '${r.dest_name}', ${r.dest_lat}, ${r.dest_lng})">
                        Request Seat
                    </button>
                </div>
            </div>
        `).join('');
    },

    async requestSeatInRide(rideId, pickupName, pickupLat, pickupLng, dropoffName, dropoffLat, dropoffLng) {
        try {
            const resp = await fetch('/api/requests', {
                method: 'POST',
                headers: { ...AuthManager.getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ride_id: rideId,
                    pickup_name: pickupName,
                    pickup_lat: pickupLat,
                    pickup_lng: pickupLng,
                    dropoff_name: dropoffName,
                    dropoff_lat: dropoffLat,
                    dropoff_lng: dropoffLng,
                    requested_seats: 1
                })
            });
            const res = await resp.json();
            if (!resp.ok) throw new Error(res.detail || 'Request failed');

            alert('Ride request sent to driver! Check status under "My Bookings".');
            await this.fetchRiderBookings();
        } catch (err) {
            alert(err.message);
        }
    },

    async fetchRiderBookings() {
        if (!AuthManager.isLoggedIn()) return;
        try {
            const resp = await fetch('/api/requests/rider', { headers: AuthManager.getAuthHeader() });
            if (resp.ok) {
                const requests = await resp.json();
                this.renderRiderBookings(requests);
            }
        } catch (err) {
            console.error("Error fetching rider requests:", err);
        }
    },

    renderRiderBookings(requests) {
        const container = document.getElementById('riderBookingsList');
        if (!container) return;

        if (requests.length === 0) {
            container.innerHTML = '<div class="text-muted" style="text-align: center; padding: 1.5rem;">No active ride bookings.</div>';
            return;
        }

        container.innerHTML = requests.map(req => `
            <div class="ride-item">
                <div class="ride-header">
                    <span class="route-preview" style="font-size:0.82rem;" title="${req.pickup_name} to ${req.dropoff_name}">
                        <span class="truncate">${req.pickup_name}</span>
                        <i class="fa-solid fa-arrow-right route-arrow"></i>
                        <span class="truncate">${req.dropoff_name}</span>
                    </span>
                    <span class="status-badge status-${req.status}">${req.status}</span>
                </div>
                <div class="ride-meta">
                    <span>Requested: ${new Date(req.created_at).toLocaleDateString()}</span>
                    <span>Seats: ${req.requested_seats}</span>
                </div>
            </div>
        `).join('');
    },

    async handleRequestRide(e) {
        e.preventDefault();

        const pickupSpot = MapManager.campusLocations.find(loc => loc.name === document.getElementById('reqPickup').value) || MapManager.campusLocations[0];
        const dropoffSpot = MapManager.campusLocations.find(loc => loc.name === document.getElementById('reqDropoff').value) || MapManager.campusLocations[1];

        const reqData = {
            pickup_name: pickupSpot.name,
            pickup_lat: pickupSpot.lat,
            pickup_lng: pickupSpot.lng,
            dropoff_name: dropoffSpot.name,
            dropoff_lat: dropoffSpot.lat,
            dropoff_lng: dropoffSpot.lng,
            requested_seats: parseInt(document.getElementById('reqSeats').value || 1),
            notes: document.getElementById('reqNotes').value
        };

        try {
            const resp = await fetch('/api/requests', {
                method: 'POST',
                headers: { ...AuthManager.getAuthHeader(), 'Content-Type': 'application/json' },
                body: JSON.stringify(reqData)
            });
            const res = await resp.json();
            if (!resp.ok) throw new Error(res.detail || 'Request failed');

            document.getElementById('modalRequestRide').classList.remove('active');
            e.target.reset();
            alert('Custom ride request posted to campus drivers!');
            await this.fetchRiderBookings();
        } catch (err) {
            alert(err.message);
        }
    },

    // --- Helpers & Route Previews ---
    async previewRideRoute(startLat, startLng, endLat, endLng, startName, endName) {
        const stats = await MapManager.drawRoute(startLat, startLng, endLat, endLng, startName, endName);
        if (stats) {
            console.log(`Route distance: ${stats.distance_km} km, duration: ${stats.duration_mins} mins`);
        }
    },

    showVehicleModal() {
        document.getElementById('modalVehicle').classList.add('active');
    },

    showPostRideModal() {
        this.populateLocationSelectors('postOrigin', 'postDest');
        document.getElementById('modalPostRide').classList.add('active');
    },

    showRequestRideModal() {
        this.populateLocationSelectors('reqPickup', 'reqDropoff');
        document.getElementById('modalRequestRide').classList.add('active');
    },

    populateLocationSelectors(selectId1, selectId2) {
        [selectId1, selectId2].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = MapManager.campusLocations.map(loc => `<option value="${loc.name}">${loc.name}</option>`).join('');
        });
    }
};
