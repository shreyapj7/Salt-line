
from datetime import datetime, timezone
from pathlib import Path
import sqlite3

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, ConfigDict

router = APIRouter(prefix="/api/v1/community", tags=["Community Reports"])

DB_NAME = Path(__file__).resolve().parent.parent / "saltline.db"


class CommunityReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reporter_id: str = Field(min_length=1, max_length=100)
    location_id: str = Field(min_length=1, max_length=100)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    observation: str = Field(min_length=5, max_length=1000)
    reported_tds: float | None = Field(default=None, ge=0)
    source: str = "community_report"


def initialize_community_table():
    with sqlite3.connect(DB_NAME) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS community_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reporter_id TEXT NOT NULL,
                location_id TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                observation TEXT NOT NULL,
                reported_tds REAL,
                source TEXT NOT NULL,
                verification_status TEXT NOT NULL DEFAULT 'unverified',
                reported_at TEXT NOT NULL
            )
        """)


initialize_community_table()


@router.post("/reports")
def submit_community_report(data: CommunityReport):

    reported_at = datetime.now(timezone.utc).isoformat()

    with sqlite3.connect(DB_NAME) as conn:
        cursor = conn.execute("""
            INSERT INTO community_reports (
                reporter_id,
                location_id,
                latitude,
                longitude,
                observation,
                reported_tds,
                source,
                verification_status,
                reported_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'unverified', ?)
        """, (
            data.reporter_id,
            data.location_id,
            data.latitude,
            data.longitude,
            data.observation,
            data.reported_tds,
            data.source,
            reported_at
        ))

        report_id = cursor.lastrowid

    return {
        "success": True,
        "message": "Community report submitted",
        "report_id": report_id,
        "verification_status": "unverified",
        "reported_at": reported_at
    }


@router.get("/reports")
def get_community_reports():

    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row

        rows = conn.execute("""
            SELECT * FROM community_reports
            ORDER BY id DESC
        """).fetchall()

    return {
        "count": len(rows),
        "reports": [dict(row) for row in rows]
    }


@router.get("/reports/{report_id}")
def get_community_report(report_id: int):

    with sqlite3.connect(DB_NAME) as conn:
        conn.row_factory = sqlite3.Row

        row = conn.execute("""
            SELECT * FROM community_reports
            WHERE id = ?
        """, (report_id,)).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Community report not found"
        )

    return dict(row)
