"""Download and construct the exact gated SF3D model used by Chernobog."""

from __future__ import annotations

import gc
import json
import os
import sys
from pathlib import Path

import torch


MODEL_ID = "stabilityai/stable-fast-3d"
REPOSITORY_ROOT = Path(
    os.environ.get("CHERNOBOG_SF3D_REPOSITORY", Path.cwd())
).resolve()
if not (REPOSITORY_ROOT / "sf3d").is_dir():
    raise RuntimeError(f"SF3D package directory was not found under {REPOSITORY_ROOT}.")
sys.path.insert(0, str(REPOSITORY_ROOT))

from sf3d.system import SF3D  # noqa: E402 - repository path is established first


def main() -> None:
    if not torch.cuda.is_available():
        raise RuntimeError("PyTorch cannot see CUDA. CPU fallback is not accepted.")

    if not os.environ.get("HF_HOME"):
        raise RuntimeError("HF_HOME is missing; model files would not use the isolated cache.")

    model = SF3D.from_pretrained(
        MODEL_ID,
        config_name="config.yaml",
        weight_name="model.safetensors",
    )
    model.to("cuda")
    model.eval()
    torch.cuda.synchronize()

    print(
        json.dumps(
            {
                "ok": True,
                "model": MODEL_ID,
                "device": "cuda",
                "gpu": torch.cuda.get_device_name(0),
                "weightsLoaded": True,
            },
            indent=2,
        )
    )

    del model
    gc.collect()
    torch.cuda.empty_cache()


if __name__ == "__main__":
    main()
