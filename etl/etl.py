#!/usr/bin/env python3
"""
ETL: Equipment_Data.sqlite → PostgreSQL

Maps MDB-exported SQLite column names to the normalized Postgres schema.
Supports --limit to import a subset (for dev/free-tier DBs).
Supports --tables to import specific tables only.

Usage:
    python etl.py --sqlite ../Equipment_Data.sqlite --pg "postgresql://..." --limit 10000
    python etl.py --sqlite ../Equipment_Data.sqlite --pg "postgresql://..." --tables ac,hp
    python etl.py --sqlite ../Equipment_Data.sqlite --pg "postgresql://..."  # full import
"""

import argparse
import io
import sqlite3
import time

import psycopg2

# ---------------------------------------------------------------------------
# Column mappings: SQLite column name → Postgres column name
# Only columns that exist in the Postgres schema are included.
# The order here defines the CSV/COPY column order.
# ---------------------------------------------------------------------------

TABLE_MAPPINGS = {
    "AC": {
        "pg_table": "equipment_ac",
        "columns": {
            "Manufacturer": "manufacturer",
            "Condenser Model": "condenser_model",
            "Coil Model": "coil_model",
            "Capacity": "capacity",
            "SEER": "seer",
            "Classification": "classification",
            "Trade Name": "trade_name",
            "Sound Level": "sound_level",
            "EER95": "eer95",
            "Stages": "stages",
            "Coil Manufacturer": "coil_manufacturer",
            "AH Model": "ah_model",
        },
    },
    "HP": {
        "pg_table": "equipment_hp",
        "columns": {
            "Manufacturer": "manufacturer",
            "Condenser Model": "condenser_model",
            "Coil Model": "coil_model",
            "Capacity": "capacity",
            "SEER": "seer",
            "High Capacity": "high_capacity",
            "Low Capacity": "low_capacity",
            "High COP": "high_cop",
            "Low COP": "low_cop",
            "HSPF": "hspf",
            "Classification": "classification",
            "Trade Name": "trade_name",
            "Sound Level": "sound_level",
            "EER95": "eer95",
            "Stages": "stages",
            "Coil Manufacturer": "coil_manufacturer",
            "AH Model": "ah_model",
        },
    },
    "FURNACE": {
        "pg_table": "equipment_furnace",
        "columns": {
            "Manufacturer": "manufacturer",
            "Model": "model",
            "Input": "input_btu",
            "Output": "output_btu",
            "AFUE": "afue",
            "Classification": "classification",
            "Trade Name": "trade_name",
            "Fuel": "fuel",
            "Stages": "stages",
            "ClgCapMin": "clg_cap_min",
            "ClgCapMax": "clg_cap_max",
        },
    },
    "BOILER": {
        "pg_table": "equipment_boiler",
        "columns": {
            "Manufacturer": "manufacturer",
            "Model": "model",
            "Input": "input_btu",
            "Output": "output_btu",
            "AFUE": "afue",
            "Classification": "classification",
            "Trade Name": "trade_name",
            "Fuel": "fuel",
            "Stages": "stages",
        },
    },
    "ACCoils": {
        "pg_table": "equipment_ac_coils",
        "columns": {
            "Condenser Manufacturer": "condenser_manufacturer",
            "Condenser Model": "condenser_model",
            "Coil Manufacturer": "coil_manufacturer",
            "Coil Model": "coil_model",
            "Capacity": "capacity",
            "SEER": "seer",
            "Classification": "classification",
            "Trade Name": "trade_name",
            "EER95": "eer95",
        },
    },
    "HPCoils": {
        "pg_table": "equipment_hp_coils",
        "columns": {
            "Condenser Manufacturer": "condenser_manufacturer",
            "Condenser Model": "condenser_model",
            "Coil Manufacturer": "coil_manufacturer",
            "Coil Model": "coil_model",
            "Capacity": "capacity",
            "SEER": "seer",
            "High Capacity": "high_capacity",
            "Low Capacity": "low_capacity",
            "High COP": "high_cop",
            "Low COP": "low_cop",
            "HSPF": "hspf",
            "Classification": "classification",
            "Trade Name": "trade_name",
            "EER95": "eer95",
        },
    },
    "AHCoilMatch": {
        "pg_table": "equipment_ah_coil_match",
        "columns": {
            "Manufacturer": "manufacturer",
            "CoilModel": "coil_model",
            "AHModel": "ah_model",
            "AHType": "ah_type",
            "AHClassification": "ah_classification",
            "MinOUSize": "min_ou_size",
            "MaxOUSize": "max_ou_size",
            "MatchPriority": "match_priority",
        },
    },
    "GSHP": {
        "pg_table": "equipment_gshp",
        "columns": {
            "Manufacturer": "manufacturer",
            "Model": "model",
            "Indoor Coil": "indoor_coil",
            "Clg Capacity": "clg_capacity",
            "EER": "eer",
            "Htg Capacity": "htg_capacity",
            "COP": "cop",
            "Clg GPM": "clg_gpm",
            "Htg GPM": "htg_gpm",
            "Trade Name": "trade_name",
        },
    },
    "GWHP": {
        "pg_table": "equipment_gwhp",
        "columns": {
            "Manufacturer": "manufacturer",
            "Model": "model",
            "Indoor Coil": "indoor_coil",
            "High Clg Capacity": "high_clg_capacity",
            "High EER": "high_eer",
            "Low Clg Capacity": "low_clg_capacity",
            "Low EER": "low_eer",
            "High Htg Capacity": "high_htg_capacity",
            "High COP": "high_cop",
            "Low Htg Capacity": "low_htg_capacity",
            "Low COP": "low_cop",
            "Clg GPM": "clg_gpm",
            "Htg GPM": "htg_gpm",
            "Trade Name": "trade_name",
        },
    },
    "WaterHeater": {
        "pg_table": "equipment_water_heater",
        "columns": {
            "Manufacturer": "manufacturer",
            "Model": "model",
            "Trade Name": "trade_name",
            "Application": "application",
            "Type": "type",
            "Fuel": "fuel",
            "TankSize": "tank_size",
            "Input": "input_btu",
            "EnergyFactor": "energy_factor",
            "Efficiency": "efficiency",
        },
    },
    "Collector": {
        "pg_table": "equipment_collector",
        "columns": {
            "Manufacturer": "manufacturer",
            "Model": "model",
            "Trade Name": "trade_name",
            "Type": "type",
            "Medium": "medium",
            "Gross Area": "gross_area",
            "FR-Tau-Alpha": "fr_tau_alpha",
            "FR-UL": "fr_ul",
        },
    },
    "Pump": {
        "pg_table": "equipment_pump",
        "columns": {
            "Manufacturer": "manufacturer",
            "Model": "model",
            "Trade Name": "trade_name",
            "Type": "type",
            "Connector Size": "connector_size",
            "FLow": "flow",
            "Head": "head",
            "Power": "power",
        },
    },
    "Tank": {
        "pg_table": "equipment_tank",
        "columns": {
            "Manufacturer": "manufacturer",
            "Model": "model",
            "Trade Name": "trade_name",
            "Type": "type",
            "Capacity": "capacity",
            "Heat Exchanger Fluid Type": "heat_exchanger_fluid_type",
        },
    },
    "CLGMFR": {
        "pg_table": "equipment_clg_mfr",
        "columns": {
            "MFRCODE": "mfr_code",
            "MFR": "mfr_name",
        },
    },
    "HTGMFR": {
        "pg_table": "equipment_htg_mfr",
        "columns": {
            "MFRCODE": "mfr_code",
            "MFRNAME": "mfr_name",
        },
    },
    "WHPMFR": {
        "pg_table": "equipment_whp_mfr",
        "columns": {
            "MFR": "mfr",
            "MFR1": "mfr1",
        },
    },
    "Family": {
        "pg_table": "equipment_family",
        "columns": {
            "Manufacturer": "manufacturer",
            "Type": "type",
            "Family": "family",
        },
    },
    "INFO": {
        "pg_table": "equipment_info",
        "columns": {
            "Name": "name",
            "Version": "version",
            "createDate": "create_date",
            "schemas": "schemas",
            "Notes": "notes",
        },
    },
}

