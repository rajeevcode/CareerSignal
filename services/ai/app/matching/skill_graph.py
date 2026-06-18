import json
import re
from pathlib import Path
from typing import Any

_skill_graph: dict[str, list[str]] | None = None
_alias_to_canonical: dict[str, str] | None = None


def _load_skill_graph() -> dict[str, list[str]]:
    global _skill_graph, _alias_to_canonical
    if _skill_graph is None:
        path = Path(__file__).parent.parent / "data" / "skill_graph.json"
        with open(path) as f:
            _skill_graph = json.load(f)
        _alias_to_canonical = {}
        for canonical, aliases in _skill_graph.items():
            _alias_to_canonical[canonical.lower()] = canonical
            for alias in aliases:
                _alias_to_canonical[alias.lower()] = canonical
    return _skill_graph


def normalize_skill(skill: str) -> str:
    graph = _load_skill_graph()
    key = skill.strip().lower()
    if key in _alias_to_canonical:
        return _alias_to_canonical[key]
    for canonical in graph:
        if canonical.lower() == key:
            return canonical
    return skill.strip().title()


def normalize_skills(skills: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for s in skills:
        normalized = normalize_skill(s)
        key = normalized.lower()
        if key not in seen:
            seen.add(key)
            result.append(normalized)
    return result


def expand_skills(skills: list[str]) -> set[str]:
    graph = _load_skill_graph()
    expanded: set[str] = set()
    for skill in skills:
        normalized = normalize_skill(skill)
        expanded.add(normalized.lower())
        for canonical, aliases in graph.items():
            if normalized.lower() == canonical.lower():
                expanded.add(canonical.lower())
                for alias in aliases:
                    expanded.add(alias.lower())
            elif normalized.lower() in [a.lower() for a in aliases]:
                expanded.add(canonical.lower())
                for alias in aliases:
                    expanded.add(alias.lower())
    return expanded


def skill_match_score(candidate_skills: list[str], required: list[str], nice_to_have: list[str]) -> float:
    if not required and not nice_to_have:
        return 70.0

    cand = expand_skills(candidate_skills)
    req = expand_skills(required)
    nice = expand_skills(nice_to_have)

    if not req:
        return 70.0

    req_matches = sum(1 for s in req if s in cand)
    nice_matches = sum(1 for s in nice if s in cand)

    req_score = (req_matches / len(req)) * 100 if req else 100
    nice_bonus = (nice_matches / max(len(nice), 1)) * 15 if nice else 0

    return min(100.0, req_score * 0.85 + nice_bonus)


def extract_skills_from_text(text: str) -> list[str]:
    graph = _load_skill_graph()
    found: list[str] = []
    text_lower = text.lower()
    for canonical, aliases in graph.items():
        terms = [canonical.lower()] + [a.lower() for a in aliases]
        if any(re.search(rf"\b{re.escape(t)}\b", text_lower) for t in terms):
            found.append(canonical)
    return normalize_skills(found)
