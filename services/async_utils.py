from __future__ import annotations

from functools import partial
from typing import Any, Callable, TypeVar

from starlette.concurrency import run_in_threadpool

T = TypeVar("T")


async def run_blocking(func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    # 同期I/O関数をスレッドプールへ逃がし、イベントループのブロックを防ぐ
    # Offload blocking sync call to threadpool to keep the event loop responsive.
    if kwargs:
        return await run_in_threadpool(partial(func, *args, **kwargs))
    return await run_in_threadpool(func, *args)
