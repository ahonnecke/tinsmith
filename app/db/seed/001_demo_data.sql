-- Demo data for Tinsmith
-- Generic sample data for development and testing

-- Organization
INSERT INTO organizations (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Demo Organization');

-- Users (password: password123)
INSERT INTO users (id, organization_id, email, name, role, password_hash) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'admin@demo.tinsmith.dev', 'Demo Admin', 'admin', '$2b$10$lguykqHwU4PFUB6hASxwF.LYRa/PQmiCvFlMIKmkyTOMEbbi3Sr/C'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'engineer@demo.tinsmith.dev', 'Demo Engineer', 'engineer', '$2b$10$lguykqHwU4PFUB6hASxwF.LYRa/PQmiCvFlMIKmkyTOMEbbi3Sr/C');

-- Projects
INSERT INTO projects (id, organization_id, name, address, city, state, zip_code, building_type, num_units, stories, year_built, status, created_by, weather_station, design_conditions, equipment_selections, updated_at) VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Sample Apartments',
    '100 Main St',
    'Atlanta',
    'GA',
    '30309',
    'Multi-Family',
    12, 4, 2024,
    'completed',
    'b0000000-0000-0000-0000-000000000001',
    '{"name":"Atlanta Hartsfield-Jackson Intl AP","id":"722190","elevation":"1,026 ft","lat":"33.63 N","lon":"84.44 W"}',
    '[{"condition":"1% Cooling","db":93.5,"wb":74.6,"dp":70.2,"hr":0.0158,"label":"Peak cooling design"},{"condition":"1% Dehu","db":80.2,"wb":76.1,"dp":73.4,"hr":0.0176,"label":"Peak dehumidification"},{"condition":"99% Heating","db":21.5,"wb":null,"dp":null,"hr":null,"label":"Heating design (99%)"},{"condition":"99.6% Heating","db":17.3,"wb":null,"dp":null,"hr":null,"label":"Heating design (99.6%)"}]',
    '{"ventilation":["exhaust","hrv_erv"],"equipment":["split_ducted","ductless"],"moisture":["ducted_dehu"]}',
    '2026-02-28'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Oakwood Townhomes',
    '500 S Tryon St',
    'Charlotte',
    'NC',
    '28202',
    'Townhome',
    8, 3, 2025,
    'draft',
    'b0000000-0000-0000-0000-000000000001',
    NULL, NULL, NULL,
    '2026-03-03'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Bayou Crossing Condos',
    '800 Main St',
    'Houston',
    'TX',
    '77002',
    'Multi-Family',
    24, 6, 2024,
    'processing',
    'b0000000-0000-0000-0000-000000000002',
    NULL, NULL, NULL,
    '2026-03-04'
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Coral Gables Residences',
    '220 Miracle Mile',
    'Miami',
    'FL',
    '33134',
    'Multi-Family',
    16, 5, 2025,
    'draft',
    'b0000000-0000-0000-0000-000000000001',
    NULL, NULL, NULL,
    '2026-03-01'
  );

