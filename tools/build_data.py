#!/usr/bin/env python3
"""
Build the GMC Decoder front-end dataset.

Reads
  data/policy_source.csv            raw Retool export (one row per coverage rule)
  data/mappings/corporates.tsv      entityId            -> Corporate Name
  data/mappings/subdepartments.tsv  subDepartmentId     -> Condition / Treatment Name

Writes
  policy_data.json                  the single file the web app fetches

The output is normalised: every distinct coverage rule is stored once in
`profiles`, and each corporate/grade/treatment simply points at a profile
index. That keeps the payload small enough to serve from GitHub Pages.
"""

import csv
import json
import re
import sys
from collections import OrderedDict, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_CSV = ROOT / "data" / "policy_source.csv"
CORPORATE_MAP = ROOT / "data" / "mappings" / "corporates.tsv"
SUBDEPT_MAP = ROOT / "data" / "mappings" / "subdepartments.tsv"
OUTPUT = ROOT / "policy_data.json"

# Grade labels that mean "this corporate has a single, ungraded plan".
GENERIC_GRADES = {"default plan", "no plan", "all levels", ""}

# roomPrice below this is a percentage of sum insured, above it is a rupee amount.
PERCENT_THRESHOLD = 100

csv.field_size_limit(10_000_000)


def read_tsv(path, key_col, value_col):
    with path.open(newline="", encoding="utf-8") as fh:
        return {
            row[key_col].strip(): row[value_col].strip()
            for row in csv.DictReader(fh, delimiter="\t")
            if row.get(key_col, "").strip()
        }


def split_bullets(raw):
    """Source packs multiple statements into one cell separated by '#'."""
    if not raw:
        return []
    seen, out = set(), []
    for part in raw.split("#"):
        text = re.sub(r"\s+", " ", part).strip(" .;")
        if not text:
            continue
        fingerprint = text.lower()
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        out.append(text)
    return out


def to_number(raw, default=0):
    try:
        value = float(str(raw).strip() or default)
    except ValueError:
        return default
    return int(value) if value == int(value) else value


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def build_profile(row):
    room_price = to_number(row["roomPrice"])
    return OrderedDict(
        [
            ("coveredAmount", to_number(row["coveredAmount"])),
            ("copayPercent", to_number(row["copayPercent"])),
            ("roomType", row["roomType"].strip()),
            ("roomPrice", room_price),
            ("roomPriceIsPercent", 0 < room_price < PERCENT_THRESHOLD),
            ("preOpDays", to_number(row["preHospitalizationDays"])),
            ("postOpDays", to_number(row["postHospitalizationDays"])),
            ("inclusions", split_bullets(row["inclusions"])),
            ("exclusions", split_bullets(row["exclusions"])),
            ("remarks", split_bullets(row["remarks"])),
            ("note", re.sub(r"\s+", " ", row["note"]).strip()),
        ]
    )


def richness(profile):
    """Prefer the most informative variant when duplicate rules disagree."""
    return (
        len(profile["remarks"]),
        len(profile["inclusions"]),
        len(profile["exclusions"]),
        len(json.dumps(profile, sort_keys=True)),
    )


def main():
    for path in (SOURCE_CSV, CORPORATE_MAP, SUBDEPT_MAP):
        if not path.exists():
            sys.exit(f"Missing required input: {path.relative_to(ROOT)}")

    corporates = read_tsv(CORPORATE_MAP, "EntityId", "Corporate_Name")
    subdepts = read_tsv(SUBDEPT_MAP, "SubDepartment_Id", "UI_SubDepartment_Name")

    with SOURCE_CSV.open(newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))

    unknown_entities, unknown_subdepts, skipped = set(), set(), 0

    # (corporate, grade, treatment) -> best profile
    best = {}
    for row in rows:
        if row.get("isActive", "TRUE").strip().upper() not in ("TRUE", "1", "YES"):
            skipped += 1
            continue

        entity_id = row["entityId"].strip()
        corporate = corporates.get(entity_id)
        if corporate is None:
            unknown_entities.add(entity_id)
            continue

        grade = row["grade"].strip()
        profile = build_profile(row)

        for sub_id in row["subDepartmentIds"].split("#"):
            sub_id = sub_id.strip()
            if not sub_id:
                continue
            treatment = subdepts.get(sub_id)
            if treatment is None:
                unknown_subdepts.add(sub_id)
                continue
            key = (corporate, grade, treatment)
            current = best.get(key)
            if current is None or richness(profile) > richness(current):
                best[key] = profile

    # Intern each distinct profile once.
    profiles, profile_index = [], {}
    tree = defaultdict(lambda: defaultdict(dict))
    for (corporate, grade, treatment), profile in best.items():
        signature = json.dumps(profile, sort_keys=True, ensure_ascii=False)
        if signature not in profile_index:
            profile_index[signature] = len(profiles)
            profiles.append(profile)
        tree[corporate][grade][treatment] = profile_index[signature]

    corporate_records = []
    for corporate in sorted(tree, key=str.lower):
        grades = tree[corporate]
        real_grades = [g for g in grades if g.lower() not in GENERIC_GRADES]
        has_grades = len(grades) > 1 or bool(real_grades)

        grade_records = []
        for grade in sorted(grades, key=str.lower):
            treatments = grades[grade]
            grade_records.append(
                OrderedDict(
                    [
                        ("name", grade),
                        ("id", slugify(grade) or "default"),
                        ("isDefault", grade.lower() in GENERIC_GRADES),
                        ("treatmentCount", len(treatments)),
                        (
                            "treatments",
                            OrderedDict(
                                sorted(treatments.items(), key=lambda kv: kv[0].lower())
                            ),
                        ),
                    ]
                )
            )

        corporate_records.append(
            OrderedDict(
                [
                    ("name", corporate),
                    ("id", slugify(corporate)),
                    (
                        "entityIds",
                        sorted(
                            eid for eid, name in corporates.items() if name == corporate
                        ),
                    ),
                    ("hasGrades", has_grades),
                    ("grades", grade_records),
                ]
            )
        )

    all_treatments = sorted({t for _, _, t in best}, key=str.lower)

    payload = OrderedDict(
        [
            (
                "meta",
                OrderedDict(
                    [
                        ("generatedAt", datetime.now(timezone.utc).isoformat(timespec="seconds")),
                        ("sourceRows", len(rows)),
                        ("coverageRules", len(best)),
                        ("uniqueProfiles", len(profiles)),
                        ("corporateCount", len(corporate_records)),
                        ("treatmentCount", len(all_treatments)),
                    ]
                ),
            ),
            ("treatments", all_treatments),
            ("profiles", profiles),
            ("corporates", corporate_records),
        ]
    )

    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    print(f"Wrote {OUTPUT.relative_to(ROOT)} ({OUTPUT.stat().st_size / 1024:.0f} KB)")
    for label, value in payload["meta"].items():
        print(f"  {label}: {value}")
    if skipped:
        print(f"  skipped inactive rows: {skipped}")
    if unknown_entities:
        print(f"  ⚠ unmapped entityIds: {sorted(unknown_entities)}")
    if unknown_subdepts:
        print(f"  ⚠ unmapped subDepartmentIds: {sorted(unknown_subdepts)}")


if __name__ == "__main__":
    main()
