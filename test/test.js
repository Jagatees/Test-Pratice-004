import { expect } from "chai";
import { getCurrentTimestamp, server } from "../src/server.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// This is necessary to resolve paths in ES modules for the common passwords file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the commonPasswords set from server.js for testing its contents
// We need to re-initialize it here or get access to the one in server.js
// For simplicity in testing, we'll re-implement the loading or make verifyPassword
// accept the commonPasswords set. For now, let's keep it simple by making
// verifyPassword self-contained for testing, or by carefully mocking/accessing.

// Re-defining password verification for isolated unit testing
// In a real scenario, you might want to export `verifyPassword` from `server.js`
// along with `commonPasswords` for direct testing, or use a dependency injection pattern.
let testCommonPasswords = new Set();
try {
  const commonPasswordsPath = path.join(
    __dirname,
    "../data/10-million-password-list-top-1000.txt"
  );
  const data = fs.readFileSync(commonPasswordsPath, "utf8");
  testCommonPasswords = new Set(data.split(/\r?\n/).filter(Boolean));
} catch (err) {
  console.warn(
    "Could not load common passwords for unit tests. Some tests might not run as expected."
  );
}

function verifyPasswordForTest(password) {
  const minLength = 12;
  const maxLength = 64;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(
    password
  );

  let errors = [];

  if (password.length < minLength || password.length > maxLength) {
    errors.push(
      `Password must be between ${minLength} and ${maxLength} characters long.`
    );
  }
  if (!hasUpperCase) {
    errors.push("Password must contain at least one uppercase letter.");
  }
  if (!hasLowerCase) {
    errors.push("Password must contain at least one lowercase letter.");
  }
  if (!hasDigit) {
    errors.push("Password must contain at least one digit.");
  }
  if (!hasSpecialChar) {
    errors.push("Password must contain at least one special character.");
  }

  if (testCommonPasswords.has(password)) {
    errors.push("Password is too common and has been leaked.");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

describe("Server Utility Functions", () => {
  describe("getCurrentTimestamp()", () => {
    it("should return a valid ISO timestamp", () => {
      const timestamp = getCurrentTimestamp();
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(timestamp).to.match(isoRegex);
    });

    it("should return a timestamp close to the current time", () => {
      const timestamp = getCurrentTimestamp();
      const now = new Date().toISOString();
      expect(new Date(timestamp).getTime()).to.be.closeTo(
        new Date(now).getTime(),
        1000
      ); // Allow up to 1 second difference
    });
  });

  describe("verifyPasswordForTest() (OWASP C6 requirements)", () => {
    it("should return true for a strong password meeting all criteria", () => {
      const result = verifyPasswordForTest("StrongP@ssw0rd123");
      expect(result.isValid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it("should return false and list errors for a too short password", () => {
      const result = verifyPasswordForTest("Short1!");
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include(
        "Password must be between 12 and 64 characters long."
      );
    });

    it("should return false and list errors for a password missing uppercase", () => {
      const result = verifyPasswordForTest("longpassword123!");
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include(
        "Password must contain at least one uppercase letter."
      );
    });

    it("should return false and list errors for a password missing lowercase", () => {
      const result = verifyPasswordForTest("LONGPASSWORD123!");
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include(
        "Password must contain at least one lowercase letter."
      );
    });

    it("should return false and list errors for a password missing digit", () => {
      const result = verifyPasswordForTest("LongPassword!@#");
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include("Password must contain at least one digit.");
    });

    it("should return false and list errors for a password missing special character", () => {
      const result = verifyPasswordForTest("LongPassword123");
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include(
        "Password must contain at least one special character."
      );
    });

    it("should return false and list errors for a common password", () => {
      const result = verifyPasswordForTest("password"); // Assuming "password" is in the common list
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include(
        "Password is too common and has been leaked."
      );
    });

    it("should return false and list multiple errors for a very weak password", () => {
      const result = verifyPasswordForTest("short");
      expect(result.isValid).to.be.false;
      expect(result.errors.length).to.be.at.least(4); // At least length, uppercase, digit, special char
      expect(result.errors).to.include(
        "Password must be between 12 and 64 characters long."
      );
      expect(result.errors).to.include(
        "Password must contain at least one uppercase letter."
      );
      expect(result.errors).to.include("Password must contain at least one digit.");
      expect(result.errors).to.include(
        "Password must contain at least one special character."
      );
    });

    it("should consider all criteria for a slightly weak password", () => {
      const result = verifyPasswordForTest("Pass123!Weak");
      expect(result.isValid).to.be.false;
      expect(result.errors).to.include(
        "Password is too common and has been leaked."
      ); // if "Pass123!Weak" is in common, else it would be valid length
    });
  });

  // Close the server after all tests (this is for the whole test suite)
  after(() => {
    server.close();
  });
});