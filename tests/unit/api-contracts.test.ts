/**
 * API Contracts Tests
 */
import { describe, it, expect } from 'vitest';
import { parsePagination } from '@/lib/api/contracts';

describe('API Contracts', () => {
  describe('parsePagination', () => {
    it('should return defaults when no params provided', () => {
      const params = new URLSearchParams();
      const result = parsePagination(params);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(20);
    });

    it('should parse custom page and pageSize', () => {
      const params = new URLSearchParams({ page: '3', pageSize: '50' });
      const result = parsePagination(params);
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(50);
      expect(result.skip).toBe(100);
      expect(result.take).toBe(50);
    });

    it('should enforce minimum page of 1', () => {
      const params = new URLSearchParams({ page: '-5' });
      const result = parsePagination(params);
      expect(result.page).toBe(1);
    });

    it('should enforce maximum pageSize of 100', () => {
      const params = new URLSearchParams({ pageSize: '500' });
      const result = parsePagination(params);
      expect(result.pageSize).toBe(100);
    });

    it('should enforce minimum pageSize of 1', () => {
      const params = new URLSearchParams({ pageSize: '0' });
      const result = parsePagination(params);
      expect(result.pageSize).toBe(1);
    });

    it('should accept custom defaults', () => {
      const params = new URLSearchParams();
      const result = parsePagination(params, { page: 2, pageSize: 10 });
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(10);
      expect(result.skip).toBe(10);
    });
  });
});
