const sortUtils = require('../lib/utils/sort-utils');

describe('Sort utils', () => {
  describe('stringCompare() method', () => {
    it('should return expected comparison value', () => {
      expect(sortUtils.stringCompare('a', 'a')).toBe(0);
      expect(sortUtils.stringCompare('a', 'b')).toBe(-1);
      expect(sortUtils.stringCompare('b', 'a')).toBe(1);
    });
  });

  describe('sortedKeys() method', () => {
    it('should return an array of keys sorted alphabetically', () => {
      const result = sortUtils.sortedKeys({
        b: 'foo',
        a: 'bar',
      });

      expect(result).toEqual(['a', 'b']);
    });
  });

  describe('sortObjectByKeys() method', () => {
    it('should handle an undefined object', () => {
      const result = sortUtils.sortObjectByKeys();

      expect(result).toBeUndefined();
    });
  });
});
