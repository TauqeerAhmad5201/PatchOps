"""ChangeRequest and ServerTask models — core domain entities"""
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    String, Text, DateTime, JSON, Float, Boolean,
    ForeignKey, Integer, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import enum


class CRStatus(str, enum.Enum):
    queued = "queued"
    awaiting_approval = "awaiting_approval"
    pending = "pending"               # approved, waiting for change window
    in_progress = "in_progress"
    completed = "completed"
    failed = "failed"
    ignored = "ignored"               # non-patching CR


class CRPriority(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    skipped = "skipped"


class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    cr_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(CRStatus, name="cr_status"), default=CRStatus.queued, nullable=False, index=True
    )
    priority: Mapped[str] = mapped_column(
        SAEnum(CRPriority, name="cr_priority"), default=CRPriority.medium, nullable=False
    )

    # ── ServiceNow metadata ─────────────────────────────────────────────────
    sn_sys_id: Mapped[str] = mapped_column(String(100), nullable=True)
    sn_url: Mapped[str] = mapped_column(String(512), nullable=True)

    # ── People ───────────────────────────────────────────────────────────────
    requested_by: Mapped[str] = mapped_column(String(255), nullable=True)
    approver_name: Mapped[str] = mapped_column(String(255), nullable=True)
    approver_email: Mapped[str] = mapped_column(String(255), nullable=True)
    approved_by: Mapped[str] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    # ── Change window ─────────────────────────────────────────────────────────
    change_window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    change_window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    change_window_timezone: Mapped[str] = mapped_column(String(50), default="UTC")

    # ── AI Classification ─────────────────────────────────────────────────────
    is_patching: Mapped[bool] = mapped_column(Boolean, nullable=True)
    classification_confidence: Mapped[float] = mapped_column(Float, nullable=True)
    classification_reasoning: Mapped[str] = mapped_column(Text, nullable=True)

    # ── Agent 1 output ────────────────────────────────────────────────────────
    ordered_server_list: Mapped[dict] = mapped_column(JSON, nullable=True)
    # {servers: [...], buckets: [...], reasoning: str, dependency_notes: str}
    agent1_summary: Mapped[str] = mapped_column(Text, nullable=True)
    agent1_accepted: Mapped[bool] = mapped_column(Boolean, nullable=True)
    agent1_accepted_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)
    agent1_accepted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Agent 2 output ────────────────────────────────────────────────────────
    execution_summary: Mapped[str] = mapped_column(Text, nullable=True)
    execution_accepted: Mapped[bool] = mapped_column(Boolean, nullable=True)

    # ── Agent 3 / Validation ──────────────────────────────────────────────────
    validation_report: Mapped[dict] = mapped_column(JSON, nullable=True)
    pre_state: Mapped[dict] = mapped_column(JSON, nullable=True)
    post_state: Mapped[dict] = mapped_column(JSON, nullable=True)

    # ── Progress tracking ─────────────────────────────────────────────────────
    progress_percent: Mapped[float] = mapped_column(Float, default=0.0)
    total_servers: Mapped[int] = mapped_column(Integer, default=0)
    completed_servers: Mapped[int] = mapped_column(Integer, default=0)
    failed_servers: Mapped[int] = mapped_column(Integer, default=0)

    # ── Timestamps ───────────────────────────────────────────────────────────
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ──────────────────────────────────────────────────────────
    server_tasks: Mapped[list["ServerTask"]] = relationship(
        "ServerTask", back_populates="cr", cascade="all, delete-orphan"
    )
    agent_runs: Mapped[list["AgentRun"]] = relationship(
        "AgentRun", back_populates="cr", cascade="all, delete-orphan"
    )


class ServerTask(Base):
    """Per-server execution task within a CR"""
    __tablename__ = "server_tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    cr_id: Mapped[int] = mapped_column(ForeignKey("change_requests.id"), nullable=False, index=True)
    server_hostname: Mapped[str] = mapped_column(String(255), nullable=False)
    server_ip: Mapped[str] = mapped_column(String(50), nullable=True)

    # ── Ordering ──────────────────────────────────────────────────────────────
    bucket_number: Mapped[int] = mapped_column(Integer, default=0)
    execution_order: Mapped[int] = mapped_column(Integer, default=0)

    # ── Status ────────────────────────────────────────────────────────────────
    status: Mapped[str] = mapped_column(
        SAEnum(TaskStatus, name="task_status"), default=TaskStatus.pending, nullable=False
    )
    reboot_scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Execution details ─────────────────────────────────────────────────────
    pre_state: Mapped[dict] = mapped_column(JSON, nullable=True)
    post_state: Mapped[dict] = mapped_column(JSON, nullable=True)
    health_ok: Mapped[bool] = mapped_column(Boolean, nullable=True)
    deviation_percent: Mapped[float] = mapped_column(Float, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    winrm_logs: Mapped[str] = mapped_column(Text, nullable=True)

    # ── Service pause ─────────────────────────────────────────────────────────
    requires_service_pause: Mapped[bool] = mapped_column(Boolean, default=False)
    service_name: Mapped[str] = mapped_column(String(255), nullable=True)
    service_paused_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    service_resumed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # ── Relationships ──────────────────────────────────────────────────────────
    cr: Mapped["ChangeRequest"] = relationship("ChangeRequest", back_populates="server_tasks")
