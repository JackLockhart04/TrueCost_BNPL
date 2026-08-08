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

## Intentionally out of scope

- User accounts and login.
- Cloud sync or data sharing between devices.
- Bank or BNPL-provider connections.
- Due-date reminders and missed-payment prevention.

## Possible next steps

- Add purchase dates and a monthly payment timeline.
- Add charts to compare remaining payments with potential investment growth.
- Add import/export of local data.
