"""Local-only Stable Fast 3D service for Character Forge CF1H.

The service binds only to 127.0.0.1. GET /health reports the pinned runtime
contract; POST /generate accepts one identity-locked canonical image as the
raw request body and returns one textured GLB as the raw response body.
"""

from __future__ import annotations

import gc
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
from contextlib import nullcontext
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


HOST = "127.0.0.1"
PORT = int(os.environ.get("CHERNOBOG_SF3D_PORT", "8190"))
MODEL_ID = "stabilityai/stable-fast-3d"
MINIMUM_VRAM_MB = 6144
MAXIMUM_IMAGE_BYTES = 20 * 1024 * 1024
MAXIMUM_IMAGE_EDGE = 4096
CONDITION_WIDTH = 512
CONDITION_HEIGHT = 512
CONDITION_DISTANCE = 1.6
CONDITION_FOVY_DEGREES = 40
BACKGROUND_COLOR = [0.5, 0.5, 0.5]
REPOSITORY_ROOT = Path(
    os.environ.get("CHERNOBOG_SF3D_REPOSITORY", Path.cwd())
).resolve()
BACKGROUND_MODEL_ROOT = REPOSITORY_ROOT.parent / "cache" / "rembg"
BACKGROUND_MODEL_ROOT.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("U2NET_HOME", str(BACKGROUND_MODEL_ROOT))
sys.path.insert(0, str(REPOSITORY_ROOT))

GENERATION_LOCK = threading.Lock()
STATE: dict[str, Any] = {
    "backendVersion": None,
    "modelLoaded": False,
    "model": None,
    "device": "cpu",
    "gpu": None,
    "capabilities": {
        "imageTo3d": False,
        "glbExport": False,
        "textureBaking": False,
        "remeshModes": [],
    },
    "error": "Stable Fast 3D is still loading.",
}


def repository_version() -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=REPOSITORY_ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip() or None
    except (OSError, subprocess.SubprocessError):
        return None


def load_backend() -> None:
    try:
        if not (REPOSITORY_ROOT / "sf3d").is_dir():
            raise RuntimeError(
                f"SF3D package directory was not found under {REPOSITORY_ROOT}."
            )

        import rembg
        import torch
        import sf3d.utils as sf3d_utils
        from sf3d.system import SF3D

        STATE["backendVersion"] = repository_version()
        cuda_ready = torch.cuda.is_available()
        STATE["device"] = "cuda" if cuda_ready else "cpu"

        if cuda_ready:
            properties = torch.cuda.get_device_properties(0)
            STATE["gpu"] = {
                "name": torch.cuda.get_device_name(0),
                "vramTotalMb": int(properties.total_memory / 1024 / 1024),
            }

        if not cuda_ready:
            raise RuntimeError("CUDA is unavailable in the isolated SF3D environment.")

        model = SF3D.from_pretrained(
            MODEL_ID,
            config_name="config.yaml",
            weight_name="model.safetensors",
        )
        model.to("cuda")
        model.eval()

        print("Preparing the local background-removal model...", flush=True)
        background_session = rembg.new_session()
        condition_camera = sf3d_utils.default_cond_c2w(CONDITION_DISTANCE)
        condition_intrinsic, condition_intrinsic_normalized = (
            sf3d_utils.create_intrinsic_from_fov_deg(
                CONDITION_FOVY_DEGREES,
                CONDITION_HEIGHT,
                CONDITION_WIDTH,
            )
        )

        STATE["modelInstance"] = model
        STATE["backgroundSession"] = background_session
        STATE["conditionCamera"] = condition_camera
        STATE["conditionIntrinsic"] = condition_intrinsic
        STATE["conditionIntrinsicNormalized"] = condition_intrinsic_normalized
        STATE["modelLoaded"] = True
        STATE["model"] = MODEL_ID
        STATE["capabilities"] = {
            "imageTo3d": True,
            "glbExport": True,
            "textureBaking": True,
            "remeshModes": ["none", "triangle", "quad"],
        }
        STATE["error"] = None
        print("Chernobog SF3D model loaded on CUDA.", flush=True)
    except Exception as error:  # Keep /health alive so Chernobog can report faults.
        STATE["modelLoaded"] = False
        STATE["model"] = None
        STATE["error"] = f"{type(error).__name__}: {error}"
        print(f"Chernobog SF3D readiness failed: {STATE['error']}", flush=True)


def health_payload() -> dict[str, Any]:
    gpu = STATE["gpu"]
    memory_ready = bool(gpu and gpu["vramTotalMb"] >= MINIMUM_VRAM_MB)
    ready = bool(
        STATE["modelLoaded"]
        and STATE["device"] == "cuda"
        and memory_ready
        and STATE["capabilities"]["glbExport"]
        and STATE["capabilities"]["textureBaking"]
    )

    return {
        "service": "chernobog-sf3d",
        "apiVersion": 1,
        "ready": ready,
        "backend": "stable-fast-3d",
        "backendVersion": STATE["backendVersion"],
        "modelLoaded": STATE["modelLoaded"],
        "model": STATE["model"],
        "device": STATE["device"],
        "gpu": gpu,
        "capabilities": STATE["capabilities"],
        "error": STATE["error"],
    }


