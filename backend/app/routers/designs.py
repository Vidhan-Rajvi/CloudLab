from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from config.session import get_db
from app.models import InfrastructureDesign
from app.schemas import DesignCreate, DesignResponse, DesignSummary, DesignUpdate
from app.security.jwt import verify_access_token
from app.utils.logger import get_logger

logger = get_logger("cloudlab.designs")

router = APIRouter(
    prefix="/designs",
    tags=["Infrastructure Designs"],
)

optional_security = HTTPBearer(auto_error=False)


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
) -> Optional[dict]:
    if not credentials:
        return None
    payload = verify_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def _check_design_access(design: InfrastructureDesign, current_user: Optional[dict]) -> None:
    if design.owner_id is not None:
        user_id = current_user.get("user_id") if current_user else None
        if user_id != design.owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this infrastructure design.",
            )


@router.post("", response_model=DesignResponse, status_code=status.HTTP_201_CREATED)
def create_design(
    payload: DesignCreate,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Design name cannot be empty.",
        )

    owner_id = current_user.get("user_id") if current_user else None

    design = InfrastructureDesign(
        name=clean_name,
        description=(payload.description or "").strip(),
        nodes=payload.nodes,
        edges=payload.edges,
        owner_id=owner_id,
    )
    db.add(design)
    db.commit()
    db.refresh(design)

    logger.info(
        "Created infrastructure design",
        extra={"design_id": design.id, "design_name": design.name},
    )
    return design


@router.get("", response_model=List[DesignSummary])
def list_designs(
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    query = db.query(InfrastructureDesign)
    if current_user and current_user.get("user_id") is not None:
        uid = current_user["user_id"]
        query = query.filter(
            (InfrastructureDesign.owner_id == uid) | (InfrastructureDesign.owner_id.is_(None))
        )
    else:
        query = query.filter(InfrastructureDesign.owner_id.is_(None))

    designs = query.order_by(InfrastructureDesign.updated_at.desc(), InfrastructureDesign.id.desc()).all()

    return [
        DesignSummary(
            id=item.id,
            name=item.name,
            description=item.description or "",
            node_count=len(item.nodes or []),
            edge_count=len(item.edges or []),
            owner_id=item.owner_id,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in designs
    ]


@router.get("/{design_id}", response_model=DesignResponse)
def get_design(
    design_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    design = db.query(InfrastructureDesign).filter(InfrastructureDesign.id == design_id).first()
    if not design:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Infrastructure design {design_id} not found.",
        )
    _check_design_access(design, current_user)
    return design


@router.put("/{design_id}", response_model=DesignResponse)
def update_design(
    design_id: int,
    payload: DesignUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    design = db.query(InfrastructureDesign).filter(InfrastructureDesign.id == design_id).first()
    if not design:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Infrastructure design {design_id} not found.",
        )
    _check_design_access(design, current_user)

    if payload.name is not None:
        clean_name = payload.name.strip()
        if not clean_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Design name cannot be empty.",
            )
        design.name = clean_name

    if payload.description is not None:
        design.description = payload.description.strip()

    if payload.nodes is not None:
        design.nodes = payload.nodes

    if payload.edges is not None:
        design.edges = payload.edges

    db.commit()
    db.refresh(design)

    logger.info(
        "Updated infrastructure design",
        extra={"design_id": design.id, "design_name": design.name},
    )
    return design


@router.delete("/{design_id}")
def delete_design(
    design_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    design = db.query(InfrastructureDesign).filter(InfrastructureDesign.id == design_id).first()
    if not design:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Infrastructure design {design_id} not found.",
        )
    _check_design_access(design, current_user)

    db.delete(design)
    db.commit()

    logger.info("Deleted infrastructure design", extra={"design_id": design_id})
    return {"message": "Infrastructure design deleted successfully.", "id": design_id}
