-- AddTable: AIInsight
-- Stores LLM-generated narrative insights with staleness tracking.
-- One active row is kept per store; older rows are retained for audit.

CREATE TABLE "AIInsight" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "narrative"   TEXT NOT NULL,
    "modelUsed"   TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "inputHash"   TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stale"       BOOLEAN NOT NULL DEFAULT false
);
