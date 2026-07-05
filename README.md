# Compliance Audit Suite

Point it at a live web application and that application's documentation PDF.
It reads every documented screen, walks the real application with a headless
browser, and produces a page-by-page compliance report: what's matched,
what's missing, and what showed up on screen that was never documented.

This is a ground-up reimplementation of an existing documentation/UI
compliance tool. It keeps the same end-user capability — "upload a PDF, give
me a URL, tell me where the product drifted from the docs" — but is built on
a completely different stack: a Node.js/TypeScript service with a relational
SQLite schema and a server-rendered dashboard, instead of a Python/Streamlit
script that shells out to subprocesses and writes loose JSON/HTML files to
disk.

---

## What it does

1. **Reads the documentation.** You upload a PDF user guide. The service
   extracts its text, splits it into titled sections, and tags each section
   with the UI details a technical writer tends to mention in prose — button
   names, table columns, form fields, badges, tabs, cards, and chart
   mentions.

2. **Inspects the live application.** A headless Chromium session (via
   Puppeteer) logs into the target app with the credentials you provide and
   visits every section in the sidebar — My Applications, Facilities, Action
   Items, User Management, Announcements, Settings, FAQs, Tickets, Contact —
   capturing a structured snapshot of each screen's headings, buttons,
   inputs, table headers, cards, badges, tabs and chart count, plus a
   full-page screenshot.

3. **Reconciles the two.** Each live screen is aligned to the documentation
   section that describes it (exact title match → substring match → fuzzy
   token match), then compared two ways:
   - A deterministic fuzzy-matching pass (custom Levenshtein/token-set
     similarity — no external fuzzy-matching library) that always runs and
     is used whenever the AI step is unavailable.
   - An LLM adjudication pass (Groq, OpenAI or Gemini — your choice) that
     reads the documentation excerpt and the structured screen snapshot and
     returns a compliance verdict with matched/missing/extra items and a
     list of specific discrepancies with severity ratings.

   The final score is always recomputed deterministically from the
   matched/missing/extra sets, so every report is reproducible even though
   the LLM's own phrasing can vary run to run.

4. **Reports it.** Every screen gets its own HTML report (score, matched
   items, missing items, undocumented extras, a discrepancy table, the
   captured screenshot, and per-component coverage). A dashboard page rolls
   every screen into one overall score, and the whole run can be downloaded
   as a single `.zip`.

Everything is persisted to a relational SQLite database (`audits`,
`blueprint_sections`, `page_findings`) rather than to a folder of loose JSON
files, so past runs, their scores, and their raw findings can be queried
directly.

---

## Architecture

```
compliance-audit-suite/
├── src/
│   ├── config/settings.ts            # env-driven configuration
│   ├── types/index.ts                # shared domain types
│   ├── utils/                        # logger, id generator, fs helpers
│   ├── db/
│   │   ├── schema.sql                # relational schema (SQLite)
│   │   ├── database.ts               # connection + migration
│   │   └── repositories/             # typed data access
│   ├── services/
│   │   ├── ingestion/                # PDF -> titled, feature-tagged sections
│   │   │   ├── pdfTextExtractor.ts
│   │   │   ├── blueprintSegmenter.ts
│   │   │   └── blueprintFeatureTagger.ts
│   │   ├── inspection/               # Puppeteer-driven live app crawl
│   │   │   ├── browserSession.ts
│   │   │   ├── siteAuthenticator.ts
│   │   │   ├── siteNavigator.ts
│   │   │   └── surfaceScanner.ts
│   │   ├── alignment/                # matching documentation <-> live UI
│   │   │   ├── similarityKit.ts      # custom string-similarity primitives
│   │   │   ├── synonymRegistry.ts
│   │   │   ├── pageAligner.ts
│   │   │   ├── itemListBuilder.ts
│   │   │   ├── elementReconciler.ts
│   │   │   ├── componentReconciler.ts
│   │   │   └── sectionExcerptExtractor.ts
│   │   ├── adjudication/             # LLM verdict + deterministic scoring
│   │   │   ├── verdictPromptFactory.ts
│   │   │   ├── llmGateway.ts         # Groq / OpenAI / Gemini over plain fetch
│   │   │   ├── verdictSanitizer.ts
│   │   │   └── verdictScorer.ts
│   │   ├── reporting/                # HTML report + dashboard + zip bundle
│   │   │   ├── coverageAggregator.ts
│   │   │   ├── pageReportRenderer.ts
│   │   │   ├── dashboardRenderer.ts
│   │   │   └── bundleArchiver.ts
│   │   └── pipeline/
│   │       └── auditOrchestrator.ts  # wires every stage together
│   ├── controllers/                  # Express request handlers
│   ├── routes/                       # Express routers (API + views)
│   └── server.ts                     # app entry point
├── views/                            # EJS templates (upload form, results, reports)
├── public/                           # static CSS/JS for the app shell
├── storage/                          # runtime data: uploads, screenshots, reports, db
├── tests/                            # vitest unit tests
├── package.json
├── tsconfig.json
└── .env.example
```

### Database design

