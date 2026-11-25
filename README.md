# StockWise — Small Shop Inventory Management REST API

> **Midterm Project: Build a REST API with ExpressJS (Express 5)**

## 1. Student & Project Information


- **Student Name:** `Lahai Simone Swaray`
- **NIM:** `202500402*8`
- **Theme:** Online Shop (`StockWise — Small Shop Inventory Management System`)
- **Primary Resource:** `/products`
- **Secondary Resource (Bonus +5):** `/categories`
- **Runtime & Framework:** Node.js + Express 5 (`express@^5.0.1`)
- **Data Storage:** In-memory JavaScript arrays inside `routes/products.js` and `routes/categories.js` (no database; data resets when the server restarts)
- **Product Price Currency:** Indonesian Rupiah (IDR); the original USD seed prices were converted at a fixed rate of 1 USD = Rp 15,000 and rounded to whole Rupiah. This is a one-time conversion, not a live exchange rate.
- **Optional Vanilla Frontend:** Served at `/dashboard` using plain HTML, CSS, and browser `fetch()`

---

## 2. Project Folder Structure

```text
StockWise/
├── index.js               # Express 5 app setup, middleware pipeline, route mounting, server startup
├── middleware.js          # Request logger, requireAuth token guard, and 4-parameter errorHandler
├── routes/
│   ├── products.js        # In-memory products array (6 seeded items) and /products routes
│   └── categories.js      # Bonus (+5) second resource router for /categories
├── public/                # Optional vanilla frontend (mounted at /dashboard)
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── screenshots/
│   ├── dashboard.png
│   ├── products-list.png
│   ├── add-product.png
│   ├── edit-product.png
│   ├── api-get-products.png
│   ├── api-post-product.png
│   ├── api-error-responses.png
    |__ Project demonstraction Video
│   └── API_TEST_EVIDENCE.md
├── package.json           # Dependencies (Express 5) and npm scripts (start, dev)
├── package-lock.json      # Locked dependency versions
├── .gitignore             # Excludes node_modules and environment files
└── README.md              # Project documentation
```

---

## 3. How to Install and Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server (with `nodemon`):**
   ```bash
   npm run dev
   ```
   *(Or run `npm start` to start with standard `node index.js`.)*

3. **Access the application:**
   - **API Welcome Endpoint (`GET /`):** `http://localhost:3000/`
   - **Products API (`GET /products`):** `http://localhost:3000/products`
   - **Categories API (`GET /categories`):** `http://localhost:3000/categories`
   - **Web Inventory Dashboard:** `http://localhost:3000/dashboard`

---

## 4. Complete Route List & Express 5 Features

### Required Routes

| # | Method | Path | Behavior | Status Codes |
|---:|---|---|---|---|
| 1 | `GET` | `/` | Returns JSON welcome message containing student name, NIM, and Online Shop theme | `200` |
| 2 | `GET` | `/products` | Lists all products in the in-memory inventory array | `200` |
| 3 | `GET` | `/products/:id` | Returns a single product by numeric ID; throws `404` inside an `async` route if not found | `200`, `400`, `404` |
| 4 | `POST` | `/products` | Creates a product with an automatically generated ID; validates fields with `if/else` | `201`, `400` |
| 5 | `PUT` | `/products/:id` | Updates an existing product (full or partial valid fields); throws `404` if ID does not exist | `200`, `400`, `404` |
| 6 | `DELETE` | `/products/:id` | Deletes a product; protected by `requireAuth` header token middleware | `200`, `401`, `404` |
| 7 | `GET` | `/products/category{/:name}` | **Express 5 optional route part:** filters by category when `:name` is given, or returns all products when omitted | `200` |
| 8 | `GET` | `/files/*path` | **Express 5 named wildcard:** captures multi-segment paths and returns the segments as an array | `200` |
| 9 | `ANY` | Any unknown URL | Handled by the 404 catch-all middleware and formatted by the 4-parameter error handler | `404` |

### Implemented Bonus Features (+10 Points)

1. **`+5` Second Resource (`/categories` in `routes/categories.js`):**
   - `GET /categories` — List all shop categories (`200`)
   - `GET /categories/:id` — Get category by ID (`200` / `404`)
   - `POST /categories` — Create category (`201` / `400`)
   - `PUT /categories/:id` — Update category (`200` / `400` / `404`)
   - `DELETE /categories/:id` — Delete category with `requireAuth` (`200` / `401` / `404`)
2. **`+3` Query-String Search (`GET /products/search?name=<keyword>`):**
   - Searches products case-insensitively across `name`, `sku`, `category`, and `description`.
   - Registered **before** `/products/:id` so `"search"` is never mistaken for a product ID.
3. **`+2` Consistent Custom Error Response Format:**
   - Every `400`, `401`, `404`, and `500` response across the entire API returns the same predictable JSON shape:
     ```json
     {
       "success": false,
       "error": {
         "status": 404,
         "code": "NOT_FOUND",
         "message": "Product with ID 99999 was not found.",
         "details": null,
         "path": "/products/99999",
         "timestamp": "2026-11-20T14:20:00.000Z"
       }
     }
     ```

---

## 5. Authorization Header for `DELETE` Requests

The `DELETE /products/:id` (and `DELETE /categories/:id`) routes are protected by the `requireAuth` middleware in `middleware.js`.

- **Default Demo Token:** `stockwise-secret-2026` *(can be overridden via the `STOCKWISE_AUTH_TOKEN` environment variable)*
- **Accepted Request Headers:**
  - `Authorization: Bearer stockwise-secret-2026`
  - `x-auth-token: stockwise-secret-2026`

### Example `curl` Commands

```bash
# 1. Create a new product (201 Created)
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"CalDigit TS4 Thunderbolt 4 Dock","category":"Workspace","price":5699850,"stock":7,"sku":"WRK-CAL-405","description":"18-port Thunderbolt 4 docking station."}'

# 2. Delete without token (401 Unauthorized)
curl -X DELETE http://localhost:3000/products/1

# 3. Delete with valid token (200 OK)
curl -X DELETE http://localhost:3000/products/1 \
  -H "Authorization: Bearer stockwise-secret-2026"
```

---

## 6. Middleware & Error Pipeline Order in `index.js` (Demo & Q&A Guide)

In Express, middleware and routes execute **top-to-bottom** in the exact order they are registered with `app.use()` and `app.METHOD()`:

1. **`app.use(express.json())`** — Must run before routes so incoming JSON request bodies (`POST` and `PUT`) are parsed into `req.body`.
2. **`app.use(logger)`** — Runs at the start of every request so all incoming HTTP methods and URLs are logged to the terminal.
3. **`app.use('/dashboard', express.static(...))`** — Serves the optional vanilla frontend under `/dashboard` so it does not intercept `GET /`.
4. **Application Routes (`/`, `/files/*path`, `/products`, `/categories`)** — Matches and handles valid API endpoints. Inside `routes/products.js`, `/search` and `/category{/:name}` are registered **before** `/:id` so Express does not treat `"search"` or `"category"` as an `:id` parameter.
5. **Unknown-Route 404 Handler** — Placed **after** all valid routes; any request that reaches this middleware did not match any defined route and is forwarded as a `404 Not Found` error via `next(createApiError(404, ...))`.
6. **Four-Parameter Error Handler `app.use(errorHandler)`** — Placed **strictly last**. Express identifies error middleware specifically by its 4 parameters `(err, req, res, next)`. In Express 5, errors thrown inside `async` route handlers are automatically caught and forwarded here.
