"""Celery application configuration"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "patchops",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "run_intake_agent": {"queue": "patchops"},
        "run_baseline_agent": {"queue": "patchops"},
        "run_execution_agent": {"queue": "patchops"},
        "run_validation_agent": {"queue": "patchops"},
        "run_rca_agent": {"queue": "patchops"},
        "monitor_change_window": {"queue": "patchops"},
    },
    beat_schedule={
        "poll-change-windows": {
            "task": "poll_change_windows",
            "schedule": 60.0,  # Every minute
        },
    },
)
