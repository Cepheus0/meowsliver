# Product Intelligence, Metrics, Dashboard, and DB Insight Plan

## Objective

Define the deterministic intelligence layer Meowsliver needs before AI can be genuinely useful.

This document covers:

- which features should exist
- which metrics APIs must be added
- how the dashboard should evolve
- what insight can already be extracted from the current PostgreSQL schema
- what the current product still cannot know yet

## Product Thesis

Meowsliver should evolve from:

- imported transaction dashboard

into:

- a personal finance operating system that can explain behavior, detect risk, and guide action

AI should sit on top of this intelligence layer, not replace it.

## Current Surface Assessment

| Surface | Current strength | Main gap | Opportunity |
|---|---|---|---|
| Dashboard | Strong transaction-centric overview | No semantic insight layer | Best place for proactive AI |
| Transactions | Strong filtering and monthly detail | No anomaly and pattern explanation | Best place for "why" and "what changed" |
| Reports | Strong visual trend views | No executive narrative | Best place for strategic summaries |
| Import | Strong review mechanics | No import quality intelligence | Best place for trust and data hygiene insights |
| Accounts | Strong reconciliation explainability | Limited account health intelligence | Best place for balance confidence and coverage alerts |
| Savings goals | Strong progress tracking | No goal risk or recommendation engine | Best place for planning guidance |
| Investments | Attractive shell | Missing real holdings model | Best place for future portfolio intelligence |

## What the Current Schema Can Already Tell Us

## `transactions`

### Available signals

- total income / expense / transfer by date, month, year
- category concentration
- pay-from usage
- recipient concentration
- first-seen and repeat merchant patterns
- spend volatility
- trend acceleration and deceleration
- highest-spend day / month / year
- recurring-expense candidates using date + amount + recipient heuristics

### Immediate insight opportunities

- "วันนี้ใช้จ่ายสูงสุดในรอบ 5 ปี"
- "หมวดอาหารเพิ่มขึ้น 37% จากค่าเฉลี่ย 90 วัน"
- "Merchant นี้เพิ่งเกิดครั้งแรกในชุดข้อมูล"
- "สัดส่วนค่าใช้จ่ายกระจุกใน 3 หมวดหลักมากกว่าปกติ"

## `import_runs`

### Available signals

- import frequency
- source filename patterns
- new/duplicate/conflict/skipped rates
- operational history of data quality

### Immediate insight opportunities

- "ไฟล์ล่าสุดมี conflict rate สูงกว่าค่าเฉลี่ยการนำเข้าก่อนหน้า"
- "mapping ปัจจุบันทำให้ skipped rows สูงผิดปกติ"
- "ช่วงนี้นำเข้าข้อมูลถี่ขึ้นหรือลดลง"

## `import_run_rows`

### Available signals

- row-level skip reasons
- rows requiring review
- duplicates vs conflicts
- confidence around import quality

### Immediate insight opportunities

- top skip reasons by count
- repeated conflict patterns by category or recipient
- rows that repeatedly collide against near-duplicate fingerprints

## `accounts`

### Available signals

- current balances
- active vs archived accounts
- default account coverage
- type distribution
- alias quality for auto-matching

### Immediate insight opportunities

- accounts with no linked transactions
- accounts with drift from linked transaction ledger
- account types overrepresented in liabilities
- pay-from strings not matching any account alias

## `savings_goals`

### Available signals

- goal count and types
- target dates
- target sizes
- archived vs active state

### Immediate insight opportunities

- goals with deadlines but no viable pace
- concentration of savings ambition in one goal
- goals with missing strategy metadata

## `savings_goal_entries`

### Available signals

- contribution pace
- growth contribution vs cash contribution
- withdrawal frequency
- trajectory consistency

### Immediate insight opportunities

- goals stalling in recent periods
- goals relying too much on growth vs cash input
- goals with withdrawal behavior indicating instability

## What the Current Schema Cannot Yet Tell Reliably

| Domain | Limitation | Why it matters |
|---|---|---|
| Net worth history | Opening balances are implicit, not ledger-native | Longitudinal balance truth is limited |
| Real investment performance | No holdings, cost basis history, or market snapshots | Investment advice would be incomplete |
| Liability schedules | No due dates, APR, minimum payments, amortization | Debt planning is weak |
| Goal funding provenance | Savings goals are not linked to transaction rows | Cannot prove where contributions came from |
| Household planning | No spouse/family/shared goal model | Marriage and family planning remains partial |

## Metrics Roadmap

## Metric Group 1: Core cashflow

