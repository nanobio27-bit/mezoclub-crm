BEGIN;

CREATE TABLE kpi_targets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    metric VARCHAR(50) NOT NULL,
    target_value DECIMAL(12,2) NOT NULL,
    period VARCHAR(20) DEFAULT 'monthly',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_kpi_targets_user_metric ON kpi_targets(user_id, metric, period);

CREATE TABLE kpi_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    count INTEGER DEFAULT 1,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_kpi_records_user_date ON kpi_records(user_id, date DESC);
CREATE INDEX idx_kpi_records_user_type ON kpi_records(user_id, type, date);

COMMIT;
