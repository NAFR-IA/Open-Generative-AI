"""Zero-cost Wan 2.1 text-to-video worker for NAFRI Open Generative AI.

It exposes the small subset of the WanGP MCP v1 contract used by the desktop
application. Model code and weights come from Apache-2.0 projects (Diffusers and
Wan 2.1). The model is loaded lazily so the health check starts immediately.
"""

from __future__ import annotations

import os
import re
import secrets
import threading
import time
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

MODEL_ID = os.getenv("OGA_MODEL_ID", "Wan-AI/Wan2.1-T2V-1.3B-Diffusers")
OUTPUT_DIR = Path(os.getenv("OGA_OUTPUT_DIR", "/content/oga-video-output"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SESSION_TOKEN = os.getenv("OGA_SESSION_TOKEN") or secrets.token_urlsafe(24)

app = FastAPI(title="NAFRI OGA Free Video Worker", version="1.0.0")
jobs: dict[str, dict[str, Any]] = {}
jobs_lock = threading.Lock()
generation_lock = threading.Lock()
pipeline = None


class RpcRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: int | str | None = None
    method: str
    params: dict[str, Any] = {}


def require_token(authorization: str | None) -> None:
    if authorization != f"Bearer {SESSION_TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid or missing session token")


def rpc_result(request_id: Any, result: Any) -> JSONResponse:
    return JSONResponse({"jsonrpc": "2.0", "id": request_id, "result": result})


def rpc_error(request_id: Any, message: str, code: int = -32603) -> JSONResponse:
    return JSONResponse({"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}})


def parse_resolution(value: str | None) -> tuple[int, int]:
    match = re.fullmatch(r"(\d+)x(\d+)", str(value or ""))
    if not match:
        return 832, 480
    width, height = map(int, match.groups())
    allowed = {(832, 480), (480, 832), (720, 720)}
    return (width, height) if (width, height) in allowed else (832, 480)


def normalized_frames(value: Any) -> int:
    try:
        frames = int(value)
    except (TypeError, ValueError):
        frames = 81
    frames = max(17, min(81, frames))
    return ((frames - 1) // 4) * 4 + 1


def load_pipeline():
    global pipeline
    if pipeline is not None:
        return pipeline
    import torch
    from diffusers import AutoencoderKLWan, WanPipeline
    from diffusers.schedulers.scheduling_unipc_multistep import UniPCMultistepScheduler

    if not torch.cuda.is_available():
        raise RuntimeError("No CUDA GPU is available. In Colab select Runtime > Change runtime type > T4 GPU.")
    vae = AutoencoderKLWan.from_pretrained(MODEL_ID, subfolder="vae", torch_dtype=torch.float32)
    pipe = WanPipeline.from_pretrained(MODEL_ID, vae=vae, torch_dtype=torch.bfloat16)
    pipe.scheduler = UniPCMultistepScheduler.from_config(pipe.scheduler.config, flow_shift=3.0)
    pipe.enable_model_cpu_offload()
    pipeline = pipe
    return pipeline


def event(phase: str, progress: float, status: str, step: int | None = None, total: int | None = None):
    data: dict[str, Any] = {"phase": phase, "progress": progress, "status": status}
    if step is not None:
        data["current_step"] = step
    if total is not None:
        data["total_steps"] = total
    return {"kind": "progress", "data": data}


def run_generation(job_id: str, settings: dict[str, Any]) -> None:
    def update(**values):
        with jobs_lock:
            jobs[job_id].update(values)

    try:
        with generation_lock:
            update(events=[event("loading_model", 2, "Loading Wan 2.1 weights")])
            pipe = load_pipeline()
            if jobs[job_id].get("cancelled"):
                raise RuntimeError("Generation cancelled")

            width, height = parse_resolution(settings.get("resolution"))
            frames = normalized_frames(settings.get("video_length"))
            steps = max(8, min(40, int(settings.get("num_inference_steps") or 30)))
            seed = int(settings.get("seed") or secrets.randbelow(2_147_483_647))

            import torch
            from diffusers.utils import export_to_video

            def callback(_pipe, step: int, _timestep, callback_kwargs):
                if jobs[job_id].get("cancelled"):
                    raise RuntimeError("Generation cancelled")
                pct = 8 + ((step + 1) / steps) * 82
                update(events=[event("inference", pct, f"Denoising {step + 1}/{steps}", step + 1, steps)])
                return callback_kwargs

            generator = torch.Generator(device="cpu").manual_seed(seed)
            output = pipe(
                prompt=str(settings.get("prompt") or ""),
                negative_prompt=str(settings.get("negative_prompt") or "low quality, blurry, distorted"),
                width=width,
                height=height,
                num_frames=frames,
                num_inference_steps=steps,
                guidance_scale=5.0,
                generator=generator,
                callback_on_step_end=callback,
            ).frames[0]
            update(events=[event("decoding", 94, "Encoding MP4")])
            filename = f"{job_id}.mp4"
            file_path = OUTPUT_DIR / filename
            export_to_video(output, str(file_path), fps=16)
            media_id = f"video-{job_id}"
            update(
                done=True,
                status="done",
                events=[event("downloading_output", 100, "Ready")],
                result={
                    "success": True,
                    "cancelled": False,
                    "errors": [],
                    "gallery_items": [{"media_id": media_id, "media_type": "video", "filename": filename}],
                },
                media={media_id: str(file_path)},
            )
    except Exception as exc:
        cancelled = bool(jobs[job_id].get("cancelled"))
        update(
            done=True,
            status="interrupted" if cancelled else "error",
            result={"success": False, "cancelled": cancelled, "errors": [{"message": str(exc)}], "gallery_items": []},
        )


TOOLS = [
    "wangp_generate",
    "wangp_get_job",
    "wangp_cancel_job",
    "wangp_get_model_availability",
    "wangp_create_gallery_download",
]


def call_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    if name == "wangp_get_model_availability":
        model_type = arguments.get("model_type")
        if model_type != "t2v_1.3B":
            return {"status": "unknown-model", "available": False}
        return {"status": "available", "available": True, "model_type": model_type}

    if name == "wangp_generate":
        settings = dict(arguments.get("source") or {})
        if settings.get("model_type") != "t2v_1.3B":
            raise ValueError("This free worker supports only t2v_1.3B")
        if not str(settings.get("prompt") or "").strip():
            raise ValueError("Prompt is required")
        job_id = uuid.uuid4().hex
        jobs[job_id] = {"job_id": job_id, "done": False, "status": "queued", "events": [], "result": None, "cancelled": False, "media": {}}
        threading.Thread(target=run_generation, args=(job_id, settings), daemon=True).start()
        return {"job_id": job_id, "done": False, "status": "queued", "events": []}

    if name == "wangp_get_job":
        job_id = str(arguments.get("job_id") or "")
        if job_id not in jobs:
            raise ValueError("Unknown job id")
        with jobs_lock:
            job = dict(jobs[job_id])
        job.pop("media", None)
        job.pop("cancelled", None)
        return job

    if name == "wangp_cancel_job":
        job_id = str(arguments.get("job_id") or "")
        if job_id in jobs:
            jobs[job_id]["cancelled"] = True
        return {"ok": True, "job_id": job_id}

    if name == "wangp_create_gallery_download":
        media_id = str(arguments.get("media_id") or "")
        for job in jobs.values():
            file_path = job.get("media", {}).get(media_id)
            if file_path:
                return {"download_url": f"/media/{media_id}", "filename": Path(file_path).name}
        raise ValueError("Unknown media id")

    raise ValueError(f"Unknown tool: {name}")


@app.get("/health")
def health(authorization: str | None = Header(default=None)):
    require_token(authorization)
    return {"ok": True, "model": MODEL_ID, "cuda_required": True}


@app.get("/media/{media_id}")
def media(media_id: str, authorization: str | None = Header(default=None)):
    require_token(authorization)
    for job in jobs.values():
        file_path = job.get("media", {}).get(media_id)
        if file_path and Path(file_path).is_file():
            return FileResponse(file_path, media_type="video/mp4", filename=Path(file_path).name)
    raise HTTPException(status_code=404, detail="Media not found")


@app.post("/mcp")
async def mcp(request: RpcRequest, authorization: str | None = Header(default=None)):
    require_token(authorization)
    if request.method == "notifications/initialized":
        return JSONResponse({}, status_code=202)
    if request.method == "initialize":
        return rpc_result(request.id, {
            "protocolVersion": "2025-06-18",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "NAFRI OGA Free Wan Worker", "version": "1.0.0"},
        })
    if request.method == "tools/list":
        return rpc_result(request.id, {"tools": [{"name": name, "description": name, "inputSchema": {"type": "object"}} for name in TOOLS]})
    if request.method == "tools/call":
        try:
            result = call_tool(str(request.params.get("name") or ""), dict(request.params.get("arguments") or {}))
            return rpc_result(request.id, {"isError": False, "structuredContent": result, "content": []})
        except Exception as exc:
            return rpc_result(request.id, {"isError": True, "structuredContent": str(exc), "content": [{"type": "text", "text": str(exc)}]})
    return rpc_error(request.id, f"Unknown method: {request.method}", -32601)


@app.get("/")
def root():
    return {"name": "NAFRI OGA Free Video Worker", "status": "running", "mcp": "/mcp"}


if __name__ == "__main__":
    import uvicorn
    print(f"OGA_SESSION_TOKEN={SESSION_TOKEN}", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "7866")))

