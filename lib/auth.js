const crypto = require("node:crypto");

const SCRYPT_KEYLEN = 64;

function createSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function scryptAsync(value, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(value, salt, SCRYPT_KEYLEN, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey.toString("hex"));
    });
  });
}

async function hashPassword(password) {
  const salt = createSalt();
  const hash = await scryptAsync(password, salt);
  return `${salt}:${hash}`;
}

async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, originalHash] = storedHash.split(":");
  const derivedHash = await scryptAsync(password, salt);
  const originalBuffer = Buffer.from(originalHash, "hex");
  const derivedBuffer = Buffer.from(derivedHash, "hex");

  if (originalBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(originalBuffer, derivedBuffer);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function generateCardId() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

module.exports = {
  generateCardId,
  generateOtp,
  generateSessionToken,
  hashPassword,
  verifyPassword
};
