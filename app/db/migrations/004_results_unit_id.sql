-- Add dwelling_unit_id to results for per-unit calculation tracking
ALTER TABLE results ADD COLUMN dwelling_unit_id UUID REFERENCES dwelling_units(id);
CREATE INDEX idx_results_unit ON results(dwelling_unit_id);
