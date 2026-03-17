"""
Train SupriAI ML models with a mix of real and synthetic data.

This utility preserves existing Chrome history and augments the database with
synthetic records to improve model coverage before running full training.
"""

import json
import random
from datetime import datetime, timedelta

import config
from database import db
from ml.engine import MLEngine


def _rand(min_value, max_value):
    return random.randint(min_value, max_value)


def _today_str(offset_days=0):
    day = datetime.now() - timedelta(days=offset_days)
    return day.strftime("%Y-%m-%d")


def _count_table(conn, table):
    row = conn.execute(f"SELECT COUNT(*) AS c FROM {table}").fetchone()
    return int(row["c"]) if row else 0


def get_existing_counts():
    with db.get_connection() as conn:
        return {
            "tabs": _count_table(conn, "tabs"),
            "domain_stats": _count_table(conn, "domain_stats"),
            "productivity_scores": _count_table(conn, "productivity_scores"),
            "chrome_history": _count_table(conn, "chrome_history"),
        }


def _pick_domain_category():
    categories = list(config.WEBSITE_CATEGORIES.keys())
    # Favor productive/news/communication for better training balance.
    weighted = (
        ["productive"] * 4
        + ["communication"] * 2
        + ["news"] * 2
        + ["social"] * 2
        + ["entertainment"] * 2
        + ["shopping"]
    )
    category = random.choice(weighted)
    if category not in categories:
        category = random.choice(categories)
    domain = random.choice(config.WEBSITE_CATEGORIES[category])
    return domain, category


def add_dummy_chrome_history(records=300):
    inserted = 0
    with db.get_connection() as conn:
        for _ in range(records):
            domain, category = _pick_domain_category()
            path_id = _rand(1, 3000)
            visit_count = _rand(1, 120)
            typed_count = _rand(0, 15)
            days_ago = _rand(0, 120)
            ts = (datetime.now() - timedelta(days=days_ago)).timestamp()

            conn.execute(
                """
                INSERT INTO chrome_history
                (url, title, domain, visit_count, last_visit_time, typed_count, category)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"https://{domain}/item/{path_id}",
                    f"{domain} page {path_id}",
                    domain,
                    visit_count,
                    ts,
                    typed_count,
                    category,
                ),
            )
            inserted += 1
    return inserted


def add_dummy_domain_and_productivity(days=120):
    domain_rows = 0
    productivity_rows = 0

    with db.get_connection() as conn:
        for i in range(days):
            date = _today_str(i)
            domains_today = _rand(8, 24)
            category_time = {
                "productive": 0,
                "social": 0,
                "entertainment": 0,
                "other": 0,
            }
            domain_time_map = {}

            for _ in range(domains_today):
                domain, category = _pick_domain_category()
                visit_count = _rand(1, 12)
                tab_count = visit_count + _rand(0, 4)
                active_ms = _rand(20, 900) * 1000
                last_visit = int((datetime.now() - timedelta(days=i)).timestamp() * 1000)

                conn.execute(
                    """
                    INSERT INTO domain_stats
                    (domain, date, visit_count, total_active_time, tab_count, category, last_visit)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(domain, date) DO UPDATE SET
                        visit_count = domain_stats.visit_count + excluded.visit_count,
                        total_active_time = domain_stats.total_active_time + excluded.total_active_time,
                        tab_count = domain_stats.tab_count + excluded.tab_count,
                        category = excluded.category,
                        last_visit = excluded.last_visit
                    """,
                    (domain, date, visit_count, active_ms, tab_count, category, last_visit),
                )
                domain_rows += 1

                domain_time_map[domain] = domain_time_map.get(domain, 0) + active_ms
                if category == "productive":
                    category_time["productive"] += active_ms
                elif category == "social":
                    category_time["social"] += active_ms
                elif category == "entertainment":
                    category_time["entertainment"] += active_ms
                else:
                    category_time["other"] += active_ms

            total = (
                category_time["productive"]
                + category_time["social"]
                + category_time["entertainment"]
                + category_time["other"]
            )
            if total > 0:
                score = (
                    (category_time["productive"] / total) * 100.0
                    + (category_time["other"] / total) * 30.0
                    + (category_time["social"] / total) * 10.0
                    + (category_time["entertainment"] / total) * 10.0
                )
            else:
                score = 0.0

            sorted_domains = sorted(domain_time_map.items(), key=lambda x: x[1], reverse=True)
            top_productive = sorted_domains[0][0] if sorted_domains else ""
            top_distraction = sorted_domains[-1][0] if len(sorted_domains) > 1 else ""

            conn.execute(
                """
                INSERT OR REPLACE INTO productivity_scores
                (date, score, productive_time, social_time, entertainment_time, other_time,
                 total_time, top_productive_domain, top_distraction_domain)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    date,
                    round(score, 1),
                    category_time["productive"],
                    category_time["social"],
                    category_time["entertainment"],
                    category_time["other"],
                    total,
                    top_productive,
                    top_distraction,
                ),
            )
            productivity_rows += 1

    return domain_rows, productivity_rows


def main():
    random.seed(42)

    before = get_existing_counts()
    print("Existing data counts:")
    print(json.dumps(before, indent=2))

    added_history = add_dummy_chrome_history(records=350)
    added_domain, added_productivity = add_dummy_domain_and_productivity(days=120)

    after = get_existing_counts()
    print("\nData counts after augmentation:")
    print(json.dumps(after, indent=2))
    print(
        f"\nAdded dummy records -> chrome_history: {added_history}, "
        f"domain_stats(upserts attempted): {added_domain}, "
        f"productivity_scores(upserts): {added_productivity}"
    )

    print("\nTraining models with combined dataset (original + dummy)...")
    engine = MLEngine()
    results = engine.train_all(db)

    print("\nTraining results:")
    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
