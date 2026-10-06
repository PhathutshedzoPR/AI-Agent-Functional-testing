import { describe, expect, it } from 'vitest';
import {
  AppError,
  BrowserError,
  DomainError,
  LlmError,
  NotFoundError,
  RateLimitError,
  TargetBlockedError,
  ValidationError,
} from '@/core/errors';

describe('error hierarchy', () => {
  it.each([
    [new DomainError('bad'), 'DOMAIN_INVALID', 'DomainError'],
    [new ValidationError('bad'), 'VALIDATION_FAILED', 'ValidationError'],
    [new TargetBlockedError('private address'), 'TARGET_BLOCKED', 'TargetBlockedError'],
    [new LlmError('down'), 'LLM_FAILED', 'LlmError'],
    [new BrowserError('timeout', 'slow'), 'BROWSER_FAILED', 'BrowserError'],
    [new NotFoundError('Run'), 'NOT_FOUND', 'NotFoundError'],
    [new RateLimitError(30), 'RATE_LIMITED', 'RateLimitError'],
  ])('%s has a stable code and its own name', (error, code, name) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe(code);
    expect(error.name).toBe(name);
  });

  it('writes messages that are safe to show', () => {
    expect(new TargetBlockedError('private address').message).toBe(
      'That address is not allowed: private address.',
    );
    expect(new NotFoundError('Run').message).toBe('Run was not found.');
    expect(new RateLimitError(30).message).toContain('30 seconds');
  });

  it('keeps details, issues and causes', () => {
    const cause = new Error('socket hang up');

    expect(new DomainError('bad', ['a: b']).details).toEqual(['a: b']);
    expect(
      new ValidationError('bad', [{ path: 'url', message: 'Invalid URL' }]).issues,
    ).toHaveLength(1);
    expect(new LlmError('down', { retryable: true, cause }).cause).toBe(cause);
  });

  it('marks LLM errors as not retryable unless told otherwise', () => {
    expect(new LlmError('bad schema').retryable).toBe(false);
    expect(new LlmError('429', { retryable: true }).retryable).toBe(true);
  });

  it('lets self-healing act only on locator problems', () => {
    expect(new BrowserError('not-found', 'x').isLocatorProblem).toBe(true);
    expect(new BrowserError('ambiguous', 'x').isLocatorProblem).toBe(true);
    expect(new BrowserError('timeout', 'x').isLocatorProblem).toBe(false);
    expect(new BrowserError('blocked', 'x').isLocatorProblem).toBe(false);
  });
});
