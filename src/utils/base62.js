// Base62: [0-9a-zA-Z] -> 62 characters. We encode the URL's Postgres
// BIGSERIAL id rather than generating a random string.
//
// Why: a random string requires a uniqueness check (query + retry-on-collision)
// on every write. Encoding the auto-increment id is O(1), collision-free by
// construction, and reversible (decode short_code -> row id) without a lookup
// table. The tradeoff is that codes are sequential/guessable, which is fine
// for a URL shortener (not a security boundary) but would NOT be fine for,
// say, generating unguessable invite tokens.
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = ALPHABET.length;

function encode(num) {
  if (num === 0) return ALPHABET[0];
  let result = '';
  let n = BigInt(num);
  const base = BigInt(BASE);

  while (n > 0n) {
    const remainder = Number(n % base);
    result = ALPHABET[remainder] + result;
    n = n / base;
  }
  return result;
}

function decode(str) {
  let result = 0n;
  const base = BigInt(BASE);

  for (const char of str) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base62 character: ${char}`);
    }
    result = result * base + BigInt(index);
  }
  return result;
}

module.exports = { encode, decode };
