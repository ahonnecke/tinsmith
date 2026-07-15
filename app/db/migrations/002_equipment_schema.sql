-- Equipment schema for Tinsmith (adapted from MDB Tools export)

CREATE TABLE equipment_ac (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  condenser_model TEXT,
  coil_model TEXT,
  capacity REAL,
  seer REAL,
  classification TEXT,
  trade_name TEXT,
  sound_level REAL,
  eer95 REAL,
  stages INTEGER,
  coil_manufacturer TEXT,
  ah_model TEXT
);

CREATE TABLE equipment_ac_coils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condenser_manufacturer TEXT,
  condenser_model TEXT,
  coil_manufacturer TEXT,
  coil_model TEXT,
  capacity REAL,
  seer REAL,
  classification TEXT,
  trade_name TEXT,
  eer95 REAL
);

CREATE TABLE equipment_ah_coil_match (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  coil_model TEXT,
  ah_model TEXT,
  ah_type TEXT,
  ah_classification TEXT,
  min_ou_size INTEGER,
  max_ou_size INTEGER,
  match_priority INTEGER
);

CREATE TABLE equipment_boiler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  model TEXT,
  input_btu REAL,
  output_btu REAL,
  afue REAL,
  classification TEXT,
  trade_name TEXT,
  fuel TEXT,
  stages INTEGER
);

CREATE TABLE equipment_furnace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  model TEXT,
  input_btu REAL,
  output_btu REAL,
  afue REAL,
  classification TEXT,
  trade_name TEXT,
  fuel TEXT,
  stages INTEGER,
  clg_cap_min INTEGER,
  clg_cap_max INTEGER
);

CREATE TABLE equipment_hp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  condenser_model TEXT,
  coil_model TEXT,
  capacity REAL,
  seer REAL,
  high_capacity REAL,
  low_capacity REAL,
  high_cop REAL,
  low_cop REAL,
  hspf REAL,
  classification TEXT,
  trade_name TEXT,
  sound_level REAL,
  eer95 REAL,
  stages INTEGER,
  coil_manufacturer TEXT,
  ah_model TEXT
);

CREATE TABLE equipment_hp_coils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condenser_manufacturer TEXT,
  condenser_model TEXT,
  coil_manufacturer TEXT,
  coil_model TEXT,
  capacity REAL,
  seer REAL,
  high_capacity REAL,
  low_capacity REAL,
  high_cop REAL,
  low_cop REAL,
  hspf REAL,
  classification TEXT,
  trade_name TEXT,
  eer95 REAL
);

CREATE TABLE equipment_gshp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  model TEXT,
  indoor_coil TEXT,
  clg_capacity REAL,
  eer REAL,
  htg_capacity REAL,
  cop REAL,
  clg_gpm REAL,
  htg_gpm REAL,
  trade_name TEXT
);

CREATE TABLE equipment_gwhp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  model TEXT,
  indoor_coil TEXT,
  high_clg_capacity REAL,
  high_eer REAL,
  low_clg_capacity REAL,
  low_eer REAL,
  high_htg_capacity REAL,
  high_cop REAL,
  low_htg_capacity REAL,
  low_cop REAL,
  clg_gpm REAL,
  htg_gpm REAL,
  trade_name TEXT
);

CREATE TABLE equipment_water_heater (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  model TEXT,
  trade_name TEXT,
  application TEXT,
  type TEXT,
  fuel TEXT,
  tank_size REAL,
  input_btu REAL,
  energy_factor REAL,
  efficiency REAL
);

CREATE TABLE equipment_collector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  model TEXT,
  trade_name TEXT,
  type TEXT,
  medium TEXT,
  gross_area REAL,
  fr_tau_alpha REAL,
  fr_ul REAL
);

CREATE TABLE equipment_pump (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  model TEXT,
  trade_name TEXT,
  type TEXT,
  connector_size REAL,
  flow REAL,
  head REAL,
  power REAL
);

CREATE TABLE equipment_tank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  model TEXT,
  trade_name TEXT,
  type TEXT,
  capacity REAL,
  heat_exchanger_fluid_type TEXT
);

CREATE TABLE equipment_clg_mfr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mfr_code TEXT,
  mfr_name TEXT
);

CREATE TABLE equipment_htg_mfr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mfr_code TEXT,
  mfr_name TEXT
);

CREATE TABLE equipment_whp_mfr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mfr TEXT,
  mfr1 TEXT
);

CREATE TABLE equipment_family (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT,
  type TEXT,
  family TEXT
);

CREATE TABLE equipment_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  version TEXT,
  create_date TEXT,
  schemas TEXT,
  notes TEXT
);
