from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.geospatial_loader import (
    get_location_context,
    list_locations,
)
from intelligence.assessment_pipeline import assess_location

router = APIRouter(prefix="/api/v1", tags=["Geospatial & Intelligence"])


class AssessmentRequest(BaseModel):
    risk_indicators: dict[str, Optional[float]]
    confidence_indicators: dict[str, Optional[float]]
    monitoring_indicators: dict[str, Optional[float]]
    minimum_risk_coverage: float = Field(default=0.60, gt=0, le=1)
    minimum_confidence_coverage: float = Field(default=0.60, gt=0, le=1)
    minimum_monitoring_coverage: float = Field(default=0.70, gt=0, le=1)


@router.get("/geospatial/locations")
def locations():
    return {"count": len(list_locations()), "locations": list_locations()}


@router.get("/geospatial/locations/{location_id}/context")
def location_context(location_id: str):
    try:
        return get_location_context(location_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/assessments/{location_id}")
def create_assessment(location_id: str, request: AssessmentRequest):
    try:
        context = get_location_context(location_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    # Simulated environmental evidence cannot be treated as operational.
    simulated = context["simulation_present"]

    if simulated and request.risk_indicators.get("V") is not None:
        raise HTTPException(
            status_code=422,
            detail="V must be null when the matched NDMI evidence is simulated_demo.",
        )

    try:
        result = assess_location(
            location_id=location_id,
            risk_indicators=request.risk_indicators,
            confidence_indicators=request.confidence_indicators,
            monitoring_indicators=request.monitoring_indicators,
            minimum_risk_coverage=request.minimum_risk_coverage,
            minimum_confidence_coverage=request.minimum_confidence_coverage,
            minimum_monitoring_coverage=request.minimum_monitoring_coverage,
            is_simulated=simulated,
        )
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return {
        **result,
        "geospatial_context": context,
        "notice": "Scores are provisional prototype outputs, not validated groundwater diagnoses.",
    }
