-- Adds emails to the 10 sample students that were loaded before students.email existed.
-- Run after add_email.sql:
--   psql -U postgres -d edualert -f database/update_emails.sql
--
-- Emails match seed.sql: firstname.lastname@university.ac.ke, using the first and last names.
-- Runs as one transaction: if any update fails (e.g. two students share a name, so the
-- same email would be set twice), nothing is changed. Safe to re-run.

BEGIN;

UPDATE students SET email = 'brian.ouma@university.ac.ke'      WHERE full_name = 'Brian Otieno Ouma';
UPDATE students SET email = 'faith.kamau@university.ac.ke'     WHERE full_name = 'Faith Wanjiku Kamau';
UPDATE students SET email = 'kevin.rotich@university.ac.ke'    WHERE full_name = 'Kevin Kiprotich Rotich';
UPDATE students SET email = 'mercy.odhiambo@university.ac.ke'  WHERE full_name = 'Mercy Akinyi Odhiambo';
UPDATE students SET email = 'dennis.musyoka@university.ac.ke'  WHERE full_name = 'Dennis Mutua Musyoka';
UPDATE students SET email = 'grace.langat@university.ac.ke'    WHERE full_name = 'Grace Chebet Langat';
UPDATE students SET email = 'joseph.njoroge@university.ac.ke'  WHERE full_name = 'Joseph Kariuki Njoroge';
UPDATE students SET email = 'esther.mwangi@university.ac.ke'   WHERE full_name = 'Esther Nyambura Mwangi';
UPDATE students SET email = 'collins.barasa@university.ac.ke'  WHERE full_name = 'Collins Wafula Barasa';
UPDATE students SET email = 'lilian.nyaboke@university.ac.ke'  WHERE full_name = 'Lilian Moraa Nyaboke';

COMMIT;
