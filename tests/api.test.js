// ============================================================
// API ROUTE TESTS
// ============================================================
//
// These tests mock the service/repository layer.
// They do NOT touch your real Neon PostgreSQL database or
// production Redis.
//
// ============================================================

// Mock Redis so the rate limiter does not require a real Redis
// connection during tests.
jest.mock('../src/config/redis', () => {
  const pipeline = {
    zremrangebyscore: jest.fn(),
    zadd: jest.fn(),
    zcard: jest.fn(),
    pexpire: jest.fn(),

    exec: jest.fn().mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 1],
      [null, 1],
    ]),
  };

  return {
    pipeline: jest.fn(() => pipeline),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    disconnect: jest.fn(),
  };
});

// ============================================================
// MOCK SERVICES
// ============================================================

jest.mock('../src/services/authService', () => ({
  register: jest.fn(),
  login: jest.fn(),
  refreshAccessToken: jest.fn(),
}));

jest.mock('../src/services/urlService', () => ({
  createShortUrl: jest.fn(),
  listUrlsForOwner: jest.fn(),
  deleteUrl: jest.fn(),
  resolveUrl: jest.fn(),
  getUrlOwnedBy: jest.fn(),
}));

jest.mock('../src/services/analyticsService', () => ({
  getSummary: jest.fn(),
  recordClickAsync: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');

const authService = require('../src/services/authService');
const urlService = require('../src/services/urlService');
const analyticsService = require('../src/services/analyticsService');

// ============================================================
// TEST DATA
// ============================================================

const TEST_SECRET = 'test-access-secret';

process.env.JWT_ACCESS_SECRET = TEST_SECRET;
process.env.JWT_ACCESS_EXPIRY = '15m';

function createAccessToken(user = {}) {
  return jwt.sign(
    {
      sub: user.id || 1,
      role: user.role || 'user',
    },
    TEST_SECRET,
    {
      expiresIn: '15m',
    }
  );
}

// ============================================================
// AUTH TESTS
// ============================================================

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/auth/register returns 201 on success', async () => {
    authService.register.mockResolvedValue({
      user: {
        id: 1,
        email: 'test@example.com',
        role: 'user',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBe(
      'access-token'
    );

    expect(authService.register).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  test('POST /api/auth/login returns 200 on success', async () => {
    authService.login.mockResolvedValue({
      user: {
        id: 1,
        email: 'test@example.com',
        role: 'user',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(
      'test@example.com'
    );
  });

  test('POST /api/auth/login rejects invalid email format', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'not-an-email',
        password: 'password123',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    expect(authService.login).not.toHaveBeenCalled();
  });

  test('POST /api/auth/register rejects short password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: '123',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    expect(authService.register).not.toHaveBeenCalled();
  });

  test('POST /api/auth/refresh returns new access token', async () => {
    authService.refreshAccessToken.mockReturnValue(
      'new-access-token'
    );

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'valid-refresh-token',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBe(
      'new-access-token'
    );
  });
});

// ============================================================
// URL API TESTS
// ============================================================

describe('URL API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/urls requires authentication', async () => {
    const response = await request(app)
      .post('/api/urls')
      .send({
        longUrl: 'https://example.com',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);

    expect(urlService.createShortUrl).not.toHaveBeenCalled();
  });

  test('POST /api/urls rejects invalid URL', async () => {
    const token = createAccessToken({
      id: 1,
      role: 'user',
    });

    const response = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({
        longUrl: 'javascript:alert(1)',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    expect(urlService.createShortUrl).not.toHaveBeenCalled();
  });

  test('POST /api/urls creates a short URL', async () => {
    const token = createAccessToken({
      id: 1,
      role: 'user',
    });

    urlService.createShortUrl.mockResolvedValue({
      id: 10,
      short_code: 'a',
      custom_alias: null,
      long_url: 'https://example.com',
      created_at: '2026-08-11T00:00:00.000Z',
    });

    const response = await request(app)
      .post('/api/urls')
      .set('Authorization', `Bearer ${token}`)
      .send({
        longUrl: 'https://example.com',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.shortCode).toBe('a');

    expect(urlService.createShortUrl).toHaveBeenCalledWith({
      longUrl: 'https://example.com',
      customAlias: undefined,
      expiresAt: undefined,
      ownerId: 1,
    });
  });

  test('GET /api/urls requires authentication', async () => {
    const response = await request(app)
      .get('/api/urls');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('GET /api/urls returns user URLs', async () => {
    const token = createAccessToken({
      id: 1,
      role: 'user',
    });

    urlService.listUrlsForOwner.mockResolvedValue([
      {
        id: 1,
        short_code: '1',
        long_url: 'https://example.com',
      },
    ]);

    const response = await request(app)
      .get('/api/urls')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
  });

  test('DELETE /api/urls/:id requires authentication', async () => {
    const response = await request(app)
      .delete('/api/urls/1');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

// ============================================================
// ANALYTICS API TESTS
// ============================================================

describe('Analytics API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/analytics/:id requires authentication', async () => {
    const response = await request(app)
      .get('/api/analytics/1');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('GET /api/analytics/:id returns analytics for owner', async () => {
    const token = createAccessToken({
      id: 1,
      role: 'user',
    });

    urlService.getUrlOwnedBy.mockResolvedValue({
      id: 1,
      owner_id: 1,
    });

    analyticsService.getSummary.mockResolvedValue({
      totalClicks: 10,
      dailyClicks: [],
      topReferrers: [],
      topDevices: [],
    });

    const response = await request(app)
      .get('/api/analytics/1')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalClicks).toBe(10);
  });
});

// ============================================================
// REDIRECT TESTS
// ============================================================

describe('Redirect API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /:shortCode redirects to the original URL', async () => {
    urlService.resolveUrl.mockResolvedValue({
      id: 1,
      short_code: 'abc',
      long_url: 'https://example.com',
      is_active: true,
    });

    const response = await request(app)
      .get('/abc')
      .redirects(0);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(
      'https://example.com'
    );

    expect(
      analyticsService.recordClickAsync
    ).toHaveBeenCalledWith(
      expect.anything(),
      1
    );
  });
});

// ============================================================
// HEALTH CHECK
// ============================================================

describe('Health Check', () => {
  test('GET /health returns 200', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('ok');
  });
});

// ============================================================
// UNKNOWN ROUTE
// ============================================================

describe('404 Handling', () => {
  test('unknown API route returns 404', async () => {
    const response = await request(app)
      .get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});