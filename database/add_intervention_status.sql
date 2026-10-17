ALTER TABLE interventions ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'Pending' CHECK (status IN ('Pending', 'Contacted', 'In Progress', 'Resolved'));
