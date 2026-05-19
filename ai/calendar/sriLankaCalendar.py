"""Sri Lankan calendar features for demand forecasting training.

Mirrors ai/calendar/sriLankaCalendar.js — feature names, order, and values
must match exactly so a model trained here can be served by the JS inference
runtime.
"""
import json
from datetime import date, datetime
from pathlib import Path
from typing import Optional, Union

_EVENTS_PATH = Path(__file__).parent / "events.json"
with _EVENTS_PATH.open(encoding="utf-8") as _f:
    EVENTS = json.load(_f)

FEATURE_NAMES = (
    "dayOfWeek",
    "dayOfMonth",
    "month",
    "isPublicHoliday",
    "isPoyaDay",
    "isFestivalDay",
    "daysToNextFestival",
    "daysSinceLastFestival",
    "inSinhalaTamilNewYearWindow",
    "inEidAlFitrWindow",
    "inDeepavaliWindow",
    "inChristmasWindow",
    "inSalaryWindow",
    "inMonsoonYala",
    "inMonsoonMaha",
)


def _to_date(d: Union[str, date, datetime]) -> date:
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    return datetime.strptime(d, "%Y-%m-%d").date()


def _parse_iso(s: str) -> date:
    return datetime.strptime(s, "%Y-%m-%d").date()


def _is_poya_day(d: date) -> bool:
    return d.isoformat() in EVENTS.get("poyaDays", {}).get(str(d.year), [])


def _is_fixed_holiday(d: date) -> bool:
    return any(
        h["month"] == d.month and h["day"] == d.day
        for h in EVENTS.get("fixedPublicHolidays", [])
    )


def _is_sinhala_tamil_ny(d: date) -> bool:
    cfg = EVENTS["sinhalaTamilNewYear"]
    return d.month == cfg["month"] and d.day in cfg["days"]


def _get_eid_al_fitr(year: int) -> Optional[date]:
    entry = EVENTS.get("islamicFestivals", {}).get("eidAlFitr", {}).get(str(year))
    if isinstance(entry, dict) and "date" in entry:
        return _parse_iso(entry["date"])
    return None


def _get_eid_al_fitr_pre_window(year: int) -> int:
    entry = EVENTS.get("islamicFestivals", {}).get("eidAlFitr", {}).get(str(year))
    if isinstance(entry, dict):
        return int(entry.get("preWindowDays", 14))
    return 14


def _get_eid_al_adha(year: int) -> Optional[date]:
    iso = EVENTS.get("islamicFestivals", {}).get("eidAlAdha", {}).get(str(year))
    return _parse_iso(iso) if isinstance(iso, str) else None


def _get_deepavali(year: int) -> Optional[date]:
    iso = EVENTS.get("deepavali", {}).get(str(year))
    return _parse_iso(iso) if isinstance(iso, str) else None


def _get_christmas(year: int) -> date:
    return date(year, 12, 25)


def _get_sinhala_tamil_ny_start(year: int) -> date:
    cfg = EVENTS["sinhalaTamilNewYear"]
    return date(year, cfg["month"], cfg["days"][0])


def _major_festival_dates(year: int) -> list:
    dates = [_get_sinhala_tamil_ny_start(year), _get_christmas(year)]
    for getter in (_get_eid_al_fitr, _get_eid_al_adha, _get_deepavali):
        v = getter(year)
        if v is not None:
            dates.append(v)
    return dates


def _in_window(
    d: date, festival: Optional[date], pre_days: int, post_days: int
) -> bool:
    if festival is None:
        return False
    diff = (d - festival).days
    return -pre_days <= diff <= post_days


def _is_public_holiday(d: date) -> bool:
    if _is_fixed_holiday(d) or _is_sinhala_tamil_ny(d) or _is_poya_day(d):
        return True
    year = d.year
    if d == _get_eid_al_fitr(year):
        return True
    if d == _get_eid_al_adha(year):
        return True
    if d == _get_deepavali(year):
        return True
    return False


def _in_monsoon_yala(d: date) -> bool:
    cfg = EVENTS["monsoonSeasons"]["yala"]
    return cfg["startMonth"] <= d.month <= cfg["endMonth"]


def _in_monsoon_maha(d: date) -> bool:
    cfg = EVENTS["monsoonSeasons"]["maha"]
    return d.month >= cfg["startMonth"] or d.month <= cfg["endMonth"]


def _in_salary_window(d: date) -> bool:
    cfg = EVENTS["salaryWindow"]
    return d.day >= cfg["startDay"] or d.day <= cfg["endDay"]


def _days_to_nearest_festival(d: date) -> tuple:
    all_dates = []
    for y in (d.year - 1, d.year, d.year + 1):
        all_dates.extend(_major_festival_dates(y))
    next_d, prev_d = 999, 999
    for f in all_dates:
        diff = (f - d).days
        if diff >= 0:
            next_d = min(next_d, diff)
        else:
            prev_d = min(prev_d, -diff)
    return next_d, prev_d


def get_calendar_features(d: Union[str, date, datetime]) -> dict:
    """Return the calendar feature dictionary for a given date."""
    d = _to_date(d)
    year = d.year
    stny = _get_sinhala_tamil_ny_start(year)
    eid_fitr = _get_eid_al_fitr(year)
    deepavali = _get_deepavali(year)
    xmas = _get_christmas(year)

    is_festival_day = (
        _is_sinhala_tamil_ny(d)
        or d == eid_fitr
        or d == deepavali
        or d == xmas
    )

    days_to_next, days_since_last = _days_to_nearest_festival(d)

    # JS Date.getDay() returns Sun=0..Sat=6. Python weekday() is Mon=0..Sun=6.
    day_of_week_js = (d.weekday() + 1) % 7

    return {
        "dayOfWeek": day_of_week_js,
        "dayOfMonth": d.day,
        "month": d.month,
        "isPublicHoliday": int(_is_public_holiday(d)),
        "isPoyaDay": int(_is_poya_day(d)),
        "isFestivalDay": int(is_festival_day),
        "daysToNextFestival": days_to_next,
        "daysSinceLastFestival": days_since_last,
        "inSinhalaTamilNewYearWindow": int(
            _in_window(d, stny, EVENTS["sinhalaTamilNewYear"]["preWindowDays"], 2)
        ),
        "inEidAlFitrWindow": int(
            _in_window(d, eid_fitr, _get_eid_al_fitr_pre_window(year), 2)
        ),
        "inDeepavaliWindow": int(_in_window(d, deepavali, 14, 2)),
        "inChristmasWindow": int(
            _in_window(d, xmas, EVENTS["christmas"]["preWindowDays"], 1)
        ),
        "inSalaryWindow": int(_in_salary_window(d)),
        "inMonsoonYala": int(_in_monsoon_yala(d)),
        "inMonsoonMaha": int(_in_monsoon_maha(d)),
    }


def get_feature_vector(d: Union[str, date, datetime]) -> list:
    """Return the feature vector in FEATURE_NAMES order."""
    features = get_calendar_features(d)
    return [features[name] for name in FEATURE_NAMES]


def get_feature_names() -> list:
    return list(FEATURE_NAMES)
