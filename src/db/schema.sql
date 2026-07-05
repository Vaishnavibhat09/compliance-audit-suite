CREATE TABLE IF NOT EXISTS audits (
    id              TEXT PRIMARY KEY,
    target_url      TEXT NOT NULL,
    ai_provider     TEXT NOT NULL,
    ai_model        TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'queued',
    overall_score   REAL,
    error_message   TEXT,
    source_pdf_name TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS blueprint_sections (
    id            TEXT PRIMARY KEY,
    audit_id      TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    page_number   INTEGER NOT NULL,
    content       TEXT NOT NULL,
    buttons_json  TEXT NOT NULL DEFAULT '[]',
    forms_json    TEXT NOT NULL DEFAULT '[]',
    headers_json  TEXT NOT NULL DEFAULT '[]',
    cards_json    TEXT NOT NULL DEFAULT '[]',
    tabs_json     TEXT NOT NULL DEFAULT '[]',
    badges_json   TEXT NOT NULL DEFAULT '[]',
    charts_json   TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS page_findings (
    id                        TEXT PRIMARY KEY,
    audit_id                  TEXT NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    page_key                  TEXT NOT NULL,
    page_title                TEXT NOT NULL,
    matched_blueprint_title   TEXT,
    compliance_score          REAL NOT NULL,
    status                    TEXT NOT NULL,
    matched_json              TEXT NOT NULL DEFAULT '[]',
    missing_json              TEXT NOT NULL DEFAULT '[]',
    extra_json                TEXT NOT NULL DEFAULT '[]',
    issues_json               TEXT NOT NULL DEFAULT '[]',
    component_reconciliation_json TEXT NOT NULL DEFAULT '{}',
    summary                   TEXT NOT NULL DEFAULT '',
    screenshot_path           TEXT,
    created_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blueprint_sections_audit ON blueprint_sections(audit_id);
CREATE INDEX IF NOT EXISTS idx_page_findings_audit ON page_findings(audit_id);