# Tables ordered small → large so small tables always get full import
TABLE_ORDER = [
    "INFO", "CLGMFR", "HTGMFR", "WHPMFR", "Family",
    "Collector", "Pump", "Tank",
    "BOILER", "WaterHeater", "AHCoilMatch",
    "ACCoils", "HPCoils", "GSHP", "GWHP",
    "FURNACE", "HP", "AC",
]


def escape_csv_value(val):
    """Escape a value for Postgres COPY CSV format."""
    if val is None:
        return ""
    s = str(val)
    if '"' in s or "," in s or "\n" in s:
        return '"' + s.replace('"', '""') + '"'
    return s


def transfer_table(sqlite_conn, pg_conn, sqlite_table, mapping, limit=None):
    """Transfer one table from SQLite to Postgres using COPY."""
    pg_table = mapping["pg_table"]
    col_map = mapping["columns"]
    sqlite_cols = list(col_map.keys())
    pg_cols = list(col_map.values())

    # Build SELECT with only mapped columns
    select_cols = ", ".join(f'"{c}"' for c in sqlite_cols)
    query = f"SELECT {select_cols} FROM \"{sqlite_table}\""
    if limit:
        query += f" LIMIT {limit}"

    cursor = sqlite_conn.cursor()
    cursor.execute(query)

    # Build CSV in memory, batch into chunks
    BATCH_SIZE = 50_000
    total = 0
    pg_cursor = pg_conn.cursor()

    while True:
        rows = cursor.fetchmany(BATCH_SIZE)
        if not rows:
            break

        buf = io.StringIO()
        for row in rows:
            line = ",".join(escape_csv_value(v) for v in row)
            buf.write(line + "\n")

        buf.seek(0)
        col_list = ", ".join(pg_cols)
        pg_cursor.copy_expert(
            f"COPY {pg_table} ({col_list}) FROM STDIN WITH (FORMAT csv, NULL '')",
            buf,
        )
        total += len(rows)
        print(f"  {pg_table}: {total:,} rows", end="\r", flush=True)

    pg_conn.commit()
    print(f"  {pg_table}: {total:,} rows — done")
    return total


