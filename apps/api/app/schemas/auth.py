from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    username: str
    nickname: str | None
    avatar_url: str | None
    points_balance: int

    class Config:
        from_attributes = True
