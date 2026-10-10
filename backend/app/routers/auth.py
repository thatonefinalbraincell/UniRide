from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Vehicle
from app.schemas import UserRegister, UserLogin, Token, UserResponse
from app.utils import hash_password, verify_password, create_access_token
from app.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/signup", response_model=Token)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if student ID or email exists
    existing_id = db.query(User).filter(User.student_id == user_in.student_id).first()
    if existing_id:
        raise HTTPException(status_code=400, detail="Student ID is already registered.")
    
    existing_email = db.query(User).filter(User.email == user_in.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email is already registered.")
    
    new_user = User(
        student_id=user_in.student_id,
        full_name=user_in.full_name,
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role=user_in.role or "both",
        department=user_in.department,
        phone=user_in.phone
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token({"sub": new_user.student_id, "user_id": new_user.id})
    return {"access_token": token, "token_type": "bearer", "user": new_user}


@router.post("/login", response_model=Token)
def login_user(login_in: UserLogin, db: Session = Depends(get_db)):
    # Find user by student ID or email
    user = db.query(User).filter(
        (User.student_id == login_in.student_id_or_email) | (User.email == login_in.student_id_or_email)
    ).first()
    
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid Student ID/Email or Password.")
    
    token = create_access_token({"sub": user.student_id, "user_id": user.id})
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
