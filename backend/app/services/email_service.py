"""Email notification service"""
import logging
from typing import Optional
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to: str | list,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None,
) -> bool:
    if isinstance(to, list):
        to_str = ", ".join(to)
    else:
        to_str = to

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to_str

    if body_text:
        msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(body_html, "html"))

    if not settings.SMTP_USER:
        logger.info(f"Email (mock) to {to_str}: {subject}")
        return True

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info(f"Email sent to {to_str}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False


async def send_failure_alert(
    server_hostname: str,
    cr_number: str,
    error: str,
    rca_summary: Optional[str] = None,
) -> bool:
    subject = f"[PatchOps ALERT] Server {server_hostname} failed during {cr_number}"
    body_html = f"""
<html><body style="font-family: Arial, sans-serif; max-width: 600px;">
<div style="background: #1a1a2e; color: #e0e0e0; padding: 20px; border-radius: 8px;">
  <h2 style="color: #ef4444;">⚠️ Server Failure Alert</h2>
  <table style="width:100%; border-collapse: collapse;">
    <tr><td style="padding:8px; color:#888;">Server</td><td style="padding:8px; color:#fff;">{server_hostname}</td></tr>
    <tr><td style="padding:8px; color:#888;">Change Request</td><td style="padding:8px; color:#fff;">{cr_number}</td></tr>
    <tr><td style="padding:8px; color:#888;">Error</td><td style="padding:8px; color:#ef4444;">{error}</td></tr>
  </table>
  {f'<h3 style="color:#f59e0b;">RCA Summary</h3><p style="color:#e0e0e0;">{rca_summary}</p>' if rca_summary else ''}
  <p style="color:#888; font-size:12px;">An incident has been created in ServiceNow. The RCA agent is analyzing the failure.</p>
</div>
</body></html>
"""
    return await send_email(settings.EMAIL_TEAM_DL, subject, body_html)


async def send_deviation_alert(
    cr_number: str,
    server_hostname: str,
    deviation_percent: float,
) -> bool:
    subject = f"[PatchOps WARNING] Health deviation on {server_hostname} ({cr_number})"
    body_html = f"""
<html><body style="font-family: Arial, sans-serif; max-width: 600px;">
<div style="background: #1a1a2e; color: #e0e0e0; padding: 20px; border-radius: 8px;">
  <h2 style="color: #f59e0b;">⚠️ Health Deviation Alert</h2>
  <p>Server <strong>{server_hostname}</strong> has a post-reboot health deviation of 
  <strong style="color:#ef4444;">{deviation_percent:.1f}%</strong> 
  (threshold: {settings.DEVIATION_THRESHOLD_PERCENT}%)</p>
  <p>Change Request: <strong>{cr_number}</strong></p>
  <p>Please investigate the server health immediately.</p>
</div>
</body></html>
"""
    return await send_email(settings.EMAIL_TEAM_DL, subject, body_html)
