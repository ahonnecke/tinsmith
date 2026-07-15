-- Equipment seed data for Tinsmith MVP-1
-- ~5 records per major table.
--
-- ⚠️ ILLUSTRATIVE VALUES — do not cite these ratings.
-- The manufacturer and model strings are real AHRI-listed products, but the
-- performance figures (capacity, SEER, EER, AFUE, COP, HSPF) were chosen to
-- exercise the sizing and matching code, not transcribed from AHRI's directory.
-- Treat every number here as fixture data. Real ratings come from the AHRI
-- directory via etl/etl.py; see docs/equipment-selection.md.
--
-- Coverage is deliberately thin (largest AC is 3 tons / 36,000 BTU/h), so a
-- typical 2,000 sq ft house will find no cooling match against this seed. That
-- is a data limit, not a bug in the matcher.

-- AC units
INSERT INTO equipment_ac (manufacturer, condenser_model, coil_model, capacity, seer, classification, trade_name, eer95, stages) VALUES
  ('Carrier', '24ACC636A003', 'CNPVP3617ALA', 36000, 15.2, 'Split System', 'Carrier', 12.5, 1),
  ('Goodman', 'GSX140241', 'CAPF3636B6', 24000, 14.3, 'Split System', 'Goodman', 11.8, 1),
  ('Trane', '4TTR6024J1000A', '4PXCBU24BS3HAA', 24000, 16.0, 'Split System', 'Trane', 13.0, 1),
  ('Lennox', 'XC21-024-230', 'CBA38MV-024', 24000, 21.0, 'Split System', 'Lennox', 15.2, 2),
  ('Rheem', 'RA1624AJ1NA', 'RCFA-HM2417CC', 24000, 16.0, 'Split System', 'Rheem', 13.0, 1);

-- Heat Pumps
INSERT INTO equipment_hp (manufacturer, condenser_model, coil_model, capacity, seer, high_capacity, low_capacity, high_cop, low_cop, hspf, classification, trade_name, eer95, stages) VALUES
  ('Mitsubishi', 'SUZ-KA24NAHZ', 'SEZ-KD24NA4R1', 24000, 18.0, 27600, 5000, 4.2, 2.8, 10.2, 'Ducted Mini-Split', 'Mitsubishi', 14.5, 0),
  ('Daikin', 'DZ20VC0241A', 'MBVC1804AA', 24000, 20.5, 29000, 6000, 4.5, 3.0, 11.0, 'Inverter Ducted', 'Daikin', 15.8, 0),
  ('Carrier', '25HPB636A003', 'CNPVP3617ALA', 36000, 15.2, 36000, 36000, 3.4, 3.4, 8.5, 'Split System HP', 'Carrier', 12.0, 1),
  ('Fujitsu', 'AOU24RLXFZH', 'ARU24RLF', 24000, 19.0, 28800, 4800, 4.3, 2.9, 10.8, 'Ducted Mini-Split', 'Fujitsu', 14.8, 0),
  ('Bosch', 'BOVA-36HDN1-M20G', 'BVA-36WN1-M20', 36000, 18.5, 40000, 9000, 4.0, 2.6, 10.0, 'Inverter Ducted', 'Bosch', 14.2, 0);

-- Furnaces
INSERT INTO equipment_furnace (manufacturer, model, input_btu, output_btu, afue, classification, trade_name, fuel, stages) VALUES
  ('Carrier', '59MN7A060V17-14', 56000, 54320, 97.0, 'Upflow/Horizontal', 'Carrier', 'Natural Gas', 2),
  ('Trane', 'S9V2B060U3PSA', 56000, 54880, 98.0, 'Upflow/Horizontal', 'Trane', 'Natural Gas', 2),
  ('Goodman', 'GMVC960603BN', 56000, 53760, 96.0, 'Upflow/Horizontal', 'Goodman', 'Natural Gas', 2),
  ('Lennox', 'SLP99UH070XV36B', 66000, 65340, 99.0, 'Upflow/Horizontal', 'Lennox', 'Natural Gas', 2),
  ('Rheem', 'R96VA0602317MSA', 56000, 53760, 96.0, 'Upflow/Horizontal', 'Rheem', 'Natural Gas', 2);

-- Boilers
INSERT INTO equipment_boiler (manufacturer, model, input_btu, output_btu, afue, classification, trade_name, fuel, stages) VALUES
  ('Navien', 'NCB-240E', 199900, 189905, 95.0, 'Wall-Hung', 'Navien', 'Natural Gas', 2),
  ('Rinnai', 'I120SN', 120000, 115200, 96.0, 'Wall-Hung', 'Rinnai', 'Natural Gas', 2),
  ('Buderus', 'GB142/24', 80000, 76000, 95.0, 'Wall-Hung', 'Buderus', 'Natural Gas', 2);

-- Water Heaters (including HPWH referenced in results)
INSERT INTO equipment_water_heater (manufacturer, model, trade_name, application, type, fuel, tank_size, input_btu, energy_factor, efficiency) VALUES
  ('Rheem', 'PROPH80 T2 RH375', 'Rheem ProTerra', 'Residential', 'Heat Pump', 'Electric', 80, 4500, 3.75, 95.0),
  ('A.O. Smith', 'HPTS-80', 'Voltex', 'Residential', 'Heat Pump', 'Electric', 80, 4500, 3.45, 93.0),
  ('Bradford White', 'RE2H80R10B-1NCWT', 'AeroTherm', 'Residential', 'Heat Pump', 'Electric', 80, 4500, 3.42, 92.0),
  ('Rheem', 'PROG50-38N RH67', 'Rheem', 'Residential', 'Storage', 'Natural Gas', 50, 38000, 0.67, 82.0),
  ('A.O. Smith', 'GPVL-50', 'ProLine XE', 'Residential', 'Power Vent', 'Natural Gas', 50, 40000, 0.70, 84.0);

-- Cooling manufacturers
INSERT INTO equipment_clg_mfr (mfr_code, mfr_name) VALUES
  ('CAR', 'Carrier'),
  ('TRN', 'Trane'),
  ('LEN', 'Lennox'),
  ('MIT', 'Mitsubishi Electric'),
  ('DAI', 'Daikin');

-- Heating manufacturers
INSERT INTO equipment_htg_mfr (mfr_code, mfr_name) VALUES
  ('CAR', 'Carrier'),
  ('TRN', 'Trane'),
  ('GOO', 'Goodman'),
  ('LEN', 'Lennox'),
  ('RHE', 'Rheem');
