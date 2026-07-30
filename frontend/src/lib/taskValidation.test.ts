import { describe, it, expect } from 'vitest';
import { taskSchema } from './taskValidation';
import {
  INVALID_TASK_SCHEMA_NEGATIVE_REWARD,
  INVALID_TASK_SCHEMA_PAST_DEADLINE,
  INVALID_TASK_SCHEMA_PRESENT_DEADLINE,
  INVALID_TASK_SCHEMA_ZERO_REWARD,
  VALID_TASK_SCHEMA_DATA,
} from '@/test/mock-data';
import { futureDateIso, pastDateIso } from '@/test/fixtures';

describe('taskValidation schema', () => {
  const validData = VALID_TASK_SCHEMA_DATA;

  it('should pass with valid data (happy path)', () => {
    const result = taskSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject when reward is zero or negative', () => {
    const resultZero = taskSchema.safeParse(INVALID_TASK_SCHEMA_ZERO_REWARD);
    const resultNegative = taskSchema.safeParse(INVALID_TASK_SCHEMA_NEGATIVE_REWARD);

    expect(resultZero.success).toBe(false);
    expect(resultNegative.success).toBe(false);
  });

  it('should reject when deadline is in the past or present', () => {
    const invalidPast = {
      ...validData,
      deadline: pastDateIso(), // Yesterday
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
