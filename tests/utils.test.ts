import { describe, it, expect } from '@jest/globals';
import { generateRandomString, isValidEmail, isStrongPassword } from '../src/utils/helpers.js';

describe('Utility Functions', () => {
  describe('generateRandomString', () => {
    it('should generate a string of specified length', () => {
      const length = 10;
      const result = generateRandomString(length);
      expect(result).toHaveLength(length);
    });

    it('should generate different strings on multiple calls', () => {
      const str1 = generateRandomString(10);
      const str2 = generateRandomString(10);
      expect(str1).not.toBe(str2);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.org')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('test..test@example.com')).toBe(false);
    });
  });

  describe('isStrongPassword', () => {
    it('should return true for strong passwords', () => {
      expect(isStrongPassword('Password123!')).toBe(true);
      expect(isStrongPassword('MyStr0ng@Pass')).toBe(true);
    });

    it('should return false for weak passwords', () => {
      expect(isStrongPassword('password')).toBe(false); // No uppercase, number, special char
      expect(isStrongPassword('PASSWORD')).toBe(false); // No lowercase, number, special char
      expect(isStrongPassword('Password')).toBe(false); // No number, special char
      expect(isStrongPassword('Pass1!')).toBe(false); // Too short
    });
  });
});