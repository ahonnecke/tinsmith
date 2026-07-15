-- Add password column to users table
ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Set demo password ('password123') for existing seed users
UPDATE users SET password_hash = '$2b$10$lguykqHwU4PFUB6hASxwF.LYRa/PQmiCvFlMIKmkyTOMEbbi3Sr/C';
