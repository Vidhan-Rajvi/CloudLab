from pydantic import BaseModel, Field


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


class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True
