const base62 = require('../src/utils/base62');

describe('Base62 Utility', () => {
  test('encodes zero correctly', () => {
    expect(base62.encode(0)).toBe('0');
  });

  test('encodes positive numbers', () => {
    expect(base62.encode(1)).toBe('1');
    expect(base62.encode(10)).toBe('a');
    expect(base62.encode(61)).toBe('Z');
    expect(base62.encode(62)).toBe('10');
  });

  test('encode and decode are reversible', () => {
    const values = [
      1,
      2,
      10,
      61,
      62,
      100,
      1000,
      999999,
      10000000,
    ];

    for (const value of values) {
      const encoded = base62.encode(value);
      const decoded = base62.decode(encoded);

      expect(decoded).toBe(BigInt(value));
    }
  });

  test('supports BigInt values', () => {
    const value = 9223372036854775807n;

    const encoded = base62.encode(value);
    const decoded = base62.decode(encoded);

    expect(decoded).toBe(value);
  });

  test('rejects invalid Base62 characters', () => {
    expect(() => base62.decode('abc!')).toThrow(
      'Invalid Base62 character: !'
    );
  });

  test('encoded values contain only Base62 characters', () => {
    const values = [1, 10, 62, 9999, 123456789];

    for (const value of values) {
      const encoded = base62.encode(value);

      expect(encoded).toMatch(/^[0-9a-zA-Z]+$/);
    }
  });
});