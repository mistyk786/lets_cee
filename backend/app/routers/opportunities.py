"""Opportunity listing — exposes detected workflows for the frontend."""

from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException, HTTPException

from app.schemas import DetectedWorkflow
from app.services import analysis_service

router = APIRouter()


def _slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:64] or "workflow"


@router.get("/api/opportunities", response_model=list[DetectedWorkflow])
def list_opportunities() -> list[DetectedWorkflow]:
    """Return detected workflow(s) from live inbox when IMAP is configured."""
    try:
        workflow = analysis_service.analyse_workflow(prefer_live=True)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return [workflow]


@router.get("/api/opportunities/{opportunity_id}", response_model=DetectedWorkflow)
def get_opportunity(opportunity_id: str) -> DetectedWorkflow:
    try:
        workflow = analysis_service.analyse_workflow(prefer_live=True)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    if _slug(workflow.workflow_name) != opportunity_id:
        # Same demo workflow for now; allow flagship id alias.
        if opportunity_id != "internal-meeting-scheduling":
            raise HTTPException(status_code=404, detail="Opportunity not found")
    return workflow
