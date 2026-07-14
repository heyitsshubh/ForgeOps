import { describe, it, expect } from 'vitest';
import { CacheService } from '../cache/cache-service.js';

/**
 * Unit tests for CacheService.generateKey()
 *
 * We test only the pure, synchronous parts of CacheService here.
 * The Redis-dependent methods (get/set/invalidate) require an integration
 * test setup with a real or mocked Redis client, which is covered separately.
 */
describe('CacheService', () => {
  describe('generateKey()', () => {
    it('should prefix the key with the forgeops namespace', () => {
      const key = CacheService.generateKey('issues', 'list');
      expect(key).toMatch(/^forgeops:/);
    });

    it('should join all parts with colons', () => {
      const key = CacheService.generateKey('issues', 'list', 'owner', 'repo', '10');
      expect(key).toBe('forgeops:issues:list:owner:repo:10');
    });

    it('should produce unique keys for different domains', () => {
      const issueKey = CacheService.generateKey('issues', 'list', 'o', 'r');
      const prKey = CacheService.generateKey('prs', 'list', 'o', 'r');
      expect(issueKey).not.toBe(prKey);
    });

    it('should produce unique keys for different owners', () => {
      const keyA = CacheService.generateKey('issues', 'list', 'ownerA', 'repo');
      const keyB = CacheService.generateKey('issues', 'list', 'ownerB', 'repo');
      expect(keyA).not.toBe(keyB);
    });

    it('should produce unique keys for different repos', () => {
      const keyA = CacheService.generateKey('issues', 'list', 'owner', 'repoA');
      const keyB = CacheService.generateKey('issues', 'list', 'owner', 'repoB');
      expect(keyA).not.toBe(keyB);
    });

    it('should handle a single domain with no extra parts', () => {
      const key = CacheService.generateKey('health');
      expect(key).toBe('forgeops:health');
    });
  });
});
