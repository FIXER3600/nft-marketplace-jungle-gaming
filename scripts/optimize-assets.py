"""Re-encode original PNG assets as pixel-identical WebP (requires Pillow).

Run with: python scripts/optimize-assets.py
Originals are retained under references/original-assets for verification.
This development utility is not used at application runtime or by the build.
"""
from pathlib import Path
from hashlib import sha256
import json
from PIL import Image, __version__ as pillow_version

root = Path(__file__).resolve().parent.parent
originals = root / "references" / "original-assets"
output = root / "public" / "assets" / "images"
results = []
for original in sorted(originals.glob("*.png")):
    target = output / (original.stem + ".webp")
    with Image.open(original) as source:
        pixels = source.convert("RGBA")
        options = {"lossless": True, "quality": 100, "method": 6, "exact": True}
        if source.info.get("icc_profile"):
            options["icc_profile"] = source.info["icc_profile"]
        pixels.save(target, "WEBP", **options)
        with Image.open(target) as converted:
            assert converted.size == pixels.size
            assert converted.convert("RGBA").tobytes() == pixels.tobytes(), original.name
        results.append({
            "original": str(original.relative_to(root)).replace("\\", "/"),
            "output": str(target.relative_to(root)).replace("\\", "/"),
            "width": pixels.width,
            "height": pixels.height,
            "originalBytes": original.stat().st_size,
            "outputBytes": target.stat().st_size,
            "identicalRgbaPixels": True,
            "rgbaSha256": sha256(pixels.tobytes()).hexdigest(),
            "originalSha256": sha256(original.read_bytes()).hexdigest(),
            "outputSha256": sha256(target.read_bytes()).hexdigest(),
        })
report = {"pillow": pillow_version, "format": "WebP lossless", "assets": results}
report_path = root / "reports" / "assets" / "lossless-verification.json"
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(json.dumps(report, indent=2))
