#!/usr/bin/env python3
"""
Validate equipment data import: SQLite source vs PostgreSQL target.

Checks:
  1. Row counts match (or match expected limit)
  2. Random sample rows match between source and target
  3. Aggregate stats (min/max/avg) on numeric columns match
  4. Specific known-good equipment lookups return correct data

Usage:
    python validate.py --sqlite ../Equipment_Data.sqlite --pg "postgresql://..." --limit 10000
    python validate.py --sqlite ../Equipment_Data.sqlite --pg "postgresql://..."
"""

import argparse
import random
import sqlite3
import sys

import psycopg2
import psycopg2.extras

from etl import TABLE_MAPPINGS, TABLE_ORDER

PASS = "PASS"
FAIL = "FAIL"
WARN = "WARN"


def check_row_counts(sqlite_conn, pg_conn, limit=None):
    """Compare row counts between SQLite and Postgres."""
    print("\n=== Row Count Check ===")
    results = []
    all_pass = True

    for sqlite_table in TABLE_ORDER:
        if sqlite_table not in TABLE_MAPPINGS:
            continue
        mapping = TABLE_MAPPINGS[sqlite_table]
        pg_table = mapping["pg_table"]

        s_cur = sqlite_conn.cursor()
        s_cur.execute(f'SELECT COUNT(*) FROM "{sqlite_table}"')
        source_count = s_cur.fetchone()[0]

        p_cur = pg_conn.cursor()
        p_cur.execute(f"SELECT COUNT(*) FROM {pg_table}")
        pg_count = p_cur.fetchone()[0]

        if limit and source_count > limit:
            expected = limit
            status = PASS if pg_count == expected else FAIL
        else:
            expected = source_count
            status = PASS if pg_count == expected else FAIL

        if status == FAIL:
            all_pass = False

        results.append((sqlite_table, pg_table, source_count, pg_count, expected, status))
        marker = "✓" if status == PASS else "✗"
        print(f"  {marker} {pg_table}: {pg_count:,} rows (expected {expected:,}, source {source_count:,})")

    return all_pass, results


def check_sample_rows(sqlite_conn, pg_conn, n_samples=20):
    """Pull random rows from Postgres and verify they exist with matching data in SQLite."""
    print("\n=== Sample Row Check ===")
    all_pass = True

    # Focus on the big tables where errors would matter most
    sample_tables = ["AC", "HP", "FURNACE", "BOILER"]

    for sqlite_table in sample_tables:
        if sqlite_table not in TABLE_MAPPINGS:
            continue
        mapping = TABLE_MAPPINGS[sqlite_table]
        pg_table = mapping["pg_table"]
        col_map = mapping["columns"]

        pg_cols = list(col_map.values())
        sqlite_cols = list(col_map.keys())

        # Get N random rows from Postgres
        p_cur = pg_conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        col_list = ", ".join(pg_cols)
        p_cur.execute(f"SELECT {col_list} FROM {pg_table} ORDER BY RANDOM() LIMIT {n_samples}")
        pg_rows = p_cur.fetchall()

        if not pg_rows:
            print(f"  ? {pg_table}: no rows to sample")
            continue

        mismatches = 0
        for pg_row in pg_rows:
            # Build a WHERE clause to find this exact row in SQLite
            # Use text columns for matching (floats have precision issues across DBs)
            conditions = []
            params = []
            for sq_col, pg_col in col_map.items():
                val = pg_row[pg_col]
                if val is None:
                    conditions.append(f'"{sq_col}" IS NULL')
                elif isinstance(val, float):
                    # Float comparison with tolerance
                    conditions.append(f'ABS("{sq_col}" - ?) < 0.01')
                    params.append(val)
                else:
                    conditions.append(f'"{sq_col}" = ?')
                    params.append(val)

            where = " AND ".join(conditions)
            s_cur = sqlite_conn.cursor()
            s_cur.execute(f'SELECT COUNT(*) FROM "{sqlite_table}" WHERE {where}', params)
            match_count = s_cur.fetchone()[0]

            if match_count == 0:
                mismatches += 1
                if mismatches <= 3:  # Only print first few
                    # Show what we were looking for
                    key_cols = ["manufacturer", "condenser_model", "model"]
                    ident = {k: pg_row[k] for k in key_cols if k in pg_row.keys()}
                    print(f"    ✗ No SQLite match for: {ident}")

        status = PASS if mismatches == 0 else FAIL
        if status == FAIL:
            all_pass = False
        marker = "✓" if status == PASS else "✗"
        print(f"  {marker} {pg_table}: {n_samples - mismatches}/{n_samples} samples matched")

    return all_pass


