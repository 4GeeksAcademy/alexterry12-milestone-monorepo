"""In-process store for the last analysis result (single-worker demo)."""

from __future__ import annotations

import threading
from typing import Any

_lock = threading.Lock()
_last_result: dict[str, Any] | None = None


def set_last_result(data: dict[str, Any]) -> None:
    global _last_result
    with _lock:
        _last_result = data


def get_last_result() -> dict[str, Any] | None:
    with _lock:
        return _last_result
