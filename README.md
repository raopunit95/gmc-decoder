# GMC Policy Decoder

A zero-dependency web app that answers one question in three taps:

> **For my company, on my plan grade, what does my group health policy actually cover for _this_ condition?**

Employees rarely read a 40-page GMC policy document. They want to know the covered amount,
the copay, the room rent cap and the pre/post-hospitalisation window for the one procedure
they are about to have. This tool surfaces exactly that, from the same configuration that
drives coverage in production.

**Live:** https://raopunit95.github.io/gmc-decoder/

---

## What it does

| Input | Detail |
|---|---|
| **Corporate name** | Type-ahead over every mapped employer |
| **Plan grade** | Shown only when the employer actually has grades; single-plan employers skip it |
| **Condition / treatment** | Type-ahead over 208 conditions |

The result is a coverage card showing:

- **Covered amount** — the rupee sub-limit, or *Full sum insured* when there is no sub-limit
- **Room rent** — as a rupee/day cap, a % of sum insured per day, or *No limit*
- **Copay** — the employee's share of the approved claim
- **Pre & post hospitalisation** — the reimbursement window in days
- **Inclusions / Exclusions / Remarks** — the exact clauses configured for that rule
- **Intimation note** — any penalty copay for not informing the TPA in time

If a condition has no dedicated rule under the selected plan, the app says so plainly rather
than inventing a number.

---

## Repository layout

```
.
├── index.html                       # markup / three-step form
├── style.css                        # theme tokens, light + dark
├── script.js                        # combobox, state, result rendering
├── policy_data.json                 # ← generated; the only file the app fetches
├── tools/
│   └── build_data.py                # CSV → policy_data.json
└── data/
    ├── policy_source.csv            # raw Retool export
    └── mappings/
        ├── corporates.tsv           # entityId        → Corporate Name
        └── subdepartments.tsv       # subDepartmentId → Condition Name
```

The app is plain HTML/CSS/JS. No build step, no framework, no runtime dependencies.

---

## Running locally

`policy_data.json` is loaded with `fetch`, which browsers block on `file://`. Serve the
folder over HTTP:

```bash
git clone https://github.com/raopunit95/gmc-decoder.git
cd gmc-decoder
python3 -m http.server 8000
# open http://localhost:8000
```

---

## Refreshing the data

When a new coverage export lands:

1. Replace `data/policy_source.csv` with the new Retool export (same column headers).
2. Add any new `entityId` → company rows to `data/mappings/corporates.tsv`, and any new
   `subDepartmentId` → condition rows to `data/mappings/subdepartments.tsv`.
3. Rebuild and commit:

```bash
python3 tools/build_data.py
```

The script prints a summary and **warns loudly about unmapped IDs** — any `entityId` or
`subDepartmentId` missing from the mapping files is reported by name so nothing is silently
dropped:

```
Wrote policy_data.json (823 KB)
  generatedAt: 2026-09-05T10:19:07+00:00
  sourceRows: 2515
  coverageRules: 7072
  uniqueProfiles: 696
  corporateCount: 19
  treatmentCount: 208
```

Requires Python 3.9+ and nothing else.

---

## How the data is built

The source export is one row per coverage rule, with a `#`-delimited list of
`subDepartmentIds` and `#`-delimited clause text. `build_data.py`:

1. **Resolves IDs to names** using the two mapping files.
2. **Fans out** each row into one rule per condition.
3. **Merges duplicate entities.** Several `entityId`s can belong to the same employer
   (HSBC has 4, Reliance Retail has 7). Where duplicates describe the same rule with
   different clause wording, the most complete variant wins — numeric fields are identical
   across duplicates, so no figure is ever guessed.
4. **Interns each distinct rule once** into `profiles[]`, with corporates pointing at them
   by index. 7,072 rules collapse to 696 unique profiles, keeping the payload ~820 KB
   instead of several megabytes.
5. **Classifies room rent.** A `roomPrice` under 100 is a *percentage of sum insured per
   day*; anything above is a rupee amount. (The previous version rendered `1.5` as
   "₹1.5/day" — this build reads it correctly as "1.5% of SI / day".)

### Shape of `policy_data.json`

```jsonc
{
  "meta": { "generatedAt": "…", "coverageRules": 7072, "uniqueProfiles": 696 },
  "treatments": ["Abortion-DNC", "Abscess", …],
  "profiles": [
    {
      "coveredAmount": 150000,          // 0 = full sum insured
      "copayPercent": 0,
      "roomType": "Upto Room Rent Amount",
      "roomPrice": 1.5,
      "roomPriceIsPercent": true,       // → "1.5% of SI / day"
      "preOpDays": 30,
      "postOpDays": 60,
      "inclusions": ["…"],
      "exclusions": ["…"],
      "remarks": ["…"],
      "note": "No Intimation Copay applicable for this treatment"
    }
  ],
  "corporates": [
    {
      "name": "HSBC EDP INDIA PVT LTD",
      "id": "hsbc-edp-india-pvt-ltd",
      "entityIds": ["1006125", "1019773", "1039170", "11174501"],
      "hasGrades": true,
      "grades": [
        { "name": "2.5 Lac plan", "isDefault": false,
          "treatments": { "Cataract": 41, "Maternity": 87 } }   // → profiles[index]
      ]
    }
  ]
}
```

Adding a field to the card means adding it to `build_profile()` in `tools/build_data.py`
and to `renderCoverage()` in `script.js` — nothing else.

---

## Accessibility & browser support

- Both comboboxes are keyboard-driven (`↑` `↓` `Enter` `Esc`) with ARIA combobox roles.
- Light and dark themes follow `prefers-color-scheme`; animation respects
  `prefers-reduced-motion`.
- Mobile-first layout, tested down to 360 px.
- All user-facing strings are HTML-escaped at render time.

---

## Disclaimer

Coverage figures are indicative and read from the employer's uploaded policy configuration.
Final approval is always subject to policy terms, waiting periods and insurer authorisation.
This tool is not a substitute for the policy document or a pre-authorisation decision.

---

Built by [Punit Yadav](https://linkedin.com/in/punit-yadav-2ab6a013b).
