# TrueCost BNPL project tracker

## Current goal

Create a simple proof-of-concept that helps one user understand the opportunity cost of Buy Now, Pay Later purchases.

## Completed

- TypeScript frontend created with Vite.
- Dashboard shows active purchases, remaining balance, monthly payments, and a 10-year opportunity-value estimate.
- Purchases can be added, edited, and deleted manually.
- Purchase and settings data is saved in browser `localStorage`.
- Each purchase shows estimated investment values for 1, 5, and 10 years.
- Settings allow a default annual return rate and display currency.
- Purchases support a custom payment interval, purchase date, and first payment date.
- Payment dates are used for the opportunity-cost estimate and next-payment display.
- Dashboard shows the next five unpaid payments, payments due this month, and a current-month payment calendar.
- New purchases open to a separate purchase-details page after creation.
- Each payment can be managed separately with an editable due date, amount, and paid, scheduled, or missed status.
- The app asks whether to clear its local data each time it loads.
- UI rendering is separated from application state and browser event handling.
- Dashboard includes an educational 10-year investment-value chart with 4% and 8% assumptions.
- Purchase details show fixed 8% opportunity-value summaries for 1, 5, and 10 years.
- Payment management has status totals, a quick Mark paid action, and a remaining-balance preview.
- Dashboard chart can focus on selected purchases, and development reloads can use temporary sample data.
- Purchase details include a full chronological payment timeline.

## Intentionally out of scope

- User accounts and login.
- Cloud sync or data sharing between devices.
- Bank or BNPL-provider connections.
- Due-date reminders and missed-payment prevention.

## Possible next steps

- Add charts to compare remaining payments with potential investment growth.
- Add import/export of local data.
