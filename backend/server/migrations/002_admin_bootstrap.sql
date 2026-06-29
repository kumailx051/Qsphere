CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    WHERE LOWER("emailAddress") = LOWER('admin@qsphere.com')
      AND LOWER(COALESCE(role, 'user')) <> 'admin'
  ) THEN
    RAISE EXCEPTION 'Email already exists as a user. Change the administrator email.';
  END IF;

  INSERT INTO users (
    "fullName",
    "emailAddress",
    password,
    role,
    "isVerified",
    "isOnboarded",
    "isActive",
    "mustChangePassword",
    updated_at
  )
  VALUES (
    'QSphere Administrator',
    'admin@qsphere.com',
    encode(digest('ChangeMe123!', 'sha256'), 'hex'),
    'admin',
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    NOW()
  )
  ON CONFLICT ("emailAddress") DO UPDATE SET
    "fullName" = EXCLUDED."fullName",
    password = EXCLUDED.password,
    "isVerified" = FALSE,
    "isOnboarded" = TRUE,
    "isActive" = TRUE,
    "mustChangePassword" = TRUE,
    updated_at = NOW()
  WHERE LOWER(COALESCE(users.role, '')) = 'admin';
END
$$;
