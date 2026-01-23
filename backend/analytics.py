from collections import Counter, defaultdict
from datetime import datetime
from sqlalchemy.orm import Session
from models import HistoryEvent


def summarize_history(db: Session):
    events = db.query(HistoryEvent).all()
    if not events:
        return {
            "total_visits": 0,
            "total_domains": 0,
            "total_duration_seconds": 0,
            "avg_duration_seconds": 0.0,
            "top_domains": [],
            "topics": [],
        }

    domain_counter = Counter()
    topic_counter = Counter()
    total_duration = 0

    for event in events:
        domain_counter[event.domain] += 1
        topic_counter[event.topic or "Unknown"] += 1
        total_duration += event.duration_seconds or 0

    return {
        "total_visits": len(events),
        "total_domains": len(domain_counter),
        "total_duration_seconds": total_duration,
        "avg_duration_seconds": total_duration / len(events),
        "top_domains": domain_counter.most_common(10),
        "topics": topic_counter.most_common(10),
    }


def time_distribution(db: Session):
    buckets: dict[int, dict[str, int]] = defaultdict(lambda: {"visits": 0, "duration_seconds": 0})
    for event in db.query(HistoryEvent).all():
        hour = event.visited_at.hour if isinstance(event.visited_at, datetime) else 0
        buckets[hour]["visits"] += 1
        buckets[hour]["duration_seconds"] += event.duration_seconds or 0

    return [
        {"hour": h, "visits": data["visits"], "duration_seconds": data["duration_seconds"]}
        for h, data in sorted(buckets.items())
    ]
