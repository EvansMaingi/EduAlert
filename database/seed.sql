-- EduAlert sample data
-- Run after schema.sql and add_email.sql (which adds students.email):
--   psql -U postgres -d edualert -f database/seed.sql
--
-- Emails follow firstname.lastname@university.ac.ke, using the first and last names.
-- Rates are percentages (0-100), matching the scale of ml-service/edualert_dataset.csv.
-- fee_balance_outstanding and prior_unit_failure are booleans in the schema.
-- result_label is left NULL: the semester is still in progress, so the outcome is unknown.
--
-- Students are grouped by risk profile:
--   At risk  (1-3): low attendance, low CATs, high late submissions
--   Moderate (4-6): middling values
--   Low risk (7-10): high attendance, strong CATs, few late submissions

BEGIN;

INSERT INTO students
    (full_name, email, programme, year_of_study, units_registered, fee_balance_outstanding, prior_unit_failure)
VALUES
    ('Brian Otieno Ouma',     'brian.ouma@university.ac.ke',      'BSc Computer Science',        2, 6, true,  true),
    ('Faith Wanjiku Kamau',   'faith.kamau@university.ac.ke',     'BSc Information Technology',  1, 5, true,  false),
    ('Kevin Kiprotich Rotich','kevin.rotich@university.ac.ke',    'BSc Mathematics',             3, 7, true,  true),
    ('Mercy Akinyi Odhiambo', 'mercy.odhiambo@university.ac.ke',  'BSc Computer Science',        1, 6, false, false),
    ('Dennis Mutua Musyoka',  'dennis.musyoka@university.ac.ke',  'BSc Information Technology',  2, 6, true,  false),
    ('Grace Chebet Langat',   'grace.langat@university.ac.ke',    'BSc Mathematics',             4, 5, false, true),
    ('Joseph Kariuki Njoroge','joseph.njoroge@university.ac.ke',  'BSc Computer Science',        3, 7, false, false),
    ('Esther Nyambura Mwangi','esther.mwangi@university.ac.ke',   'BSc Information Technology',  4, 6, false, false),
    ('Collins Wafula Barasa', 'collins.barasa@university.ac.ke',  'BSc Mathematics',             2, 6, true,  false),
    ('Lilian Moraa Nyaboke',  'lilian.nyaboke@university.ac.ke',  'BSc Computer Science',        1, 5, false, false);

-- One record per student, linked by name so the script doesn't depend on serial IDs.
INSERT INTO academic_records
    (student_id, attendance_rate, cat_score_avg, assignment_submission_rate, late_submission_rate,
     semester, academic_year)
SELECT s.student_id, r.attendance_rate, r.cat_score_avg, r.assignment_submission_rate,
       r.late_submission_rate, 'Semester 1', 2026
FROM (VALUES
    -- At risk
    ('Brian Otieno Ouma',      25.0, 20.5, 30.0, 70.0),
    ('Faith Wanjiku Kamau',    32.5, 26.0, 38.5, 62.0),
    ('Kevin Kiprotich Rotich', 38.0, 31.5, 45.0, 55.5),
    -- Moderate
    ('Mercy Akinyi Odhiambo',  52.0, 44.0, 60.0, 38.0),
    ('Dennis Mutua Musyoka',   57.5, 48.5, 64.5, 34.0),
    ('Grace Chebet Langat',    61.0, 52.0, 70.0, 30.5),
    -- Low risk
    ('Joseph Kariuki Njoroge', 72.5, 63.0, 80.0, 20.0),
    ('Esther Nyambura Mwangi', 78.0, 68.5, 85.5, 15.0),
    ('Collins Wafula Barasa',  81.0, 71.0, 87.0, 12.5),
    ('Lilian Moraa Nyaboke',   85.0, 75.0, 90.0, 10.0)
) AS r(full_name, attendance_rate, cat_score_avg, assignment_submission_rate, late_submission_rate)
JOIN students s ON s.full_name = r.full_name;

COMMIT;
