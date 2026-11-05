import json
import sys
import time
from pathlib import Path
from pypdf import PdfReader

path = Path(sys.argv[1])
started = time.perf_counter()
reader = PdfReader(str(path), strict=False)
result = {
    "file": path.name,
    "size_bytes": path.stat().st_size,
    "encrypted": reader.is_encrypted,
    "pages": len(reader.pages),
    "metadata": {str(k): str(v) for k, v in (reader.metadata or {}).items()},
}
try:
    outline = reader.outline

    def count_entries(entries):
        total = 0
        for entry in entries:
            if isinstance(entry, list):
                total += count_entries(entry)
            else:
                total += 1
        return total

    result["outline_entries"] = count_entries(outline)
except Exception as exc:
    result["outline_error"] = f"{type(exc).__name__}: {exc}"
try:
    page = reader.pages[0]
    result["first_page_box"] = [float(v) for v in page.mediabox]
    result["first_page_text_chars"] = len(page.extract_text() or "")
except Exception as exc:
    result["page_error"] = f"{type(exc).__name__}: {exc}"
result["inspection_seconds"] = round(time.perf_counter() - started, 3)
print(json.dumps(result, ensure_ascii=False, indent=2))
