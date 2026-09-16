-- Persist the last consumed TOTP counter per platform administrator so a
-- captured authenticator code cannot be replayed within its validity window.
ALTER TABLE "PlatformAdmin" ADD COLUMN "lastUsedTotpCounter" INTEGER;
