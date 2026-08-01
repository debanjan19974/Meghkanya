from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasswordResetRequest(BaseModel):
    username: str
    reset_code: str
    new_password: str


class PasswordResetResponse(BaseModel):
    message: str
