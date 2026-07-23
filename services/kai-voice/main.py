"""
Kai Voice — TTS mínimo para Kai Board (edge-tts / Catalina).
No es civika-lira (asistente); solo síntesis de voz → audio para el monitor.
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import os
import subprocess
from collections import OrderedDict
from typing import Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

DEFAULT_VOICE = os.getenv("KAI_VOICE_DEFAULT", "es-CL-CatalinaNeural")
MAX_CHARS = int(os.getenv("KAI_VOICE_MAX_CHARS", "500"))
PORT = int(os.getenv("PORT", os.getenv("KAI_VOICE_PORT", "5041")))

_TTS_CACHE: OrderedDict[str, Tuple[bytes, str]] = OrderedDict()
_TTS_CACHE_MAX = 48


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    voice: str | None = None


def _truncate(text: str) -> str:
    t = text.strip()
    if len(t) <= MAX_CHARS:
        return t
    return t[: MAX_CHARS - 3] + "…"


def _transcode_for_browser(raw: bytes) -> Tuple[bytes, str]:
    """edge-tts entrega MPEG-ADTS; re-encode a MP3/WAV (TVs fallan con MP4 fragmentado)."""
    try:
        import imageio_ffmpeg
    except ImportError:
        return raw, "audio/mpeg"

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    # Preferir MP3 y WAV: smart TVs / WebViews suelen no reproducir fMP4/AAC.
    attempts: list[tuple[list[str], str]] = [
        (
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "mp3",
                "-i",
                "pipe:0",
                "-c:a",
                "libmp3lame",
                "-b:a",
                "64k",
                "-f",
                "mp3",
                "pipe:1",
            ],
            "audio/mpeg",
        ),
        (
            [
                ffmpeg,
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "mp3",
                "-i",
                "pipe:0",
                "-f",
                "wav",
                "pipe:1",
            ],
            "audio/wav",
        ),
    ]
    for args, mime in attempts:
        proc = subprocess.run(
            args,
            input=raw,
            capture_output=True,
            timeout=120,
            check=False,
        )
        if proc.returncode == 0 and len(proc.stdout) > 64:
            return proc.stdout, mime
    return raw, "audio/mpeg"


def _cache_key(text: str, voice: str) -> str:
    content = _truncate(text)
    return hashlib.sha256(f"{voice}:{content}".encode("utf-8")).hexdigest()


async def synthesize(text: str, voice: str) -> Tuple[bytes, str]:
    import edge_tts

    key = _cache_key(text, voice)
    hit = _TTS_CACHE.get(key)
    if hit is not None:
        _TTS_CACHE.move_to_end(key)
        return hit

    content = _truncate(text)
    communicate = edge_tts.Communicate(content, voice)
    buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buffer.write(chunk["data"])
    data = buffer.getvalue()
    if not data:
        raise RuntimeError("TTS no generó audio (¿edge-tts instalado?)")
    result = await asyncio.to_thread(_transcode_for_browser, data)
    _TTS_CACHE[key] = result
    _TTS_CACHE.move_to_end(key)
    while len(_TTS_CACHE) > _TTS_CACHE_MAX:
        _TTS_CACHE.popitem(last=False)
    return result


app = FastAPI(title="kai-voice", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "kai-voice",
        "defaultVoice": DEFAULT_VOICE,
    }


@app.post("/voice/speak")
async def speak(body: SpeakRequest):
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Texto vacío")
    voice = (body.voice or DEFAULT_VOICE).strip() or DEFAULT_VOICE
    try:
        audio_bytes, media_type = await synthesize(text, voice)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"TTS error: {exc}") from exc
    ext = (
        "mp3"
        if media_type == "audio/mpeg"
        else "wav"
        if media_type == "audio/wav"
        else "bin"
    )
    return Response(
        content=audio_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename=kai-voice.{ext}"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
