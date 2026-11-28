from datetime import datetime
from typing import Any, List, Optional
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
        pattern=r"^[\w\.-]+@[\w\.-]+\.\w+\$",
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
        pattern=r"^[\w\.-]+@[\w\.-]+\.\w+\$",
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


# -----------------------------
# Infrastructure Design Schemas (Phase 9.6)
# -----------------------------
class DesignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120, description="Design name")
    description: Optional[str] = Field(default="", max_length=1000)
    nodes: List[dict[str, Any]] = Field(default_factory=list)
    edges: List[dict[str, Any]] = Field(default_factory=list)


class DesignUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
    nodes: Optional[List[dict[str, Any]]] = None
    edges: Optional[List[dict[str, Any]]] = None


class DesignSummary(BaseModel):
    id: int
    name: str
    description: Optional[str] = ""
    node_count: int = 0
    edge_count: int = 0
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class DesignResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = ""
    nodes: List[dict[str, Any]] = Field(default_factory=list)
    edges: List[dict[str, Any]] = Field(default_factory=list)
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
