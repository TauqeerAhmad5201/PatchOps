"""AgentRun and AgentLog — tracks every agent execution with BigSerial log IDs for SSE"""
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, JSON, Integer, ForeignKey, Enum as SAEnum, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base
import enum


class AgentType(str, enum.Enum):
    intake = "intake"
    baseline = "baseline"
    execution = "execution"
    validation = "validation"
    rca = "rca"


class AgentRunStatus(str, enum.Enum):
    running = "running"
    completed = "completed"
    failed = "failed"
    waiting_approval = "waiting_approval"


class LogLevel(str, enum.Enum):
    info = "INFO"
    warning = "WARNING"
    error = "ERROR"
    success = "SUCCESS"
    debug = "DEBUG"


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    cr_id: Mapped[int] = mapped_column(ForeignKey("change_requests.id"), nullable=False, index=True)
    agent_type: Mapped[str] = mapped_column(
        SAEnum(AgentType, name="agent_type"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        SAEnum(AgentRunStatus, name="agent_run_status"),
        default=AgentRunStatus.running, nullable=False
    )
    celery_task_id: Mapped[str] = mapped_column(String(255), nullable=True)
    result: Mapped[dict] = mapped_column(JSON, nullable=True)
    error: Mapped[str] = mapped_column(Text, nullable=True)

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    cr: Mapped["ChangeRequest"] = relationship("ChangeRequest", back_populates="agent_runs")
    logs: Mapped[list["AgentLog"]] = relationship(
        "AgentLog", back_populates="run", cascade="all, delete-orphan"
    )


class AgentLog(Base):
    """
    BigSerial ID enables efficient long-polling SSE cursor:
    SELECT * FROM agent_logs WHERE cr_id=X AND id > last_cursor ORDER BY id
    """
    __tablename__ = "agent_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    cr_id: Mapped[int] = mapped_column(Integer, ForeignKey("change_requests.id"), nullable=False, index=True)
    run_id: Mapped[int] = mapped_column(Integer, ForeignKey("agent_runs.id"), nullable=True, index=True)
    agent_type: Mapped[str] = mapped_column(String(50), nullable=False)
    level: Mapped[str] = mapped_column(String(20), default="INFO")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    server_hostname: Mapped[str] = mapped_column(String(255), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True)
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )

    run: Mapped["AgentRun"] = relationship("AgentRun", back_populates="logs")
