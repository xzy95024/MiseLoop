"""Nexla REST API 客户端（低层）。

真实端点（用户在 Nexla 平台已配置好的 Nexset）:
    GET https://api.nexla.io/v1/data_sets/{id}/records
    Authorization: Bearer <token>
    Accept: application/vnd.nexla.api.v1+json

鉴权（NEXLA_AUTH_MODE 控制）:
    auto (默认): 先按官方流程用服务密钥换会话令牌
        POST {base}/token  (Authorization: Basic <service-key>) -> {access_token}
        若换令牌被拒(4xx)，则认为传入的 key 本身就是 bearer 令牌，直接使用。
    bearer:  直接把 NEXLA_API_KEY 当作 Bearer 令牌用，不做 /token 交换。
    token_exchange: 强制走 /token 交换，失败即报错。

整条交互受硬超时（默认 60s）约束；超时抛 NexlaError，交由上层走本地兜底。
"""

from __future__ import annotations

import os
from pathlib import Path

import httpx

# 会话令牌进程内缓存: {api_key: access_token}
_TOKEN_CACHE: dict[str, str] = {}

_ACCEPT = "application/vnd.nexla.api.v1+json"


def load_dotenv(path: str | Path | None = None) -> None:
    """极简 .env 加载器（无第三方依赖）：把仓库根 .env 里未设置的键注入 os.environ。"""
    if path is None:
        path = Path(__file__).resolve().parents[2] / ".env"
    path = Path(path)
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip().strip('"').strip("'")
        os.environ.setdefault(key, val)


class NexlaNotConfigured(RuntimeError):
    """缺少必要配置（API key / 资源 ID）——上层应据此直接走本地兜底。"""


class NexlaError(RuntimeError):
    """Nexla 调用失败（超时、鉴权失败、HTTP 错误等）。"""


class NexlaClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float | None = None,
    ) -> None:
        load_dotenv()
        self.api_key = api_key or os.getenv("NEXLA_API_KEY")
        self.base_url = (base_url or os.getenv("NEXLA_API_BASE", "https://api.nexla.io")).rstrip("/")
        self.timeout = float(
            timeout_seconds
            if timeout_seconds is not None
            else os.getenv("NEXLA_TIMEOUT_SECONDS", "60")
        )
        self.auth_mode = os.getenv("NEXLA_AUTH_MODE", "auto").lower()
        self.token_path = os.getenv("NEXLA_TOKEN_PATH", "/token")
        self.records_path = os.getenv("NEXLA_RECORDS_PATH", "/v1/data_sets/{id}/records")
        if not self.api_key:
            raise NexlaNotConfigured("未设置 NEXLA_API_KEY")

    def _basic_headers(self) -> dict[str, str]:
        return {
            "Accept": _ACCEPT,
            "Content-Type": "application/json",
            "Authorization": f"Basic {self.api_key}",
        }

    def _bearer_headers(self, token: str) -> dict[str, str]:
        return {
            "Accept": _ACCEPT,
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

    def _get_session_token(self, client: httpx.Client) -> str:
        if self.api_key in _TOKEN_CACHE:
            return _TOKEN_CACHE[self.api_key]
        resp = client.post(f"{self.base_url}{self.token_path}", headers=self._basic_headers())
        resp.raise_for_status()
        token = resp.json().get("access_token")
        if not token:
            raise NexlaError("换取令牌失败: 响应中无 access_token")
        _TOKEN_CACHE[self.api_key] = token
        return token

    def _data_headers(self, client: httpx.Client) -> dict[str, str]:
        """得到调用数据端点用的鉴权头。"""
        if self.auth_mode == "bearer":
            return self._bearer_headers(self.api_key)
        try:
            token = self._get_session_token(client)
            return self._bearer_headers(token)
        except httpx.HTTPStatusError:
            # 服务密钥换令牌被拒；auto 模式下退而把 key 直接当 bearer 用。
            # token_exchange 模式则明确要求走交换，直接上抛。
            if self.auth_mode == "token_exchange":
                raise
            return self._bearer_headers(self.api_key)

    def fetch_records(self, resource_id: str) -> list[dict]:
        """从一个已配置的 Nexla Nexset(data_set)读取结构化记录。

        整个交互（换令牌 + 读数据）受 self.timeout 秒硬超时约束。
        超时抛 NexlaError（上层据此兜底）。
        """
        url = f"{self.base_url}{self.records_path.format(id=resource_id)}"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                headers = self._data_headers(client)
                resp = client.get(url, headers=headers)
                resp.raise_for_status()
                data = resp.json()
        except httpx.TimeoutException as e:
            raise NexlaError(f"Nexla 响应超过 {self.timeout}s 超时: {e}") from e
        except httpx.HTTPError as e:
            raise NexlaError(f"Nexla 请求失败: {e}") from e

        # 记录可能直接是列表，或包裹在 {"items"/"records"/"data"/"samples": [...]} 里。
        if isinstance(data, list):
            return data
        for key in ("records", "items", "data", "samples", "output"):
            if isinstance(data.get(key), list):
                return data[key]
        raise NexlaError(f"无法从 Nexla 响应解析记录列表: keys={list(data)[:5]}")
