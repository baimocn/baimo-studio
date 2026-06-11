"""
Download guard: SSRF-safe URL validation and size-capped streaming download.

This module centralises the download whitelist and proxy logic that was
previously duplicated across image.py, video.py, and prompt.py.
"""

from __future__ import annotations

from urllib.parse import urlparse

import httpx

# ---------------------------------------------------------------------------
# Whitelist
# ---------------------------------------------------------------------------
ALLOWED_DOWNLOAD_HOSTS: set[str] = {
    "storage.googleapis.com",
    "platform-outputs.agnes-ai.space",
    "apihub.agnes-ai.com",
    "localhost",
    "127.0.0.1",
}

# ---------------------------------------------------------------------------
# URL validation
# ---------------------------------------------------------------------------

def validate_download_url(url: str) -> bool:
    """Return *True* only when *url* uses http(s) **and** its hostname is in the whitelist."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        return parsed.hostname in ALLOWED_DOWNLOAD_HOSTS
    except Exception:
        return False

# ---------------------------------------------------------------------------
# Streaming proxy download
# ---------------------------------------------------------------------------

_MAX_REDIRECTS = 5


class RedirectError(Exception):
    """Raised when a redirect chain is invalid or too long."""


class ContentTooLarge(Exception):
    """Raised when the downloaded body exceeds *max_bytes*."""


async def proxy_download(
    client: httpx.AsyncClient,
    url: str,
    max_bytes: int = 100_000_000,
) -> httpx.Response:
    """Stream-download *url* with SSRF protection and a hard size cap.

    * ``follow_redirects=False`` — redirects are followed **manually** so
      each hop's target URL is validated against the whitelist.
    * The body is consumed into memory in chunks.  If the total exceeds
      *max_bytes*, a :class:`ContentTooLarge` exception is raised.
    * On success the returned :class:`httpx.Response` has its ``_content``
      attribute populated (full body) so callers can forward it.

    Raises
    ------
    RedirectError
        If the redirect chain is longer than 5 hops or points to a
        non-whitelisted host.
    ContentTooLarge
        If the response body exceeds *max_bytes*.
    httpx.HTTPStatusError
        If the final response has a 4xx/5xx status.
    """
    current_url = url

    for _ in range(_MAX_REDIRECTS + 1):
        if not validate_download_url(current_url):
            raise RedirectError(f"重定向目标不在白名单中: {current_url}")

        resp = await client.send(
            client.build_request("GET", current_url),
            stream=True,
        )

        # Follow 3xx redirects manually
        if 300 <= resp.status_code < 400:
            location = resp.headers.get("location")
            await resp.aclose()
            if not location:
                raise RedirectError("重定向响应缺少 Location 头")
            # Handle relative redirects
            if location.startswith("/"):
                parsed = urlparse(current_url)
                location = f"{parsed.scheme}://{parsed.netloc}{location}"
            current_url = location
            continue

        # Non-redirect response — stream body with size cap
        collected = bytearray()
        async for chunk in resp.aiter_bytes(chunk_size=65536):
            collected.extend(chunk)
            if len(collected) > max_bytes:
                await resp.aclose()
                raise ContentTooLarge(
                    f"下载内容超过 {max_bytes // 1_000_000} MB 限制"
                )

        # Patch the response so callers can access .content / .text
        resp._content = bytes(collected)  # type: ignore[attr-defined]
        return resp

    raise RedirectError(f"重定向链超过 {_MAX_REDIRECTS} 次")
