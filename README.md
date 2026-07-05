# Compliance Audit Suite


Compliance Audit Suite is a web application that compares a website with the requirements provided in a PDF document. It extracts the requirements, analyzes the website page by page, and generates a compliance report with matching results and an overall compliance score.

## Features

- Upload requirement PDF
- Analyze any website URL
- Extract requirements automatically
- Page-wise compliance analysis
- Overall compliance score
- Downloadable compliance report

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, EJS
- **Backend:** Node.js, Express.js, TypeScript

## Project Structure

```
compliance-audit-suite
├── public/
├── src/
├── storage/
├── tests/
├── views/
├── package.json
└── README.md
```

## Getting Started

```bash
git clone https://github.com/Vaishnavibhat09/compliance-audit-suite.git
cd compliance-audit-suite
npm install
npm run dev
```

> Create a `.env` file using `.env.example` before running the project.

## Future Improvements

- User authentication
- Dashboard analytics
- AI-based suggestions
- Cloud deployment

## Author

**Vaishnavi Bhat**

GitHub: https://github.com/Vaishnavibhat09

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
