# BNPL Manager (Buy Now, Pay Later Manager)

## Overview
BNPL Manager is a personal finance tool designed to help users track, manage, and understand the full impact of their "Buy Now, Pay Later" (BNPL) purchases. By unifying scattered installment obligations into a single platform and calculating the true financial trade-offs of deferred payments, the system gives users full visibility over their cash flow and long-term financial health.

---

## Key Features

### 1. Purchase Aggregation & Statistics
* **Total Outstanding Balance:** Centralized dashboard showing the aggregate debt owed across all BNPL purchases.
* **Timeline Liquidity Forecaster:** Dynamic projection of the exact capital required to meet all upcoming installment payments across short-term and long-term horizons (e.g., next 7 days, 30 days, quarterly, annually).
* **Payment Tracking:** Full schedule breakdown of all current and historical payment obligations.

### 2. Intelligent Payment Reminders & Notifications
* Automated alert system to notify users ahead of upcoming payment due dates.
* Cash-flow safety checks to prevent overdrafts or missed installment fees.

### 3. Opportunity Cost & "True Cost" Calculator
* **Investment Comparison Engine:** Calculates the true long-term opportunity cost of purchases by simulating what those installment amounts would yield if invested instead (e.g., S&P 500 average benchmark return of ~8%, or standard High-Yield Savings Account rates).
* **Multi-Horizon Growth Metrics:** Projects foregone earnings and compound growth over 1-year, 5-year, and 10-year timelines.
* **True Cost Evaluation:** Contextualizes the real economic impact of deferred consumption versus wealth accumulation.

---

## Frontend

The frontend is a TypeScript app that currently displays `TrueCost BNPL`.

### Run it

```bash
npm install
npm run dev
```

Open the local address shown in the terminal (normally http://localhost:5173).