| Metric | Description | Source |
|---|---|---|
| `income_total_period` | total income over selected period | transactions |
| `expense_total_period` | total expense over selected period | transactions |
| `net_cashflow_period` | income minus expense | transactions |
| `savings_rate_period` | net divided by income | transactions |
| `daily_average_expense` | expense average by day | transactions |
| `rolling_7d_expense` | short-term expense trend | transactions |
| `rolling_30d_expense` | medium-term expense trend | transactions |
| `monthly_burn_rate` | average expense pace | transactions |

## Metric Group 2: Trend and comparison

| Metric | Description |
|---|---|
| `mom_income_change_pct` | month-over-month income delta |
| `mom_expense_change_pct` | month-over-month expense delta |
| `yoy_income_change_pct` | year-over-year income delta |
| `yoy_expense_change_pct` | year-over-year expense delta |
| `category_share_delta` | category concentration change |
| `best_month_rank` | best month in historical range |
| `worst_month_rank` | worst month in historical range |

## Metric Group 3: Anomaly and behavior

| Metric | Description |
|---|---|
| `daily_expense_rank_in_history` | ranking of one day against all historical days |
| `daily_expense_zscore` | normalized unusualness |
| `merchant_first_seen_flag` | whether recipient is new |
| `recipient_concentration_index` | how concentrated spend is |
| `category_volatility_score` | how unstable a category is over time |
| `transaction_frequency_spike` | sudden increase in count |
| `unusual_amount_flag` | row amount significantly above baseline |

## Metric Group 4: Account integrity

| Metric | Description |
|---|---|
| `reconciliation_status` | aligned / needs attention / no linked transactions |
| `balance_difference` | stored minus transaction-derived balance |
| `linked_transaction_coverage` | number and recency of linked transactions |
| `default_account_fallback_rate` | how often imports fall back to default account |
| `unmatched_payfrom_count` | number of pay-from values not mapping to accounts |

## Metric Group 5: Goal health

| Metric | Description |
|---|---|
| `goal_progress_percent` | progress against target |
| `goal_remaining_amount` | amount still needed |
| `goal_monthly_pace_needed` | required pace to hit date |
| `goal_recent_contribution_pace` | actual pace over recent periods |
| `goal_pace_gap` | required vs actual pace |
| `goal_growth_share` | share of balance from growth |
| `goal_risk_level` | green / amber / red based on pace and time |

## Metric Group 6: Import quality

| Metric | Description |
|---|---|
| `import_new_rate` | share of new rows |
| `import_duplicate_rate` | share of duplicates |
| `import_conflict_rate` | share of conflicts |
| `import_skip_rate` | share of skipped rows |
| `top_skip_reason` | dominant skip cause |
| `unresolved_conflicts_count` | number of pending review rows |

## Proposed Metrics API Design

## Core route families

| Route family | Purpose |
|---|---|
| `/api/metrics/dashboard` | top-level KPI snapshot |
| `/api/metrics/transactions` | transaction aggregates and breakdowns |
| `/api/metrics/anomalies` | anomaly candidates and evidence |
| `/api/metrics/accounts` | account integrity and health |
| `/api/metrics/goals` | goal and portfolio metrics |
| `/api/metrics/imports` | import quality metrics |
| `/api/insights/*` | narrative layer built on top of metrics |

## Suggested endpoint set

| Route | Response focus |
|---|---|
| `GET /api/metrics/dashboard?year=2026` | dashboard KPI packet |
| `GET /api/metrics/anomalies/today` | today anomaly packet |
| `GET /api/metrics/transactions/day?date=2026-04-18` | daily evidence packet |
| `GET /api/metrics/transactions/compare?from=2026-04&to=2026-03` | period comparison |
| `GET /api/metrics/reports/monthly?year=2026&month=4` | monthly executive packet |
| `GET /api/metrics/accounts/health` | account health list |
| `GET /api/metrics/accounts/health/[accountId]` | account health detail |
| `GET /api/metrics/goals/overview` | goals portfolio packet |
| `GET /api/metrics/goals/health/[goalId]` | goal detail metrics |
| `GET /api/metrics/imports/recent` | recent import quality |

## Suggested response shape

```ts
type MetricPacket<TMetrics, TEvidence = unknown> = {
  scope: string;
  period?: string;
  metrics: TMetrics;
  evidence?: TEvidence;
  generatedAt: string;
  coverage: {
    transactionCount?: number;
    accountCount?: number;
    goalCount?: number;
    notes: string[];
  };
};
```

## Insight Engine Plan

## Deterministic rule families