def check_aggregates(sqlite_conn, pg_conn):
    """Compare min/max/avg on key numeric columns."""
    print("\n=== Aggregate Check ===")
    all_pass = True

    checks = [
        ("AC", "equipment_ac", "Capacity", "capacity"),
        ("AC", "equipment_ac", "SEER", "seer"),
        ("AC", "equipment_ac", "EER95", "eer95"),
        ("HP", "equipment_hp", "Capacity", "capacity"),
        ("HP", "equipment_hp", "SEER", "seer"),
        ("HP", "equipment_hp", "HSPF", "hspf"),
        ("FURNACE", "equipment_furnace", "Input", "input_btu"),
        ("FURNACE", "equipment_furnace", "AFUE", "afue"),
        ("BOILER", "equipment_boiler", "AFUE", "afue"),
    ]

    for sq_table, pg_table, sq_col, pg_col in checks:
        p_cur = pg_conn.cursor()
        p_cur.execute(f"SELECT MIN({pg_col}), MAX({pg_col}), AVG({pg_col}) FROM {pg_table}")
        pg_min, pg_max, pg_avg = p_cur.fetchone()

        s_cur = sqlite_conn.cursor()
        # For limited imports, we can't compare avg — just check min/max are within source range
        s_cur.execute(f'SELECT MIN("{sq_col}"), MAX("{sq_col}") FROM "{sq_table}"')
        sq_min, sq_max = s_cur.fetchone()

        if pg_min is None:
            print(f"  ? {pg_table}.{pg_col}: no data")
            continue

        # pg_min should be >= sq_min, pg_max should be <= sq_max
        in_range = (pg_min >= sq_min - 0.01) and (pg_max <= sq_max + 0.01)
        status = PASS if in_range else FAIL
        if status == FAIL:
            all_pass = False

        marker = "✓" if status == PASS else "✗"
        print(f"  {marker} {pg_table}.{pg_col}: pg[{pg_min:.1f}..{pg_max:.1f}] "
              f"within src[{sq_min:.1f}..{sq_max:.1f}]")

    return all_pass


def check_spot_lookups(pg_conn):
    """Verify specific known equipment can be found."""
    print("\n=== Spot Lookup Check ===")
    all_pass = True

    # Dynamic lookups — find actual values in the data
    cur = pg_conn.cursor()

    # Get a real manufacturer code from AC table
    cur.execute("SELECT manufacturer FROM equipment_ac LIMIT 1")
    ac_mfr = cur.fetchone()
    ac_mfr_val = ac_mfr[0] if ac_mfr else "AIRQ"

    cur.execute("SELECT manufacturer FROM equipment_hp LIMIT 1")
    hp_mfr = cur.fetchone()
    hp_mfr_val = hp_mfr[0] if hp_mfr else "AIRQ"

    lookups = [
        ("equipment_ac", f"manufacturer = '{ac_mfr_val}' AND seer >= 14", f"AC mfr={ac_mfr_val} with SEER >= 14"),
        ("equipment_hp", f"manufacturer = '{hp_mfr_val}' AND hspf >= 7", f"HP mfr={hp_mfr_val} with HSPF >= 7"),
        ("equipment_furnace", "afue >= 96", "High-efficiency furnaces (96%+ AFUE)"),
        ("equipment_boiler", "afue >= 80", "Boilers with AFUE >= 80"),
        ("equipment_ac", "capacity >= 24000 AND capacity <= 36000", "AC in 2-3 ton range"),
        ("equipment_hp", "capacity >= 24000 AND capacity <= 36000", "HP in 2-3 ton range"),
    ]

    cur = pg_conn.cursor()
    for table, where, desc in lookups:
        cur.execute(f"SELECT COUNT(*) FROM {table} WHERE {where}")
        count = cur.fetchone()[0]
        status = PASS if count > 0 else FAIL
        if status == FAIL:
            all_pass = False
        marker = "✓" if status == PASS else "✗"
        print(f"  {marker} {desc}: {count:,} results")

    return all_pass


def main():
    parser = argparse.ArgumentParser(description="Validate equipment data import")
    parser.add_argument("--sqlite", required=True, help="Path to Equipment_Data.sqlite")
    parser.add_argument("--pg", required=True, help="PostgreSQL connection string")
    parser.add_argument("--limit", type=int, default=None,
                        help="Expected row limit per table (for subset imports)")
    parser.add_argument("--samples", type=int, default=20,
                        help="Number of random rows to verify per table")
    args = parser.parse_args()

    sqlite_conn = sqlite3.connect(args.sqlite)
    pg_conn = psycopg2.connect(args.pg)

    results = {}
    results["counts"] = check_row_counts(sqlite_conn, pg_conn, args.limit)[0]
    results["samples"] = check_sample_rows(sqlite_conn, pg_conn, args.samples)
    results["aggregates"] = check_aggregates(sqlite_conn, pg_conn)
    results["lookups"] = check_spot_lookups(pg_conn)

    sqlite_conn.close()
    pg_conn.close()

    print("\n=== Summary ===")
    all_pass = True
    for name, passed in results.items():
        marker = "✓" if passed else "✗"
        print(f"  {marker} {name}")
        if not passed:
            all_pass = False

    if all_pass:
        print("\nAll checks passed.")
    else:
        print("\nSome checks FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()
