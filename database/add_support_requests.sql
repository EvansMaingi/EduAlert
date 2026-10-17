CREATE TABLE IF NOT EXISTS support_requests (
  request_id SERIAL PRIMARY KEY,
  student_id INT REFERENCES students(student_id),
  support_type VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'Pending' CHECK (status IN ('Pending', 'Actioned')),
  notes TEXT,
  requested_at TIMESTAMP DEFAULT NOW()
);
