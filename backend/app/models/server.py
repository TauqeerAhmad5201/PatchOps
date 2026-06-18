"""Server registry and Incident models"""
from datetime import datetime, timezone
from sqlalchemy import String, Text, Boolean, DateTime, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base
import enum


class ServerStatus(str, enum.Enum):
    online = "online"
    offline = "offline"
    rebooting = "rebooting"
    unknown = "unknown"


class Server(Base):
    """Known Windows server registry — populated from ServiceNow / manual entry"""
    __tablename__ = "servers"

    id: Mapped[int] = mapped_column(primary_key=True)
    hostname: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    ip_address: Mapped[str] = mapped_column(String(50), nullable=True)
    environment: Mapped[str] = mapped_column(String(50), default="production")
    os_version: Mapped[str] = mapped_column(String(100), nullable=True)
    timezone: Mapped[str] = mapped_column(String(100), default="UTC")
    team: Mapped[str] = mapped_column(String(100), nullable=True)
    application: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(ServerStatus, name="server_status"), default=ServerStatus.unknown
    )
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    last_reboot_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_: Mapped[dict] = mapped_column("metadata", JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class IncidentStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"


class Incident(Base):
    """ServiceNow incidents created for failed servers + RCA agent output"""
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True)
    cr_id: Mapped[int] = mapped_column(ForeignKey("change_requests.id"), nullable=True)
    server_hostname: Mapped[str] = mapped_column(String(255), nullable=False)
    sn_incident_number: Mapped[str] = mapped_column(String(100), nullable=True)
    sn_sys_id: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        SAEnum(IncidentStatus, name="incident_status"), default=IncidentStatus.open
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    # RCA agent output
    rca_analysis: Mapped[str] = mapped_column(Text, nullable=True)
    rca_root_cause: Mapped[str] = mapped_column(Text, nullable=True)
    rca_steps: Mapped[str] = mapped_column(Text, nullable=True)
    rca_completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
