# Tattoo Store ERP — Frontend

Persian, RTL ERP for an Iranian tattoo equipment store, built with React 19, TypeScript, TanStack Start/Router, TanStack Query, Vite and Tailwind CSS v4. Monetary displays use Toman and dates use the Jalali calendar. Includes light/dark themes and 17 sections.

## Install and develop

Use a recent Bun release, or Node.js 22.12+ with npm. Extract the source ZIP and open its `tattoo-store-erp` folder.

```sh
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Open the local URL printed by Vite. npm alternative: `npm install`, then `npm run dev`.

```sh
bun run build      # production compilation
bun run preview    # local production preview
bun run test       # small regression checks
```

The included Lovable Vite configuration preserves the TanStack Start runtime and defaults production output to a Cloudflare-compatible target. The source archive excludes installed dependencies, generated build output, secrets and repository metadata.

## Development data versus Django

An empty `VITE_API_BASE_URL` uses the isolated, in-memory development mock. The app labels this mode **داده آزمایشی**. Products, names, telephone numbers, rates, invoices and financial totals in that mode are illustrative, not real business records. Changes reset on a full reload; browser storage stores only the selected theme.

To use the separately developed Django REST Framework API:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

Do not append `/api`: the service paths already include it. Restart development after changing `.env`, or rebuild for a deployment. With a nonempty base URL the app calls Django directly and does not silently fall back to mock data on failure.

### API structure

- `src/api/types.ts`: shared response and request contracts.
- `src/api/client.ts`: base URL, credentialed JSON requests and HTTP errors.
- `src/api/services.ts`: the only data-access layer used by pages.
- `src/api/hooks.ts`: reusable queries, mutations and display-only currency conversion.
- `src/api/mock.ts`: development-only fixtures and in-memory mutations.

IDs are strings; dates are ISO timestamps; numeric fields are JSON numbers. Contracts use camelCase. Lists currently expect JSON arrays rather than DRF's paginated `{ count, results }` envelope. If your backend uses snake_case or pagination, normalize the responses in the service layer, not in individual pages.

| Resource | Method and path |
| --- | --- |
| Dashboard | `GET /api/dashboard/` |
| Accounting summary | `GET /api/accounting/summary/` |
| Categories | `GET/POST /api/categories/`, `PATCH/DELETE /api/categories/{id}/` |
| Products including variants | `GET/POST /api/products/`, `PUT/DELETE /api/products/{id}/` |
| Variant selling price | `POST /api/variants/{id}/price/` with `{ price }` |
| Bulk adjustment | `POST /api/variants/bulk-adjust/` with `{ ids, percent }` |
| Price locking | `POST /api/variants/lock/` with `{ ids, locked }` |
| Manual override contract | `POST /api/variants/{id}/override/` with `{ value }` (Toman or `null`) |
| Exchange rates | `GET /api/currency-rates/`, `POST /api/currency-rates/{code}/` with `{ rate }` |
| Suppliers / customers | `GET /api/suppliers/`, `GET /api/customers/` |
| Purchases / sales | `GET/POST /api/purchases/`, `GET/POST /api/sales/` |
| Stock movement history | `GET /api/stock-movements/` |
| Apply currency change to prices | `POST /api/currency-rates/{code}/apply/` (sets `baseRate` = current rate for non-locked, non-manual variants of that currency) |
| Archive invoice | `POST /api/sales/{id}/archive/` with `{ archived }`; invoices carry an auto-generated `code` |
| Accounts / banks | `GET/POST /api/accounts/` (3-digit unique `code`), `PATCH /api/accounts/{id}/` with `{ balance }` (records an adjustment transaction) |
| Account transactions | `GET/POST /api/accounts/{id}/transactions/` (`amount` in Rial, dated server-side at creation) |

Backend notes: blank product SKU, variant SKU and barcode must be generated server-side on create; pack prices live in `variant.extraUnits[].price`; a walk-in customer (`id: "walkin"`, `code: "920"`) must exist; sales with `paymentStatus` paid/partial post a deposit to `accountId` (cashbox by default).
| Expenses | `GET/POST /api/expenses/` |
| Accounts / users | `GET /api/accounts/`, `GET /api/users/` |

The complete payload shapes are in `types.ts`; endpoint dispatch is in `services.ts`.

### Authentication and deployment responsibilities

This delivery is a frontend, not a Django backend or authentication service. The HTTP client sends `credentials: "include"`; configure Django's allowed origins and credentialed CORS for the exact frontend origin. The current client does not implement a login flow or CSRF-token exchange. For Django session authentication, add the agreed CSRF-token acquisition/header handling in `client.ts` before authenticated writes; never disable CSRF protection. Prefer same-origin deployment when possible. Token authentication, if selected by your backend, should also be implemented centrally.

Do not put private keys in any `VITE_*` variable: these values are public. Django must enforce permissions, validate invoices and quantities, allocate permanent invoice numbers, perform stock transactions, and return authoritative financial totals.

## Included screens and current boundaries

- Price list: search, category/brand/stock filters, sorting, pagination, double-click selling-price editing, percentage adjustments, locking and CSV export.
- Products and categories: product editing, dynamic attributes, visible Add Variant control, unlimited variant rows, category/subcategory management and product packaging factors.
- Purchases and sales: supplier/customer selection, invoice rows, currency and cost previews, packaging selection, returns, payment statuses and invoice history.
- Inventory: per-variant base stock, packaging equivalents and received movement records.
- Dashboard, currency history, accounting, expenses, reports, customer/supplier lists, users/permissions display and settings display.

Currency adjustment changes only displayed selling prices, not original prices or historical purchase records. Accounting summaries come from the service rather than frontend ledger calculations. The mock does not simulate an accounting ledger or automatically alter stock after sales/purchases.

Manual overrides received from Django are honored in pricing; this version does not yet expose an override editor. Transfers/conversions are displayed in movement history, not entered through a transaction form. Packaging configuration is product-level; independently managed stock per packaging form and per variant requires a fuller backend contract. Users/permissions and settings are display interfaces, not secure permission enforcement or saved store settings. Images are accepted as product URL fields; the sample catalogue has no product photographs or upload service.

The real Django API, authentication and deployment have not been verified because no Django backend is connected. The available development-data flows and page rendering were checked in the running app.

## Source layout

```text
src/
  api/            # typed service boundary and development fixtures
  components/     # shared shell, table and UI controls
  lib/            # Persian formatting and shared helpers
  routes/         # all 17 pages and the root layout
  test/           # focused regression checks
public/           # static public files
```

The route tree is generated automatically; do not edit `src/routeTree.gen.ts`. To place this exported source in a new repository, initialize Git in the extracted directory, review the files, and commit them. No existing repository metadata is included.

## Django backend

The matching backend lives in `../backend` (see its README). With `VITE_API_BASE_URL` set, the app shows a login screen (JWT, stored in localStorage, auto-refresh).


## استقرار روی GitHub Pages (نسخه استاتیک)

این نسخه یک SPA استاتیک است (Vite + TanStack Router با hash routing) و نیازی به سرور ندارد.

1. پروژه را در یک ریپازیتوری گیت‌هاب با شاخه `main` push کنید.
2. در Settings → Pages، گزینه Source را روی **GitHub Actions** بگذارید.
3. workflow داخل `.github/workflows/deploy.yml` خودکار بیلد و منتشر می‌کند.

اجرای محلی: `npm install --legacy-peer-deps && npm run dev` — بیلد: `npm run build` (خروجی در `dist/`).
بدون `VITE_API_BASE_URL` برنامه با داده آزمایشی (mock) کار می‌کند.
