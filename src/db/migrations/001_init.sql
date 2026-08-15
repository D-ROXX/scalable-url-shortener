-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- URLs table
-- id is a BIGSERIAL used as the numeric basis for the Base62 short code.
-- We derive the short_code from the id rather than generating a random string,
-- which guarantees no collisions and avoids a uniqueness-check round trip on write.
CREATE TABLE IF NOT EXISTS urls (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(16) UNIQUE NOT NULL,
    long_url TEXT NOT NULL,
    owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    custom_alias VARCHAR(64) UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_urls_owner_id ON urls(owner_id);
CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);

-- Click events table (write-heavy, kept separate from urls so hot writes
-- never lock/contend with the read-heavy urls table)
CREATE TABLE IF NOT EXISTS click_events (
    id BIGSERIAL PRIMARY KEY,
    url_id BIGINT NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address VARCHAR(64),
    referrer TEXT,
    user_agent TEXT,
    device_type VARCHAR(32),
    browser VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_click_events_url_id ON click_events(url_id);
CREATE INDEX IF NOT EXISTS idx_click_events_clicked_at ON click_events(clicked_at);
-- Composite index: the analytics endpoints filter by url_id and group/sort by time
CREATE INDEX IF NOT EXISTS idx_click_events_url_time ON click_events(url_id, clicked_at);
