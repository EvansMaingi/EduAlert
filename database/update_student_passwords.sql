-- Gives existing students the default Student Portal password 'student123'.
-- Run after add_student_auth.sql:
--   psql -U postgres -d edualert -f database/update_student_passwords.sql
--
-- password_hash is a bcrypt hash (cost 10) of 'student123', generated with bcryptjs to
-- match server/routes/auth.js. Only students without a password are updated, so
-- re-running this never resets a password that has been changed.

UPDATE students
SET password_hash = '$2a$10$l2PODawgu0biBT3eZrKJ1eOg4dqT26nmFkQj9utEuf9Rz6ffiNf7K'
WHERE password_hash IS NULL;