```
audits
  id (PK) · target_url · ai_provider · ai_model · status
  overall_score · error_message · source_pdf_name
  created_at · completed_at

blueprint_sections
  id (PK) · audit_id (FK -> audits.id) · title · page_number · content
  buttons_json · forms_json · headers_json · cards_json
  tabs_json · badges_json · charts_json

page_findings
  id (PK) · audit_id (FK -> audits.id) · page_key · page_title
  matched_blueprint_title · compliance_score · status
  matched_json · missing_json · extra_json · issues_json
  component_reconciliation_json · summary · screenshot_path · created_at
```

One audit run produces one `audits` row, N `blueprint_sections` rows (one
per documented topic), and N `page_findings` rows (one per live screen that
was inspected). SQLite is used via `better-sqlite3` (synchronous, no
connection-pool overhead, single file — appropriate for a tool that runs one
audit pipeline at a time).

### API

| Method | Path                                       | Purpose                                   |
|--------|---------------------------------------------|--------------------------------------------|
| POST   | `/api/audits`                              | Start a new audit (multipart: PDF + form fields) |
| GET    | `/api/audits`                              | List recent audits                        |
| GET    | `/api/audits/:id`                          | Poll status of one audit                  |
| GET    | `/api/audits/:id/pages`                    | List page-level findings for an audit     |
| GET    | `/api/audits/:id/pages/:pageKey/report`    | Raw HTML report for one screen            |
| GET    | `/api/audits/:id/dashboard-report`         | Raw HTML dashboard for the whole audit    |
| GET    | `/api/audits/:id/bundle`                   | Download every report as a `.zip`         |

| Method | Path             | Purpose                                     |
|--------|-------------------|---------------------------------------------|
| GET    | `/`              | Upload form + recent audit history           |
| GET    | `/audits/:id`    | Progress stepper + results dashboard (polls the API above) |

### Tech stack

- **Runtime:** Node.js 18+, TypeScript (strict mode)
- **Web framework:** Express
- **Database:** SQLite via `better-sqlite3`
- **Browser automation:** Puppeteer (Chromium)
- **PDF parsing:** `pdf-parse`
- **Templating:** EJS (server-rendered upload form, results page, and
  generated reports)
- **Archiving:** `archiver` (zip bundles)
- **Testing:** Vitest
- **Frontend:** vanilla HTML/CSS/JS (no framework, no build step) — the
  results page polls the JSON API and renders cards/iframes client-side

No `rapidfuzz`, no Playwright, no Streamlit, no Groq/OpenAI/Gemini SDKs —
string similarity is a small custom module and every LLM provider is called
directly over `fetch` against its plain REST endpoint.

---

## Setup

### Prerequisites

- Node.js 18.17 or later
- npm
- ~300 MB free disk space (Puppeteer downloads its own Chromium build on
  install)

### Install

```bash
git clone <this-repository>
cd compliance-audit-suite
npm install
cp .env.example .env
```

Edit `.env` to set:

- `DEFAULT_TARGET_URL`, `DEFAULT_LOGIN_EMAIL`, `DEFAULT_LOGIN_PASSWORD` —
  pre-fills the audit form; can always be overridden per run.
- `DEFAULT_AI_PROVIDER` / `DEFAULT_AI_MODEL` — which LLM to use by default
  (`groq`, `openai`, or `gemini`).
- `GROQ_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` — optional; if set,
  the API key field in the UI can be left blank. Otherwise you'll be
  prompted to paste a key in on every run.
- `HEADLESS_BROWSER` — set to `false` if you want to watch the crawl happen
  in a real browser window while debugging.

### Run in development

```bash
npm run dev
```

This starts the server with `tsx watch`, restarting on file changes, at
`http://localhost:4000` (or whatever `PORT` you set).

### Run in production

```bash
npm run build
npm start
```

`npm run build` compiles TypeScript to `dist/`; `npm start` runs the
compiled server.

### Run the test suite

```bash
npm test
```

Unit tests cover the string-similarity toolkit, the PDF section segmenter,
the LLM verdict sanitizer, the component reconciler, and the deterministic
scoring formula — the pieces of the pipeline that don't require a live
browser or a real LLM key to verify.

---

## Using it

1. Open `http://localhost:4000`.
2. Upload the product's documentation PDF.
3. Enter the target application's URL and login credentials.
4. Pick an AI provider and model, and paste an API key (or leave it blank if
   you configured one in `.env`).
5. Click **Run compliance audit**. You'll be redirected to a progress page
   that automatically updates through four stages: reading the blueprint,
   inspecting the live surface, reconciling, and completed.
6. Once complete, you'll see a card per screen with its compliance score,
   matched/missing/extra counts, an inline expandable report, and buttons to
   open the full dashboard report or download every report as a single zip
   archive.

---

## Notes on the navigation map

The crawler looks for sidebar links using `data-testid` attributes
(`nav-my-applications`, `nav-facilities`, etc. — see
`src/services/inspection/siteNavigator.ts`). If you're pointing this at an
application with different markup, update `NAVIGATION_MAP` in that file to
match your app's actual selectors.
