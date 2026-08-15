const { z } = require('zod');

// ============================================================
// URL VALIDATION
// ============================================================

const httpUrl = z
  .string()
  .trim()
  .url('Must be a valid URL')
  .refine(
    (value) => {
      try {
        const parsed = new URL(value);

        return (
          parsed.protocol === 'http:' ||
          parsed.protocol === 'https:'
        );
      } catch {
        return false;
      }
    },
    {
      message:
        'Only HTTP and HTTPS URLs are allowed',
    }
  );

// ============================================================
// AUTH
// ============================================================

const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Must be a valid email address'),

  password: z
    .string()
    .min(
      8,
      'Password must be at least 8 characters'
    ),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Must be a valid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
});

// ============================================================
// CREATE SHORT URL
// ============================================================

const createUrlSchema = z.object({
  longUrl: httpUrl,

  customAlias: z
    .string()
    .trim()
    .regex(
      /^[a-zA-Z0-9_-]{3,32}$/,
      'Custom alias must be 3-32 characters and contain only letters, numbers, underscores, or hyphens'
    )
    .optional(),

  expiresAt: z
    .string()
    .datetime({
      offset: true,
    })
    .optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  createUrlSchema,
};