import os

class Settings:
    PROJECT_NAME: str = "UniRide Campus Ride-Sharing"
    VERSION: str = "1.0.0"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./uniride.db")
    
    JWT_SECRET: str = os.getenv("JWT_SECRET", "uniride_super_secret_jwt_key_2026_campus_ride")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    OSRM_BASE_URL: str = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org")

settings = Settings()