def clear_equipment_tables(pg_conn):
    """Truncate all equipment tables (not core schema)."""
    cur = pg_conn.cursor()
    for mapping in TABLE_MAPPINGS.values():
        cur.execute(f"TRUNCATE {mapping['pg_table']} CASCADE")
    pg_conn.commit()
    print("Cleared all equipment tables")


def add_indexes(pg_conn):
    """Add performance indexes after bulk import."""
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_eq_ac_mfr ON equipment_ac (manufacturer)",
        "CREATE INDEX IF NOT EXISTS idx_eq_ac_cap ON equipment_ac (capacity)",
        "CREATE INDEX IF NOT EXISTS idx_eq_ac_seer ON equipment_ac (seer)",
        "CREATE INDEX IF NOT EXISTS idx_eq_ac_class ON equipment_ac (classification)",
        "CREATE INDEX IF NOT EXISTS idx_eq_hp_mfr ON equipment_hp (manufacturer)",
        "CREATE INDEX IF NOT EXISTS idx_eq_hp_cap ON equipment_hp (capacity)",
        "CREATE INDEX IF NOT EXISTS idx_eq_hp_seer ON equipment_hp (seer)",
        "CREATE INDEX IF NOT EXISTS idx_eq_hp_hspf ON equipment_hp (hspf)",
        "CREATE INDEX IF NOT EXISTS idx_eq_hp_class ON equipment_hp (classification)",
        "CREATE INDEX IF NOT EXISTS idx_eq_furnace_mfr ON equipment_furnace (manufacturer)",
        "CREATE INDEX IF NOT EXISTS idx_eq_furnace_afue ON equipment_furnace (afue)",
        "CREATE INDEX IF NOT EXISTS idx_eq_boiler_mfr ON equipment_boiler (manufacturer)",
    ]
    cur = pg_conn.cursor()
    for idx in indexes:
        cur.execute(idx)
        name = idx.split("idx_")[1].split(" ON")[0]
        print(f"  index: idx_{name}")
    pg_conn.commit()
    print("Indexes created")


def main():
    parser = argparse.ArgumentParser(description="Equipment DB ETL: SQLite → PostgreSQL")
    parser.add_argument("--sqlite", required=True, help="Path to Equipment_Data.sqlite")
    parser.add_argument("--pg", required=True, help="PostgreSQL connection string")
    parser.add_argument("--limit", type=int, default=None,
                        help="Max rows per table (None = all). Small tables (<limit) always fully imported.")
    parser.add_argument("--tables", default=None,
                        help="Comma-separated list of SQLite table names to import (default: all)")
    parser.add_argument("--no-truncate", action="store_true",
                        help="Don't truncate tables before import (append mode)")
    parser.add_argument("--no-index", action="store_true",
                        help="Skip index creation after import")
    args = parser.parse_args()

    tables_filter = None
    if args.tables:
        tables_filter = set(t.strip().upper() for t in args.tables.split(","))

    sqlite_conn = sqlite3.connect(args.sqlite)
    pg_conn = psycopg2.connect(args.pg)

    if not args.no_truncate:
        clear_equipment_tables(pg_conn)

    start = time.time()
    grand_total = 0

    for sqlite_table in TABLE_ORDER:
        if tables_filter and sqlite_table.upper() not in tables_filter:
            continue
        if sqlite_table not in TABLE_MAPPINGS:
            continue

        mapping = TABLE_MAPPINGS[sqlite_table]

        # Get source row count to decide limit
        cur = sqlite_conn.cursor()
        cur.execute(f'SELECT COUNT(*) FROM "{sqlite_table}"')
        source_count = cur.fetchone()[0]

        effective_limit = args.limit
        # Small tables: always import fully
        if args.limit and source_count <= args.limit:
            effective_limit = None

        label = f"({effective_limit:,} of {source_count:,})" if effective_limit else f"({source_count:,})"
        print(f"\n[{sqlite_table}] {label}")

        count = transfer_table(sqlite_conn, pg_conn, sqlite_table, mapping, effective_limit)
        grand_total += count

    if not args.no_index:
        print()
        add_indexes(pg_conn)

    elapsed = time.time() - start
    print(f"\nETL complete: {grand_total:,} rows in {elapsed:.1f}s")

    sqlite_conn.close()
    pg_conn.close()


if __name__ == "__main__":
    main()
