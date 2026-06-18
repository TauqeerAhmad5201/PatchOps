"""ServiceNow REST API integration — incidents, attachments, comments"""
import logging
import httpx
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class ServiceNowClient:
    def __init__(self):
        self.base_url = settings.SERVICENOW_INSTANCE.rstrip("/")
        self.auth = (settings.SERVICENOW_USER, settings.SERVICENOW_PASSWORD)
        self.headers = {"Content-Type": "application/json", "Accept": "application/json"}

    async def create_incident(
        self,
        short_description: str,
        description: str,
        category: str = "Software",
        urgency: int = 2,
        assignment_group: str = "Infrastructure",
    ) -> Optional[dict]:
        if not self.base_url:
            logger.warning("ServiceNow not configured — skipping incident creation")
            return {"number": "INC-MOCK-001", "sys_id": "mock-sys-id"}

        payload = {
            "short_description": short_description,
            "description": description,
            "category": category,
            "urgency": str(urgency),
            "assignment_group": assignment_group,
        }

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.base_url}/api/now/table/incident",
                    json=payload,
                    auth=self.auth,
                    headers=self.headers,
                )
                resp.raise_for_status()
                data = resp.json().get("result", {})
                logger.info(f"Created incident: {data.get('number')}")
                return data
        except Exception as e:
            logger.error(f"Failed to create ServiceNow incident: {e}")
            return None

    async def add_comment(self, incident_sys_id: str, comment: str) -> bool:
        if not self.base_url or not incident_sys_id or "mock" in incident_sys_id:
            logger.info(f"ServiceNow comment (mock): {comment[:100]}...")
            return True

        payload = {"comments": comment}
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.patch(
                    f"{self.base_url}/api/now/table/incident/{incident_sys_id}",
                    json=payload,
                    auth=self.auth,
                    headers=self.headers,
                )
                resp.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Failed to add ServiceNow comment: {e}")
            return False

    async def get_attachments(self, cr_sys_id: str) -> list:
        """Retrieve file attachments from a CR"""
        if not self.base_url or not cr_sys_id:
            return []

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{self.base_url}/api/now/attachment",
                    params={"sysparm_query": f"table_sys_id={cr_sys_id}"},
                    auth=self.auth,
                    headers=self.headers,
                )
                resp.raise_for_status()
                return resp.json().get("result", [])
        except Exception as e:
            logger.error(f"Failed to get attachments: {e}")
            return []

    async def download_attachment(self, attachment_url: str) -> Optional[bytes]:
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.get(attachment_url, auth=self.auth)
                resp.raise_for_status()
                return resp.content
        except Exception as e:
            logger.error(f"Failed to download attachment: {e}")
            return None


sn_client = ServiceNowClient()
