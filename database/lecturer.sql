-- Test lecturer account
-- Run after schema.sql:  psql -U postgres -d edualert -f database/lecturer.sql
--
-- Login: james@edualert.com / lecturer123
-- password_hash is a bcrypt hash (cost 10) of 'lecturer123', generated with bcryptjs
-- to match how server/routes/auth.js hashes and checks passwords.
-- Safe to re-run: does nothing if the email already exists.

INSERT INTO users (full_name, email, password_hash, role)
VALUES (
    'Dr. James Omondi',
    'james@edualert.com',
    '$2a$10$uuDjJZr37hxKQsm9RGQjq./YeLZdupQJfGsgaWBzhN2nezBou/Ae2',
    'lecturer'
)
ON CONFLICT (email) DO NOTHING;
