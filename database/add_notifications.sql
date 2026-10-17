CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  student_id INT REFERENCES students(student_id),
  prediction_id INT REFERENCES risk_predictions(prediction_id),
  message TEXT NOT NULL,
  email_sent BOOLEAN DEFAULT false,
  email_recipient VARCHAR,
  sent_at TIMESTAMP DEFAULT NOW()
);
