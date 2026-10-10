# 🚗 UniRide — College Campus Ride-Sharing Platform

**UniRide** is a student-focused, campus ride-sharing web application built for college universities (such as CUSAT, Kochi). It connects verified student drivers with student riders looking for a lift across campus or around the city.

---

## 🏗️ System Architecture & Data Flow

```
                               +-----------------------+
                               |     CLIENT BROWSER    |
                               | (HTML5, CSS3, JS ES6) |
                               +-----------+-----------+
                                           |
                    HTTP / REST API Calls  |  Leaflet Map Tiles & OSRM Routes
                                           v
       +-----------------------------------+-----------------------------------+
       |                                                                       |
       v                                                                       v
+-----------------------------+                           +--------------------+
|    FastAPI BACKEND SERVER   |                           |   OPENSTREETMAP /  |
|  - Uvicorn ASGI Server      |                           |     OSRM ENGINE    |
|  - CORS Middleware          |                           |  - Map Tiles       |
|  - Pydantic Validation      |                           |  - Routing Engine  |
|  - JWT Authentication       |                           +--------------------+
+--------------+--------------+
               |
               v SQLAlchemy ORM
+-----------------------------+
|     POSTGRESQL / SUPABASE   |
|   (or Local SQLite Fallback)|
|  - Users Table              |
|  - Vehicles Table           |
|  - Rides Table              |
|  - Ride Requests Table      |
+-----------------------------+
```

### 🔄 End-to-End Data Flow Workflow
1. **Student Authentication:** Client signs in via Student ID / Email -> FastAPI validates PBKDF2 hashed credentials -> Generates signed JWT access token -> Client stores JWT in `localStorage` for automatic device auto-login.
2. **Post-Login Role Selector:** Prompt asks user for session mode -> **Rider Mode** or **Driver Mode**.
3. **Driver Workflow:** Driver registers vehicle -> Selects active vehicle -> Posts ride with origin, destination, departure time, and available seats -> Saved to DB -> OSRM API plots route geometry on the Leaflet map.
4. **Rider Workflow:** Rider queries rides -> Views driver details, vehicle specs & route -> Submits booking request -> Driver receives notification in "Incoming Requests" -> Driver clicks **Accept ✅** -> Database atomically decrements available seats.

---

## 🌟 Key Features

### 🔐 1. Authentication & Student ID Verification
* **Student ID Registration:** Log in using your verified **Student ID** (e.g. `STU-1001`) or campus email (`alex@cusat.ac.in`) and password.
* **Device Auto-Login:** Session JWT is stored in `localStorage` for automatic background auto-login on the same device.
* **Role Flexibility:** Toggle between **Driver Mode** and **Rider Mode** seamlessly within the same interface.

### 🚗 2. Vehicle Registration & Active Vehicle Selection (Drivers)
* **Register Vehicles:** Enter **License Plate Number**, **Vehicle Type** (Sedan, SUV, Scooter, E-Bike, Hatchback), **Make & Model**, **Seating Capacity**, and **Color**.
* **Multi-Vehicle Support:** Save multiple vehicles to your profile.
* **Active Vehicle Selector:** Choose which vehicle you are driving today from a quick-select dropdown so seating capacity and vehicle info automatically attach to your posted rides!

### 🗺️ 3. Interactive Leaflet Map & CUSAT OSRM Route Engine
* **Campus Locations:** Interactive pins for **CUSAT Main Gate**, **School of Engineering (SOE)**, **Dept of Computer Applications (DCA)**, **Central Library**, **Student Amenity Centre**, **Dept of Ship Technology**, **Siberia Hostels**, and **CUSAT Metro Station**.
* **OSRM Route Visualizer:** Real-time distance calculation (km), estimated duration (minutes), and dynamic route lines on the Leaflet map.

### 🚙 4. Driver Workflow (Posting & Managing Rides)
* **Post a Ride:** Select pickup and dropoff points, departure date/time, available seats, price per seat (or free campus pool), and custom notes.
* **Manage Posted Rides:** View active rides, track booked seats, and change ride status (*Scheduled*, *Active*, *Completed*, *Cancelled*).
* **Incoming Booking Requests:** View live incoming rider requests and click **Accept ✅** or **Reject ❌** with instant seat deduction!

### 🚕 5. Rider Workflow (Booking & Requesting Rides)
* **Discover Rides / Pools:** Search & filter posted driver rides by pickup, destination, seats left, vehicle type, and departure time.
* **Request a Seat:** Send an instant booking request to the student driver.
* **Request Custom Ride:** Post a custom ride request if no driver matches your exact schedule/route.
* **Track Request Status:** Monitor your ride requests (*Pending ⏳*, *Accepted ✅*, *Rejected ❌*).

---

## 🛠️ Technology Stack

* **Backend:** FastAPI (Python 3.10+), SQLAlchemy, Pydantic, JWT Auth, OSRM Proxy API
* **Database:** PostgreSQL (Supabase Compatible) / SQLite (Zero-config local fallback)
* **Frontend:** HTML5, Modern CSS3 (Beige & Walnut Brown Theme, Plus Jakarta Sans font), Vanilla JavaScript ES6
* **Maps & Geocoding:** Leaflet.js, OpenStreetMap Tiles, OSRM Routing Engine

---

## 🚀 How to Run (Without Virtual Environments)

You do **NOT** need to create or activate any Python virtual environments (`venv`). 

### Step 1: Install Required Dependencies Globally
Open your PowerShell or Command Prompt in the project folder and run:
```powershell
python -m pip install -r backend/requirements.txt
```

### Step 2: Launch the UniRide Server
Simply run:
```powershell
python run.py
```

### Step 3: Open in Browser
Visit **[http://localhost:8000](http://localhost:8000)** in your browser!
API Documentation is available at **[http://localhost:8000/docs](http://localhost:8000/docs)**.

---

## 🗄️ Database Options (SQLite vs. Supabase PostgreSQL)

### Option A: Zero-Config Local SQLite (Default)
No extra setup required! UniRide automatically creates `backend/uniride.db` SQLite database when you launch the server.

### Option B: Supabase PostgreSQL Setup
1. Go to [Supabase.com](https://supabase.com) and create a free project.
2. In your Supabase Dashboard, navigate to **SQL Editor**.
3. Copy the contents of [`backend/schema.sql`](file:///d:/desktop/projects/uniride/backend/schema.sql) and paste it into the SQL Editor, then click **Run**.
4. Create a `.env` file inside `backend/`:
   ```env
   DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   JWT_SECRET=your_custom_secret_key_here
   ```