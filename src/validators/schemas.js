const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createUrlSchema = z.object({
  longUrl: z.string().url(),
  customAlias: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{3,32}$/)
    .optional(),
  expiresAt: z.string().datetime().optional(),
});

module.exports = { registerSchema, loginSchema, createUrlSchema };
