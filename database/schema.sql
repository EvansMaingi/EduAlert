-- EduAlert PostgreSQL schema
-- Tables are ordered so that each foreign key references a table already created.

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    role VARCHAR CHECK (role IN ('admin', 'lecturer')) DEFAULT 'lecturer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    full_name VARCHAR NOT NULL,
    programme VARCHAR,
    year_of_study INT,
    units_registered INT,
    fee_balance_outstanding BOOLEAN DEFAULT false,
    prior_unit_failure BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE academic_records (
    record_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    attendance_rate FLOAT,
    cat_score_avg FLOAT,
    assignment_submission_rate FLOAT,
    late_submission_rate FLOAT,
    semester VARCHAR,
    academic_year INT,
    result_label VARCHAR,
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE risk_predictions (
    prediction_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    record_id INT REFERENCES academic_records(record_id),
    risk_score FLOAT,
    risk_label VARCHAR,
    risk_percentage FLOAT,
    model_version VARCHAR DEFAULT 'XGBoost-v1',
    is_reviewed BOOLEAN DEFAULT false,
    generated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE interventions (
    intervention_id SERIAL PRIMARY KEY,
    prediction_id INT REFERENCES risk_predictions(prediction_id),
    student_id INT REFERENCES students(student_id),
    user_id INT REFERENCES users(user_id),
    action_taken VARCHAR NOT NULL,
    outcome VARCHAR,
    notes TEXT,
    date_logged TIMESTAMP DEFAULT NOW()
);

