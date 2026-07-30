import { describe, it, expect } from 'vitest';
import { taskSchema } from './taskValidation';

describe('taskValidation schema', () => {
  const validData = {
    title: 'Valid Task Title',
    description: 'This is a valid task description.',
    tokenAddress: 'GBVVRXLMNCJTIGXBP2K3C6KHK6BOMW2G5B2ZNYAQUV4K3QY4K6SDBPQD',
    reward: 100,
    deadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    maxSubmissions: 5,
  };

  it('should pass with valid data (happy path)', () => {
    const result = taskSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject when reward is zero or negative', () => {
    const invalidZero = { ...validData, reward: 0 };
    const invalidNegative = { ...validData, reward: -50 };

    const resultZero = taskSchema.safeParse(invalidZero);
    const resultNegative = taskSchema.safeParse(invalidNegative);

    expect(resultZero.success).toBe(false);
    expect(resultNegative.success).toBe(false);
  });

  it('should reject when deadline is in the past or present', () => {
    const invalidPast = {
      ...validData,
      deadline: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    };

    const invalidPresent = {
      ...validData,
      deadline: new Date(Date.now() - 1000).toISOString(), // Just a second ago
    };

    expect(taskSchema.safeParse(invalidPast).success).toBe(false);
    expect(taskSchema.safeParse(invalidPresent).success).toBe(false);
  });

  it('should reject when required fields are missing', () => {
    const invalidData = {
      title: 'Valid Task Title',
      // missing description and others
    };

    const result = taskSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(e => e.path.includes('description'))).toBe(true);
      expect(result.error.issues.some(e => e.path.includes('tokenAddress'))).toBe(true);
    }
  });
});