-- Dwelling Units for Sample Apartments
INSERT INTO dwelling_units (id, project_id, name, unit_type, bedrooms, floor_area, building_parameters, load_data) VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'Unit 101 – 1BR Ground Floor',
    'Lowest Cooling',
    1, 725,
    '{"cfm50":320,"ceilingHeight":9,"conditionedVolume":6525,"shelterClass":4,"terrainClass":"B – Urban/Suburban","ventSystems":"Bathroom exhaust (50 CFM)","manualJSoftware":"Wrightsoft","manualJVersion":"v17.0.2"}',
    '{"cooling1":{"sensible":8200,"latent":1800,"total":10000,"shf":0.82,"infiltrationRate":0.12,"infiltrationSensible":980,"infiltrationLatent":420,"ventilationRate":30,"ventilationSensible":1200,"ventilationLatent":580,"floorArea":725,"bedrooms":1,"occupants":2,"internalGains":1800,"designDB":93.5,"designWB":74.6,"indoorDB":75,"indoorRH":50},"dehu1":{"sensible":4100,"latent":3800,"total":7900,"shf":0.52,"infiltrationRate":0.12,"infiltrationSensible":180,"infiltrationLatent":1020,"ventilationRate":30,"ventilationSensible":210,"ventilationLatent":1440,"floorArea":725,"bedrooms":1,"occupants":2,"internalGains":1800,"designDB":80.2,"designWB":76.1,"indoorDB":75,"indoorRH":50},"heating99":{"total":14500,"infiltrationRate":0.12,"infiltrationLoad":3200,"ventilationRate":30,"ventilationLoad":2800,"floorArea":725,"bedrooms":1,"designDB":21.5,"indoorDB":70},"heating996":{"total":16800,"infiltrationRate":0.12,"infiltrationLoad":3700,"ventilationRate":30,"ventilationLoad":3300,"floorArea":725,"bedrooms":1,"designDB":17.3,"indoorDB":70}}'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'Unit 401 – 2BR Top Floor SW',
    'Highest Cooling',
    2, 1050,
    '{"cfm50":450,"ceilingHeight":9,"conditionedVolume":9450,"shelterClass":4,"terrainClass":"B – Urban/Suburban","ventSystems":"Bathroom exhaust (50 CFM), Kitchen range hood (100 CFM)","manualJSoftware":"Wrightsoft","manualJVersion":"v17.0.2"}',
    '{"cooling1":{"sensible":15800,"latent":3200,"total":19000,"shf":0.83,"infiltrationRate":0.15,"infiltrationSensible":1420,"infiltrationLatent":680,"ventilationRate":45,"ventilationSensible":1850,"ventilationLatent":920,"floorArea":1050,"bedrooms":2,"occupants":3,"internalGains":2400,"designDB":93.5,"designWB":74.6,"indoorDB":75,"indoorRH":50},"dehu1":{"sensible":6200,"latent":5800,"total":12000,"shf":0.52,"infiltrationRate":0.15,"infiltrationSensible":280,"infiltrationLatent":1540,"ventilationRate":45,"ventilationSensible":320,"ventilationLatent":2180,"floorArea":1050,"bedrooms":2,"occupants":3,"internalGains":2400,"designDB":80.2,"designWB":76.1,"indoorDB":75,"indoorRH":50},"heating99":{"total":18200,"infiltrationRate":0.15,"infiltrationLoad":4200,"ventilationRate":45,"ventilationLoad":3600,"floorArea":1050,"bedrooms":2,"designDB":21.5,"indoorDB":70},"heating996":{"total":21400,"infiltrationRate":0.15,"infiltrationLoad":4900,"ventilationRate":45,"ventilationLoad":4200,"floorArea":1050,"bedrooms":2,"designDB":17.3,"indoorDB":70}}'
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000001',
    'Unit 402 – 2BR Top Floor NE',
    'Highest Heating',
    2, 1050,
    '{"cfm50":450,"ceilingHeight":9,"conditionedVolume":9450,"shelterClass":4,"terrainClass":"B – Urban/Suburban","ventSystems":"Bathroom exhaust (50 CFM), Kitchen range hood (100 CFM)","manualJSoftware":"Wrightsoft","manualJVersion":"v17.0.2"}',
    '{"cooling1":{"sensible":13400,"latent":2800,"total":16200,"shf":0.83,"infiltrationRate":0.15,"infiltrationSensible":1280,"infiltrationLatent":620,"ventilationRate":45,"ventilationSensible":1650,"ventilationLatent":820,"floorArea":1050,"bedrooms":2,"occupants":3,"internalGains":2400,"designDB":93.5,"designWB":74.6,"indoorDB":75,"indoorRH":50},"dehu1":{"sensible":5400,"latent":5100,"total":10500,"shf":0.51,"infiltrationRate":0.15,"infiltrationSensible":260,"infiltrationLatent":1420,"ventilationRate":45,"ventilationSensible":290,"ventilationLatent":2010,"floorArea":1050,"bedrooms":2,"occupants":3,"internalGains":2400,"designDB":80.2,"designWB":76.1,"indoorDB":75,"indoorRH":50},"heating99":{"total":22800,"infiltrationRate":0.15,"infiltrationLoad":5200,"ventilationRate":45,"ventilationLoad":4400,"floorArea":1050,"bedrooms":2,"designDB":21.5,"indoorDB":70},"heating996":{"total":26200,"infiltrationRate":0.15,"infiltrationLoad":6000,"ventilationRate":45,"ventilationLoad":5100,"floorArea":1050,"bedrooms":2,"designDB":17.3,"indoorDB":70}}'
  );

-- Dwelling Units for other projects (minimal)
INSERT INTO dwelling_units (id, project_id, name, unit_type, bedrooms, floor_area) VALUES
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'Unit A – 3BR End Unit', 'Representative', 3, 1400),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'Unit 101 – Studio', 'Lowest Cooling', 0, 550),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'Unit 601 – 2BR Penthouse', 'Highest Cooling', 2, 1200);

-- Calculations for Sample Apartments (3 runs)
INSERT INTO calculations (id, project_id, submitted_by, status, created_at, completed_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'completed', '2026-02-26 10:00:00+00', '2026-02-26 10:02:00+00'),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'completed', '2026-03-01 14:00:00+00', '2026-03-01 14:02:00+00'),
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'completed', '2026-03-04 09:00:00+00', '2026-03-04 09:02:00+00');

