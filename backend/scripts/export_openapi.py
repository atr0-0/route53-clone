"""Writes the FastAPI app's OpenAPI schema to a file without needing a running server.

Fallback for `frontend`'s `generate:api` script, which by default fetches the schema from a
locally running backend instead. Usage: python scripts/export_openapi.py [output_path]
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402


def main() -> None:
    output_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("openapi.json")
    output_path.write_text(json.dumps(app.openapi(), indent=2))
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    main()
