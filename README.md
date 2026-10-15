# SplitEase

A group expense sharing and bill-splitting website, built on the SplitEase database
designed in Digital Assignment 2 (BACSE202, Database Systems).

- **Front end:** React 19 with Vite, plain CSS
- **Back end:** Node.js with Express 5
- **Database:** PostgreSQL, using the ten normalised tables from the assignment

## What you can do

- Create an account, or log in with your **user ID** and your **phone number as the password**
- See your **wallet** (what you get back, what you owe, and the difference), your **groups**
  and your **transaction history** on one page
- Create groups and add members by user ID, phone number or email
- Add an expense and split it equally, by exact amounts or by percentages
- Attach receipts (JPG, PNG, WebP or PDF) to an expense
- Settle up with Cash, UPI, Bank Transfer, Credit Card or Wallet
- Set up recurring expenses and record them when they fall due
- Open the menu in the top right corner for **Profile**, **Settings**, **light or dark mode** and **Log out**

## Run it

You need [Node.js](https://nodejs.org) 20.19 or newer (22 LTS is a good choice) and
[PostgreSQL](https://www.postgresql.org/download/) 13 or newer (tested on 16), installed and running.

Open a terminal in this folder and run:

```bash
npm install        # installs the server and the website
npm run db:setup   # first run: creates server/.env and stops
```

Open `server/.env` and set `PGUSER` and `PGPASSWORD` to your PostgreSQL login. Then:

```bash
npm run db:setup   # creates the "splitease" database, the tables and the sample data
npm run dev        # starts the API and the website
```

Open **http://localhost:5173** in your browser.

### Sample accounts

These are the five users from the assignment's sample data.

| User ID | Password (phone number) | Name                 |
| ------- | ----------------------- | -------------------- |
| 1       | 9876500001              | Linus Rayar Manickam |
| 2       | 9876500002              | Sakthi Durga         |
| 3       | 9876500003              | Jyotsna Srinivas     |
| 4       | 9876500004              | Arjun Kumar          |
| 5       | 9876500005              | Kavin Raj            |

### Commands

| Command                              | What it does                                                        |
| ------------------------------------ | ------------------------------------------------------------------- |
| `npm run dev`                        | API on port 4000 and website on port 5173, both reloading as you edit |
| `npm run db:setup`                   | Recreates the tables and loads the sample data (wipes existing data) |
| `npm run db:setup -- --as-submitted` | Same, keeping every sample row exactly as written in the assignment |
| `npm run db:setup -- --empty`        | Tables plus the category and payment-method lookups only            |
| `npm run db:reconcile`               | Recalculates split statuses after editing rows by hand in psql      |
| `npm run build` then `npm start`     | Builds the website and serves everything from http://localhost:4000 |
| `npm test`                           | Runs the unit tests for the split calculations                      |

## Folder structure

```
splitease/
├── package.json                 One-command scripts for the whole project
├── README.md
├── scripts/
│   └── dev.js                   Starts the API and the website together
│
├── database/
│   ├── 01_schema.sql            The ten tables, keys and constraints
│   ├── 02_seed.sql              The assignment's sample rows, unchanged
│   └── 03_queries.sql           The five SQL queries from the assignment
│
├── server/                      Back end (Express + PostgreSQL)
│   ├── package.json
│   ├── .env.example             Database login and server settings
│   ├── uploads/                 Receipts that people attach
│   ├── test/
│   │   └── splits.test.js
│   └── src/
│       ├── index.js             Starts the server
│       ├── app.js               Wires up routes and middleware
│       ├── config/
│       │   ├── env.js           Reads server/.env
│       │   └── db.js            PostgreSQL connection pool and transactions
│       ├── middleware/
│       │   ├── auth.js          Login cookie, and the check that guards routes
│       │   └── errorHandler.js  Turns errors into clear messages
│       ├── routes/
│       │   ├── auth.routes.js         Register, log in, log out
│       │   ├── users.routes.js        Profile, find a person
│       │   ├── groups.routes.js       Groups and members
│       │   ├── expenses.routes.js     Expenses, splits, receipts
│       │   ├── settlements.routes.js  Payments between members
│       │   ├── recurring.routes.js    Recurring expenses
│       │   └── overview.routes.js     Dashboard, transaction history, lookups
│       ├── services/
│       │   ├── ledger.js        Balances, wallet totals, split status
│       │   ├── splits.js        Equal, exact and percentage split maths
│       │   ├── transactions.js  The combined history query
│       │   ├── groups.js        Group list with balances
│       │   └── access.js        "Is this user in this group?"
│       ├── utils/
│       │   ├── validate.js      Input checks
│       │   ├── httpError.js
│       │   └── money.js
│       └── scripts/
│           ├── setupDb.js       npm run db:setup
│           ├── ensureEnv.js     Creates server/.env on first run
│           └── reconcileStatuses.js
│
└── client/                      Front end (React + Vite)
    ├── package.json
    ├── vite.config.js           Dev server, passes /api to the back end
    ├── index.html
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── main.jsx             Entry point
        ├── App.jsx              Pages and which ones need a login
        ├── pages/
        │   ├── AuthPage.jsx       Log in, create account
        │   ├── DashboardPage.jsx  Wallet, groups, transaction history
        │   ├── GroupsPage.jsx     All groups
        │   ├── GroupPage.jsx      One group: balances, expenses, payments, recurring, members
        │   ├── ActivityPage.jsx   Full history with search and filters
        │   ├── ProfilePage.jsx
        │   ├── SettingsPage.jsx
        │   └── NotFoundPage.jsx
        ├── components/
        │   ├── AppShell.jsx         Top bar and navigation
        │   ├── UserMenu.jsx         Profile, settings, light/dark, log out
        │   ├── WalletPanel.jsx
        │   ├── GroupList.jsx
        │   ├── TransactionList.jsx
        │   ├── SplitBar.jsx         The bar that shows how an amount divides
        │   ├── AddExpenseDialog.jsx
        │   ├── ExpenseDialog.jsx    Expense details, receipts, delete
        │   ├── SettleUpDialog.jsx
        │   ├── RecurringDialog.jsx
        │   ├── NewGroupDialog.jsx
        │   ├── AddMemberDialog.jsx
        │   ├── PersonLookup.jsx
        │   ├── ConfirmButton.jsx
        │   ├── Logo.jsx
        │   └── ui.jsx               Shared pieces: dialog, field, avatar, badge
        ├── context/
        │   ├── AuthContext.jsx      Who is logged in
        │   ├── SettingsContext.jsx  Theme and "hide amounts"
        │   └── ToastContext.jsx     Confirmation messages
        ├── lib/
        │   ├── api.js               Calls to the back end
        │   ├── format.js            Rupees, dates, names
        │   ├── splits.js            Live split preview
        │   ├── useFetch.js
        │   └── usePageTitle.js
        └── styles/
            ├── tokens.css           Colours for light and dark, sizes, font
            ├── base.css             Type, buttons, form controls
            ├── layout.css           Top bar, panels, rows, dialogs
            └── features.css         Wallet, split bar, login page and the rest
```

## How the database is used

The schema is the one from the assignment: same ten tables, same columns, same keys and the
same constraint names. `database/01_schema.sql` only translates the Oracle types to PostgreSQL
(`NUMBER` to `INTEGER` or `NUMERIC`, `VARCHAR2` to `VARCHAR`, `SYSDATE` to `CURRENT_DATE`).
No table or column was added.

| Table                | Where it shows up on the website                                   |
| -------------------- | ------------------------------------------------------------------ |
| `users`              | Create account, log in, profile                                    |
| `groups`             | Groups list, group page                                            |
| `user_groups`        | Members of a group, adding and removing members                    |
| `categories`         | Category choices when adding an expense                            |
| `expenses`           | Expenses in a group, transaction history                           |
| `splits`             | Each person's share of an expense and whether it is paid           |
| `settlements`        | Settle up, payments list, transaction history                      |
| `payment_method`     | "Paid with" choices when settling up                               |
| `attachment`         | Receipts on an expense                                             |
| `recurring_expenses` | Recurring tab in a group, "due" reminders on the overview          |

Four things the website needs are not columns in the schema. Each is handled without changing it:

1. **Password.** `users` has no password column, so login checks the user ID against
   `phone_number`. Nothing extra is stored.
2. **Wallet amount.** There is no wallet or balance table. The wallet is calculated on request
   from `splits` (what each person owes the payer), `expenses` (who the payer is) and
   `settlements` (what has been paid back). See `server/src/services/ledger.js`.
3. **New IDs.** The tables take IDs as plain numbers. Seven sequences, defined at the bottom of
   `01_schema.sql`, hand out the next ID on insert, the PostgreSQL counterpart of Oracle's
   `seq.NEXTVAL`. They continue the numbering in the sample data (users 6, 7, ..., groups 106, ...).
4. **Theme and "hide amounts".** There is no settings table, and these are choices about a
   device, so they are kept in the browser.

### Split status

`splits.status` is kept in step with the payments automatically. Whenever an expense or payment
is added or removed, the amounts paid between two members are applied to their splits oldest
first: fully covered is `PAID`, partly covered is `PARTIALLY PAID`, untouched is `PENDING`. If two
members owe each other, the two debts cancel first.

In the assignment's sample data, splits 501, 502 and 505 have a status that does not match the
payments recorded in `settlements` (for example, split 502 is `PENDING` although settlement 602
pays it in full). `npm run db:setup` applies the rule above after loading, which changes those
three values so the site does not show "Pending" beside a paid debt. `02_seed.sql` itself is
untouched, and `npm run db:setup -- --as-submitted` loads the rows exactly as written.

### Who stores a split row

Following the sample data, an expense stores one `splits` row for each person who owes the
payer. The payer's own share is the remainder of the amount and is not stored.

## API

All routes are under `/api` and, apart from the first three, need a login.

| Method and path                         | Purpose                                         |
| --------------------------------------- | ----------------------------------------------- |
| `POST /auth/register`                   | Create a user                                   |
| `POST /auth/login`                      | Log in with user ID and phone number            |
| `POST /auth/logout`                     | Log out                                         |
| `GET /auth/me`                          | The logged-in user                              |
| `GET /dashboard`                        | Wallet, groups, recent history, due recurring   |
| `GET /transactions`                     | History, with `type`, `group_id`, `q`, `limit`, `offset` |
| `GET /meta`                             | Categories and payment methods                  |
| `GET /users/me`, `PATCH /users/me`      | Profile                                         |
| `GET /users/lookup?q=`                  | Find a person by user ID, phone or email        |
| `GET /groups`, `POST /groups`           | List and create groups                          |
| `GET /groups/:id`, `PATCH /groups/:id`  | Group page data, rename                         |
| `POST /groups/:id/members`              | Add a member                                    |
| `DELETE /groups/:id/members/:userId`    | Leave or remove                                 |
| `POST /groups/:id/expenses`             | Add an expense with its splits                  |
| `GET /expenses/:id`, `DELETE /expenses/:id` | Expense details, delete                     |
| `POST /expenses/:id/attachments`        | Attach a receipt                                |
| `DELETE /attachments/:id`               | Remove a receipt                                |
| `POST /groups/:id/settlements`          | Record a payment                                |
| `DELETE /settlements/:id`               | Remove a payment                                |
| `POST /groups/:id/recurring`            | Add a recurring expense                         |
| `DELETE /recurring/:id`                 | Stop a recurring expense                        |

## A note on security

Using the phone number as the password is what the schema allows, and it is fine for a class
demonstration. It is not safe for real use: anyone who knows a person's user ID and phone number
can log in as them. The site never sends one user's phone number to another, and login attempts
are rate-limited, but a real deployment would need a hashed password column, which means changing
the schema.

## If something does not work

- **"Database setup failed ... password authentication failed"**: the login in `server/.env`
  does not match your PostgreSQL user. Fix `PGUSER` and `PGPASSWORD` and run `npm run db:setup` again.
- **"connect ECONNREFUSED"**: PostgreSQL is not running, or `PGPORT` is wrong (the default is 5432).
- **"Could not reach the SplitEase database" when starting**: run `npm run db:setup` first.
- **Port 4000 or 5173 already in use**: stop the other program, or change `PORT` in `server/.env`
  and the matching address in `client/vite.config.js`.
