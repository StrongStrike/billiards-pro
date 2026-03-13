import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const HASH_PREFIX = "pbkdf2_sha256";
const PBKDF2_ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST);
  return `${HASH_PREFIX}:${PBKDF2_ITERATIONS}:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [prefix, iterationValue, saltValue, hashValue] = storedHash.split(":");
  if (prefix !== HASH_PREFIX || !iterationValue || !saltValue || !hashValue) {
    return false;
  }

  const iterations = Number(iterationValue);
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expected = Buffer.from(hashValue, "base64url");
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, DIGEST);

  return timingSafeEqual(actual, expected);
}
