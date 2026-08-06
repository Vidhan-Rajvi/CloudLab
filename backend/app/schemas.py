from pydantic import BaseModel, Field

# -----------------------------
# User Schemas
# -----------------------------
class UserCreate(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=100,
        description="User Name"
    )
    email: str = Field(
        min_length=5,
        max_length=100,
        pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$",
        description="User Email"
    )
    password: str = Field(
        min_length=8,
        max_length=100,
        description="User Password"
    )


class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


# -----------------------------
# Authentication Schemas
# -----------------------------
class LoginRequest(BaseModel):
    email: str = Field(
        min_length=5,
        max_length=100,
        pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$",
        description="User Email"
    )
    password: str = Field(
        min_length=8,
        description="User Password"
    )


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: str | None = None
