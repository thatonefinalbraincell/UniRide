import os
import sys
import uvicorn

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
os.chdir(backend_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("\n" + "="*55)
    print(" UniRide — Campus Ride-Sharing Server Starting...")
    print(" Open your browser at: http://localhost:8000")
    print(" API Docs available at: http://localhost:8000/docs")
    print("="*55 + "\n")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