| Rule family | Example |
|---|---|
| Spike detection | today expense > 2.5x rolling 30-day average |
| Rank detection | highest daily spend in 5 years |
| Concentration detection | top 3 categories > 70% of total expense |
| Coverage warnings | account has balance but no linked transactions |
| Goal risk detection | required monthly pace > 1.5x recent pace |
| Import hygiene detection | conflict rate above prior median |

## Suggested severity levels

- `info`
- `watch`
- `warning`
- `critical`

## Suggested internal contract

```ts
type InsightCandidate = {
  id: string;
  surface: "dashboard" | "transactions" | "reports" | "accounts" | "goals" | "import";
  type: "anomaly" | "trend" | "coverage" | "risk" | "opportunity";
  severity: "info" | "watch" | "warning" | "critical";
  title: string;
  summary: string;
  evidence: Array<{ label: string; value: string }>;
};
```

## Dashboard Redesign Plan

## Current state

Current dashboard contains:

- accounts overview
- summary cards
- asset allocation pie
- data status card
- cashflow chart
- yearly comparison table
- savings overview

## Recommended additions

### New top strip

- `Today’s AI Insights`
- `What changed this month`
- `What needs attention`

### New intelligence modules

| Module | Purpose |
|---|---|
| `Spend Spike Watch` | show unusual daily or weekly spend |
| `Cashflow Drift` | compare current month vs normal baseline |
| `Goal Risk Board` | show at-risk savings goals |
| `Account Confidence` | show which balances are least explainable |
| `Import Freshness` | show how recent and trustworthy the data is |

### Suggested dashboard hierarchy

1. Summary KPIs
2. Attention / risk strip
3. Cashflow and net worth visuals
4. Goal and account health
5. Deeper drill-down cards

## Page-Embedded Insight Plan

| Page | Insight examples |
|---|---|
| Dashboard | "เดือนนี้รายจ่ายเร่งกว่าค่าเฉลี่ย 12 เดือนอย่างชัดเจน" |
| Transactions | "วันนี้มี spend spike driven by 2 categories" |
| Monthly report | "รายจ่ายหมวดเดินทางเป็นตัวฉุดหลักของเดือนนี้" |
| Account detail | "ยอดบัญชีนี้ยังอธิบายได้เพียงบางส่วนจากธุรกรรมที่เชื่อมไว้" |
| Savings goal detail | "goal นี้ต้องเร่ง pace อีก 35% เพื่อให้ทันกำหนด" |
| Import page | "ไฟล์นี้มี conflict สูงกว่ารอบก่อนอย่างมีนัยสำคัญ" |

## What to Build First

### First-wave deterministic insights

1. today spend anomaly
2. month vs rolling baseline
3. top driver categories
4. account drift warnings
5. goal pace risk
6. import quality warnings

### Second-wave deterministic insights

1. recurring expense detection
2. merchant novelty
3. category volatility
4. contribution provenance once linked
5. forecast metrics

## DB Insight Opportunities by Business Question

| Question | Can answer now? | How |
|---|---|---|
| Which day was the highest-spend day in 5 years? | Yes | transactions by date aggregation |
| What category caused this spike? | Yes | category totals within period |
| Which account is least trustworthy right now? | Yes | reconciliation summary |
| Which goal is at risk of missing target date? | Yes | savings goal pace metrics |
| Which import source creates the most conflicts? | Partly | import runs by filename and conflict rate |
| How much of my net worth is invested in each asset class? | Partly | accounts can approximate, investments are incomplete |
| How will marriage planning affect runway? | Not fully | current schema lacks scenario engine and liability timeline |

## Missing Data Models for Deeper Insight

### Assets and investments

Need:

- holdings table
- instrument metadata
- valuation snapshot table
- optional account-to-holding relationship

### Liabilities

Need:

- liability table
- due date
- APR
- minimum payment
- payoff schedule

### Goal funding provenance

Need:

- optional transaction-to-goal link table
- contribution shortcuts with audit trail

### Life planning

Need:

- scenario table
- target events
- expected one-time costs
- planned monthly allocations

## Recommended Implementation Order

## Sprint 1

- extract metrics services from current UI helpers
- add dashboard metrics endpoint
- add anomaly endpoint

## Sprint 2

- add account health endpoint
- add goal health endpoint
- add import quality endpoint

## Sprint 3

- add first page-level insight cards
- add report summary packet

## Sprint 4

- add recurring pattern detection
- add merchant novelty and concentration metrics
- add forecast scaffolding

## Final Recommendation

The highest-leverage work is not the model call.

The highest-leverage work is:

- stabilizing the metrics layer
- making insight candidates deterministic
- exposing them through reusable APIs

Once that exists, AI becomes a multiplier instead of a source of risk.