-- Results for Run #1
INSERT INTO results (id, calculation_id, equipment_packages, moisture_balance) VALUES
  (
    'f0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    '{"peakCooling":{"value":19200,"unit":"BTU/h"},"peakHeating":{"value":21800,"unit":"BTU/h"},"moistureDeficit":{"value":-2.4,"unit":"pints/day"},"good":{"title":"Good","equipment":"Goodman GSX140241 – 2-ton Split","seer2":"14.3","hspf2":"7.8","ventilation":"Exhaust-Only (bath fans)","moisture":"None","annualCost":1280,"comfortScore":52,"moisturePass":false},"better":{"title":"Better","equipment":"Carrier 24ACC636 – 2-ton Split","seer2":"15.2","hspf2":"8.1","ventilation":"Exhaust-Only (bath fans)","moisture":"AprilAire E070 Dehumidifier","annualCost":1095,"comfortScore":71,"moisturePass":true},"best":{"title":"Best","equipment":"Mitsubishi SUZ-KA24NA – 2-ton Ducted","seer2":"18.0","hspf2":"10.2","ventilation":"Broan ERV200TE ERV","moisture":"Ultra-Aire SD12 Dehumidifier","annualCost":840,"comfortScore":88,"moisturePass":true}}',
    '{"waterIn":[{"source":"Occupant respiration (3 occ)","pintsPerDay":6.3},{"source":"Cooking / bathing","pintsPerDay":4.1},{"source":"Infiltration moisture","pintsPerDay":6.5},{"source":"Ventilation moisture","pintsPerDay":8.1}],"waterOut":[{"source":"AC latent removal","pintsPerDay":14.0},{"source":"Dehumidifier removal","pintsPerDay":0},{"source":"Exhaust (bath/kitchen)","pintsPerDay":1.8}],"totalIn":25.0,"totalOut":15.8,"netBalance":9.2,"pass":false}'
  );

-- Results for Run #2
INSERT INTO results (id, calculation_id, equipment_packages, moisture_balance) VALUES
  (
    'f0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000002',
    '{"peakCooling":{"value":18400,"unit":"BTU/h"},"peakHeating":{"value":22100,"unit":"BTU/h"},"moistureDeficit":{"value":1.1,"unit":"pints/day"},"good":{"title":"Good","equipment":"Carrier 24ACC636 – 2-ton Split","seer2":"15.2","hspf2":"8.1","ventilation":"Exhaust-Only (bath fans)","moisture":"AprilAire E070 Dehumidifier","annualCost":1120,"comfortScore":68,"moisturePass":false},"better":{"title":"Better","equipment":"Mitsubishi SUZ-KA24NA – 2-ton Ducted","seer2":"18.0","hspf2":"10.2","ventilation":"Panasonic FV-10VE2 ERV","moisture":"Ultra-Aire SD12 Dehumidifier","annualCost":845,"comfortScore":85,"moisturePass":true},"best":{"title":"Best","equipment":"Daikin DZ20VC0241 – 2-ton Inverter","seer2":"20.5","hspf2":"11.0","ventilation":"Zehnder ComfoAir Q350 ERV","moisture":"Ultra-Aire SD12 Dehu + Rheem HPWH","annualCost":790,"comfortScore":95,"moisturePass":true}}',
    '{"waterIn":[{"source":"Occupant respiration (3 occ)","pintsPerDay":6.3},{"source":"Cooking / bathing","pintsPerDay":4.1},{"source":"Infiltration moisture","pintsPerDay":6.2},{"source":"Ventilation moisture","pintsPerDay":7.9}],"waterOut":[{"source":"AC latent removal","pintsPerDay":13.8},{"source":"Dehumidifier removal","pintsPerDay":11.2},{"source":"Exhaust (bath/kitchen)","pintsPerDay":1.8}],"totalIn":24.5,"totalOut":26.8,"netBalance":-2.3,"pass":true}'
  );

-- Results for Run #3 (latest)
INSERT INTO results (id, calculation_id, equipment_packages, moisture_balance) VALUES
  (
    'f0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000003',
    '{"peakCooling":{"value":19000,"unit":"BTU/h"},"peakHeating":{"value":22800,"unit":"BTU/h"},"moistureDeficit":{"value":3.2,"unit":"pints/day"},"good":{"title":"Good","equipment":"Carrier 24ACC636 – 2-ton Split","seer2":"15.2","hspf2":"8.1","ventilation":"Exhaust-Only (bath fans)","moisture":"AprilAire E080 Dehumidifier","annualCost":1095,"comfortScore":72,"moisturePass":true},"better":{"title":"Better","equipment":"Mitsubishi SUZ-KA24NA – 2-ton Ducted","seer2":"18.0","hspf2":"10.2","ventilation":"Broan ERV200TE Energy Recovery","moisture":"Ultra-Aire SD12 Dehumidifier","annualCost":817,"comfortScore":91,"moisturePass":true},"best":{"title":"Best","equipment":"Daikin DZ20VC0241 – 2-ton Inverter","seer2":"20.5","hspf2":"11.0","ventilation":"Zehnder ComfoAir Q350 ERV","moisture":"Ultra-Aire SD12 Dehu + Rheem HPWH","annualCost":766,"comfortScore":98,"moisturePass":true}}',
    '{"waterIn":[{"source":"Occupant respiration (3 occ)","pintsPerDay":6.3},{"source":"Cooking / bathing","pintsPerDay":4.1},{"source":"Infiltration moisture","pintsPerDay":5.8},{"source":"Ventilation moisture","pintsPerDay":8.4}],"waterOut":[{"source":"AC latent removal","pintsPerDay":14.2},{"source":"Dehumidifier removal","pintsPerDay":12.8},{"source":"Exhaust (bath/kitchen)","pintsPerDay":1.8}],"totalIn":24.6,"totalOut":28.8,"netBalance":-4.2,"pass":true}'
  );