def create_model_batch(input_image: Any) -> dict[str, Any]:
    import numpy as np
    import torch

    image_condition = (
        torch.from_numpy(
            np.asarray(
                input_image.resize((CONDITION_WIDTH, CONDITION_HEIGHT))
            ).astype(np.float32)
            / 255.0
        )
        .float()
        .clip(0, 1)
    )
    mask_condition = image_condition[:, :, -1:]
    rgb_condition = torch.lerp(
        torch.tensor(BACKGROUND_COLOR)[None, None, :],
        image_condition[:, :, :3],
        mask_condition,
    )
    batch_element = {
        "rgb_cond": rgb_condition,
        "mask_cond": mask_condition,
        "c2w_cond": STATE["conditionCamera"].unsqueeze(0),
        "intrinsic_cond": STATE["conditionIntrinsic"].unsqueeze(0),
        "intrinsic_normed_cond": STATE[
            "conditionIntrinsicNormalized"
        ].unsqueeze(0),
    }
    return {key: value.unsqueeze(0) for key, value in batch_element.items()}


def material_count(mesh: Any) -> int:
    visual = getattr(mesh, "visual", None)
    material = getattr(visual, "material", None)
    if material is None:
        return 0

    materials = getattr(material, "materials", None)
    if materials is None:
        return 1

    try:
        return len(materials)
    except TypeError:
        return 1


def generate_glb(
    image_bytes: bytes,
    texture_resolution: int,
    remesh_mode: str,
    target_vertex_count: int,
    foreground_ratio: float,
) -> tuple[bytes, dict[str, Any]]:
    import numpy as np
    import rembg
    import torch
    import sf3d.utils as sf3d_utils
    from PIL import Image, ImageOps

    started_at = time.perf_counter()
    source_image = ImageOps.exif_transpose(Image.open(io.BytesIO(image_bytes)))
    source_image.load()

    if (
        source_image.width < 64
        or source_image.height < 64
        or source_image.width > MAXIMUM_IMAGE_EDGE
        or source_image.height > MAXIMUM_IMAGE_EDGE
    ):
        raise ValueError(
            f"Input image dimensions must be between 64 and {MAXIMUM_IMAGE_EDGE} pixels per edge."
        )

    rgba_image = source_image.convert("RGBA")
    alpha_channel = np.asarray(rgba_image.getchannel("A"))
    if int(alpha_channel.min()) != 0:
        rgba_image = rembg.remove(
            rgba_image,
            session=STATE["backgroundSession"],
        )

    processed_image = sf3d_utils.resize_foreground(
        rgba_image,
        foreground_ratio,
        out_size=(CONDITION_WIDTH, CONDITION_HEIGHT),
    )
    device = "cuda"
    model_batch = create_model_batch(processed_image)
    model_batch = {key: value.to(device) for key, value in model_batch.items()}

    try:
        torch.cuda.reset_peak_memory_stats()
        with torch.no_grad():
            with torch.autocast(
                device_type="cuda", dtype=torch.bfloat16
            ) if torch.cuda.is_available() else nullcontext():
                generated_meshes, _global_data = STATE[
                    "modelInstance"
                ].generate_mesh(
                    model_batch,
                    texture_resolution,
                    remesh_mode,
                    target_vertex_count,
                )

        mesh = generated_meshes[0]
        file_descriptor, temporary_name = tempfile.mkstemp(suffix=".glb")
        os.close(file_descriptor)
        temporary_path = Path(temporary_name)

        try:
            mesh.export(
                str(temporary_path),
                file_type="glb",
                include_normals=True,
            )
            glb_bytes = temporary_path.read_bytes()
        finally:
            temporary_path.unlink(missing_ok=True)

        metadata = {
            "vertices": int(len(mesh.vertices)),
            "triangles": int(len(mesh.faces)),
            "materials": material_count(mesh),
            "generationSeconds": round(time.perf_counter() - started_at, 3),
            "peakMemoryMb": round(
                torch.cuda.max_memory_allocated() / 1024 / 1024,
                1,
            ),
        }
        print(
            "Chernobog SF3D generation complete: "
            f"{metadata['vertices']} vertices, {metadata['triangles']} triangles, "
            f"{metadata['generationSeconds']} seconds, "
            f"{metadata['peakMemoryMb']} MB peak CUDA allocation.",
            flush=True,
        )
        return glb_bytes, metadata
    finally:
        del model_batch
        gc.collect()
        torch.cuda.empty_cache()


def parse_integer_header(
    handler: BaseHTTPRequestHandler,
    name: str,
    minimum: int,
    maximum: int,
) -> int:
    raw_value = handler.headers.get(name, "")
    if not raw_value.isdigit():
        raise ValueError(f"{name} must be an integer.")

    value = int(raw_value)
    if value < minimum or value > maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}.")

    return value


