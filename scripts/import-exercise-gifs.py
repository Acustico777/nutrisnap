#!/usr/bin/env python3
"""
Genera supabase/exercise-gifs-update.sql facendo il match tra gli esercizi
in supabase/schema-v3.sql e il dataset pubblico yuhonas/free-exercise-db
(public domain). Le immagini vengono servite via jsDelivr CDN: ogni esercizio
ha 2 frame (0.jpg, 1.jpg) che il client alterna ogni 700ms per simulare una GIF.

Uso:
    python3 scripts/import-exercise-gifs.py

Poi copia/incolla il contenuto di supabase/exercise-gifs-update.sql nel
SQL Editor di Supabase.
"""
import json, re, sys, urllib.request, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "supabase" / "schema-v3.sql"
OUT = ROOT / "supabase" / "exercise-gifs-update.sql"
DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
CDN_BASE = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises"

# 1. Parse schema
text = SCHEMA.read_text()
pattern = re.compile(
    r"\('([a-z_]+)',\s*'([^']+)',\s*'([a-z_]+)',\s*ARRAY\[([^\]]*)\][^,]*,\s*'([a-z_]+)'",
    re.M,
)
mine = [
    {"id": m[0], "name_it": m[1], "muscle_group": m[2], "equipment": m[4]}
    for m in (m.groups() for m in pattern.finditer(text))
]
print(f"[parse] {len(mine)} esercizi nel DB")

# 2. Fetch reference dataset
print(f"[fetch] {DB_URL}")
db = json.loads(urllib.request.urlopen(DB_URL, timeout=15).read())
print(f"[fetch] {len(db)} esercizi nel reference DB")

# 3. Scoring
TOKEN_EXPAND = {"db": ["dumbbell"], "rdl": ["romanian", "deadlift"], "oh": ["overhead"]}
IT2EN = {
    "panca": "bench", "manubri": "dumbbell", "manubrio": "dumbbell", "bilanciere": "barbell",
    "trazioni": "pull up", "rematore": "row", "stacco": "deadlift", "lento": "shoulder press",
    "alzate": "raise", "curl": "curl", "addominali": "crunch", "squat": "squat",
    "affondi": "lunge", "glutei": "glute", "polpacci": "calf",
}
MUSCLE_MAP = {
    "chest": ["chest"], "back": ["middle back", "lats", "lower back"], "shoulders": ["shoulders"],
    "biceps": ["biceps"], "triceps": ["triceps"], "forearms": ["forearms"], "abs": ["abdominals"],
    "quadriceps": ["quadriceps"], "hamstrings": ["hamstrings"], "glutes": ["glutes"],
    "calves": ["calves"], "traps": ["traps"], "full_body": [],
}
EQUIP_OK = {"gym": {"barbell", "dumbbell", "machine", "cable"}, "bodyweight": {"body only"}}

# Manual overrides per match deboli (auto-fixes per il dataset attuale)
OVERRIDES = {
    "cable_fly": "Cable_Crossover",
    "deadlift": "Barbell_Deadlift",
    "db_curl": "Dumbbell_Bicep_Curl",
    "concentration_curl": "Concentration_Curls",
    "hammer_curl": "Hammer_Curls",
    "tricep_pushdown": "Triceps_Pushdown",
    "overhead_tricep_extension": "Triceps_Overhead_Extension_with_Rope",
    "skull_crushers": "Lying_Triceps_Press",
    "farmer_carry": "Farmers_Walk",
    "crunch": "Crunches", "bicycle_crunch": "Air_Bike",
    "mountain_climber": "Mountain_Climbers", "ab_wheel": "Ab_Roller",
    "back_squat": "Barbell_Squat",
    "bulgarian_split_squat": "Split_Squats", "bulgarian_split_squat_glutes": "Split_Squats",
    "single_leg_rdl": "Romanian_Deadlift_from_Deficit",
    "lunge_glutes": "Bodyweight_Walking_Lunge", "jump_rope": "Rope_Jumping",
    "bodyweight_chin_up_biceps": "Chin-Up", "kettlebell_swing": "One-Arm_Kettlebell_Swings",
}
SKIP = {"burpee"}

def toks(s): return [t for t in re.sub(r"[^a-z0-9 ]", " ", s.lower()).split() if t]

def expand_id(eid):
    out = []
    for t in eid.split("_"):
        out.extend(TOKEN_EXPAND.get(t, [t]))
    return out

def name_it_toks(n):
    out = []
    for t in toks(n):
        v = IT2EN.get(t, t)
        if v: out.extend(v.split())
    return out

def score(my, c):
    cn = set(toks(c["name"]))
    s = 3 * len(set(expand_id(my["id"])) & cn) + len(set(name_it_toks(my["name_it"])) & cn)
    target = set(MUSCLE_MAP.get(my["muscle_group"], []))
    cp = {m.lower() for m in c.get("primaryMuscles", [])}
    if target: s += 4 if target & cp else -2
    eq = (c.get("equipment") or "").lower()
    if eq in EQUIP_OK.get(my["equipment"], set()): s += 1
    if my["equipment"] == "bodyweight" and eq not in ("body only", "", None): s -= 3
    return s

# 4. Pick best match per exercise
matches = []
for m in mine:
    if m["id"] in SKIP:
        matches.append((m, None)); continue
    if m["id"] in OVERRIDES:
        matches.append((m, OVERRIDES[m["id"]])); continue
    best = max(db, key=lambda c: score(m, c))
    matches.append((m, best["id"]))

# 5. Emit SQL
lines = [
    "-- Auto-generated: scripts/import-exercise-gifs.py",
    "-- Source: yuhonas/free-exercise-db (public domain, served via jsDelivr CDN)",
    "-- Each exercise has 2 frames (0.jpg, 1.jpg) alternated client-side.",
    "",
]
skipped = [m["id"] for m, mid in matches if mid is None]
if skipped:
    lines.append(f"-- NOTE: nessuna corrispondenza per: {', '.join(skipped)}")
    lines.append("")
lines.extend(["BEGIN;", ""])
for m, mid in matches:
    if mid is None: continue
    url = f"{CDN_BASE}/{mid}/0.jpg"
    lines.append(f"UPDATE public.exercises SET gif_url = '{url}' WHERE id = '{m['id']}';")
lines.extend(["", "COMMIT;"])

OUT.write_text("\n".join(lines))
print(f"[write] {OUT}")
print(f"[done]  applicati: {len(matches) - len(skipped)} | skipped: {len(skipped)}")
