const base62 = require('./base62');

describe('base62', () => {
  test('encode(0) returns the first alphabet character', () => {
    expect(base62.encode(0)).toBe('0');
  });

  test('encode/decode round-trips for a range of ids', () => {
    const ids = [1, 61, 62, 63, 12345, 999999999, 999999999999];
    for (const id of ids) {
      const code = base62.encode(id);
      expect(base62.decode(code).toString()).toBe(String(id));
    }
  });

  test('encoding is deterministic', () => {
    expect(base62.encode(123456)).toBe(base62.encode(123456));
  });

  test('different ids never produce the same code (no collisions)', () => {
    const seen = new Set();
    for (let i = 0; i < 5000; i++) {
      const code = base62.encode(i);
      expect(seen.has(code)).toBe(false);
      seen.add(code);
    }
  });

  test('decode throws on invalid characters', () => {
    expect(() => base62.decode('!!!')).toThrow();
  });
});
