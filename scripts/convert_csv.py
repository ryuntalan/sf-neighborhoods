
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
input_file = ROOT / "neighborhoods.csv"
output_file = ROOT / "data" / "neighborhoods.json"

neighborhoods = []

with open(input_file, newline="", encoding="utf-8-sig") as file:
    reader = csv.DictReader(file)

    for row in reader:
        def get(column):
            return (row.get(column) or "").strip()

        if not get("geoName"):
            continue

        sources = []

        for i in range(1, 4):
            label = get(f"source{i}.label")
            url = get(f"source{i}.url")

            if label and url:
                sources.append({
                    "label": label,
                    "url": url
                })

        neighborhood = {
            "geoName": get("geoName"),
            "image": {
                "src": get("image.src"),
                "alt": get("image.alt"),
                "credit": get("image.credit"),
                "license": get("image.license"),
                "sourceUrl": get("image.sourceUrl")
            },
            "sections": {
                "buildingsArchitecture": get("buildingsArchitecture"),
                "landmarks": get("landmarks"),
                "rescueConsiderations": get("rescueConsiderations")
            },
            "sources": sources
        }

        neighborhoods.append(neighborhood)

output_file.parent.mkdir(parents=True, exist_ok=True)

with open(output_file, "w", encoding="utf-8") as file:
    json.dump(
        {"neighborhoods": neighborhoods},
        file,
        ensure_ascii=False,
        indent=2
    )

print(f"Exported {len(neighborhoods)} neighborhoods!")
print(f"Saved to {output_file}")
