"""Fail-fast CUDA and compiled texture-baker check for CF1H native Windows."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import torch
from texture_baker import TextureBaker


REPOSITORY_ROOT = Path(
    os.environ.get("CHERNOBOG_SF3D_REPOSITORY", Path.cwd())
).resolve()
if not (REPOSITORY_ROOT / "sf3d").is_dir():
    raise RuntimeError(f"SF3D package directory was not found under {REPOSITORY_ROOT}.")
sys.path.insert(0, str(REPOSITORY_ROOT))


def main() -> None:
    if not torch.cuda.is_available():
        raise RuntimeError("PyTorch cannot see CUDA. CPU fallback is not accepted.")

    if torch.version.cuda != "12.4":
        raise RuntimeError(
            f"Expected the pinned PyTorch CUDA 12.4 build, got {torch.version.cuda}."
        )

    properties = torch.cuda.get_device_properties(0)
    if properties.total_memory < 6 * 1024**3:
        raise RuntimeError("The detected CUDA device has less than 6 GiB VRAM.")

    uv = torch.tensor(
        [[0.1, 0.1], [0.9, 0.1], [0.5, 0.9]],
        dtype=torch.float32,
        device="cuda",
    )
    faces = torch.tensor([[0, 1, 2]], dtype=torch.int64, device="cuda")
    raster = TextureBaker().rasterize(
        uv=uv,
        face_indices=faces,
        bake_resolution=8,
    )

    if not raster.is_cuda:
        raise RuntimeError("The texture baker did not execute on CUDA.")

    from sf3d.system import SF3D  # noqa: F401 - verifies the backend import

    print(
        json.dumps(
            {
                "ok": True,
                "gpu": torch.cuda.get_device_name(0),
                "vramMb": int(properties.total_memory / 1024 / 1024),
                "torch": torch.__version__,
                "cuda": torch.version.cuda,
                "textureBakerCuda": True,
                "sf3dImport": True,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