class ServiceHandler(BaseHTTPRequestHandler):
    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        if self.path != "/health":
            self.send_json(404, {"ok": False, "error": "Endpoint not found."})
            return

        self.send_json(200, health_payload())

    def do_POST(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        if self.path != "/generate":
            self.send_json(404, {"ok": False, "error": "Endpoint not found."})
            return

        if not health_payload()["ready"]:
            self.send_json(
                503,
                {
                    "ok": False,
                    "error": STATE["error"] or "Stable Fast 3D is not ready.",
                },
            )
            return

        if not GENERATION_LOCK.acquire(blocking=False):
            self.send_json(
                409,
                {
                    "ok": False,
                    "error": "Another Stable Fast 3D generation is already running.",
                },
            )
            return

        try:
            content_type = self.headers.get("Content-Type", "").split(";", 1)[
                0
            ].strip().lower()
            if content_type not in {"image/png", "image/jpeg", "image/webp"}:
                raise ValueError("Content-Type must be image/png, image/jpeg, or image/webp.")

            content_length = parse_integer_header(
                self,
                "Content-Length",
                1,
                MAXIMUM_IMAGE_BYTES,
            )
            image_bytes = self.rfile.read(content_length)
            if len(image_bytes) != content_length:
                raise ValueError("The canonical image request body was incomplete.")

            source_sha256 = self.headers.get(
                "X-Chernobog-Source-Sha256", ""
            ).strip().lower()
            if (
                len(source_sha256) != 64
                or any(character not in "0123456789abcdef" for character in source_sha256)
            ):
                raise ValueError("X-Chernobog-Source-Sha256 must be a SHA-256 hex digest.")

            actual_sha256 = hashlib.sha256(image_bytes).hexdigest()
            if actual_sha256 != source_sha256:
                raise ValueError("The canonical image body does not match its source SHA-256.")

            texture_resolution = parse_integer_header(
                self,
                "X-Chernobog-Texture-Resolution",
                1024,
                2048,
            )
            if texture_resolution not in {1024, 2048}:
                raise ValueError("Texture resolution must be 1024 or 2048.")

            remesh_mode = self.headers.get(
                "X-Chernobog-Remesh-Mode", ""
            ).strip().lower()
            if remesh_mode != "triangle":
                raise ValueError("CF1H-B requires triangle remeshing.")

            target_vertex_count = parse_integer_header(
                self,
                "X-Chernobog-Target-Vertex-Count",
                2500,
                20000,
            )
            foreground_ratio = float(
                self.headers.get("X-Chernobog-Foreground-Ratio", "")
            )
            if abs(foreground_ratio - 0.85) > 0.000001:
                raise ValueError("CF1H-B requires a foreground ratio of 0.85.")

            glb_bytes, metadata = generate_glb(
                image_bytes,
                texture_resolution,
                remesh_mode,
                target_vertex_count,
                foreground_ratio,
            )

            self.send_response(200)
            self.send_header("Content-Type", "model/gltf-binary")
            self.send_header("Content-Length", str(len(glb_bytes)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("X-Chernobog-Source-Sha256", source_sha256)
            self.send_header(
                "X-Chernobog-Backend-Version",
                STATE["backendVersion"] or "unknown",
            )
            self.send_header(
                "X-Chernobog-Texture-Resolution", str(texture_resolution)
            )
            self.send_header("X-Chernobog-Remesh-Mode", remesh_mode)
            self.send_header(
                "X-Chernobog-Target-Vertex-Count", str(target_vertex_count)
            )
            self.send_header(
                "X-Chernobog-Foreground-Ratio", str(foreground_ratio)
            )
            self.send_header("X-Chernobog-Vertices", str(metadata["vertices"]))
            self.send_header("X-Chernobog-Triangles", str(metadata["triangles"]))
            self.send_header("X-Chernobog-Materials", str(metadata["materials"]))
            self.send_header(
                "X-Chernobog-Generation-Seconds",
                str(metadata["generationSeconds"]),
            )
            self.end_headers()
            self.wfile.write(glb_bytes)
        except (BrokenPipeError, ConnectionResetError):
            print("Chernobog disconnected before generation response delivery.", flush=True)
        except Exception as error:
            message = f"{type(error).__name__}: {error}"
            print(f"Chernobog SF3D generation failed: {message}", flush=True)
            self.send_json(400 if isinstance(error, ValueError) else 500, {
                "ok": False,
                "error": message,
            })
        finally:
            GENERATION_LOCK.release()

    def log_message(self, format_string: str, *args: object) -> None:
        print(f"SF3D service: {format_string % args}", flush=True)


def main() -> None:
    threading.Thread(target=load_backend, daemon=True).start()
    server = ThreadingHTTPServer((HOST, PORT), ServiceHandler)
    server.daemon_threads = True
    print(f"Chernobog SF3D service: http://{HOST}:{PORT}/health", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
