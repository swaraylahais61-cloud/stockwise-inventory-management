# StockWise — Verified API Route Test Evidence

> **Generated from live Express 5 server run on:** `2026-11-20T20:36:54.284Z`
> **Total Test Cases Verified:** 28 / 28 Passed

This file records genuine HTTP request/response evidence captured directly against the running Express 5 server (`index.js`). For your final submission, also save your Postman or Thunder Client window screenshots in this `screenshots/` folder.

## 1. Welcome Route (GET /)
- **Request:** `GET /`
- **Response Status:** `HTTP 200`
```json
{
  "success": true,
  "message": "Welcome to StockWise — Small Shop Inventory Management System!",
  "student": {
    "name": "Lahai Simone Swaray",
    "nim": "202500402*8"
  },
  "theme": "Online Shop",
  "mainResource": "/products",
  "secondaryResource": "/categories",
  "dashboardUrl": "/dashboard",
  "endpoints": {
    "welcome": "GET /",
    "listProducts": "GET /products",
    "getProductById": "GET /products/:id",
    "createProduct": "POST /products",
    "updateProduct": "PUT /products/:id",
    "deleteProduct": "DELETE /products/:id (requires Authorization header)",
    "filterByCategory": "GET /products/category{/:name}",
    "searchProducts": "GET /products/search?name=<keyword>",
    "listCategories": "GET /categories",
    "wildcardFiles": "GET /files/*path"
  }
}
```

## 2. List All Seeded Products (GET /products)
- **Request:** `GET /products`
- **Response Status:** `HTTP 200`
```json
{
  "success": true,
  "message": "Retrieved all products successfully.",
  "count": 6,
  "data": [
    {
      "id": 1,
      "name": "Logitech MX Mechanical Mini",
      "category": "Peripherals",
      "price": 149.99,
      "stock": 18,
      "sku": "PER-LOG-101",
      "description": "Compact wireless illuminated mechanical keyboard with tactile quiet switches."
    },
    {
      "id": 2,
      "name": "Keychron M3 Ultralight Wireless Mouse",
      "category": "Peripherals",
      "price": 49,
      "stock": 32,
      "sku": "PER-KEY-104",
      "description": "Ergonomic 79g optical mouse supporting 2.4GHz, Bluetooth 5.1, and wired USB-C."
    },
    {
      "id": 3,
      "name": "Sony MDR-7506 Studio Monitor Headphones",
      "category": "Audio",
      "price": 99.99,
      "stock": 9,
      "sku": "AUD-SNY-201",
      "description": "Closed-back dynamic studio headphones with 40mm neodymium drivers and foldable frame."
    },
    {
      "id": 4,
      "name": "Anker Prime 100W GaN Wall Charger",
      "category": "Accessories",
      "price": 69.5,
      "stock": 4,
      "sku": "ACC-ANK-301",
      "description": "Compact 3-port fast USB-C and USB-A GaN charger for laptops, tablets, and phones."
    },
    {
      "id": 5,
      "name": "BenQ ScreenBar Halo Monitor Light",
      "category": "Workspace",
      "price": 179,
      "stock": 3,
      "sku": "WRK-BNQ-401",
      "description": "LED monitor light bar with wireless controller, asymmetrical optics, and back-light."
    },
    {
      "id": 6,
      "name": "Shure MV7+ Podcast Microphone",
      "category": "Audio",
      "price": 279,
      "stock": 12,
      "sku": "AUD-SHR-205",
      "description": "Hybrid USB-C and XLR dynamic microphone with voice isolation and LED touch mute panel."
    }
  ]
}
```

## 3. Get Single Product by ID (GET /products/1)
- **Request:** `GET /products/1`
- **Response Status:** `HTTP 200`
```json
{
  "success": true,
  "message": "Retrieved product with ID 1.",
  "data": {
    "id": 1,
    "name": "Logitech MX Mechanical Mini",
    "category": "Peripherals",
    "price": 149.99,
    "stock": 18,
    "sku": "PER-LOG-101",
    "description": "Compact wireless illuminated mechanical keyboard with tactile quiet switches."
  }
}
```

## 4. Get Nonexistent Product ID (GET /products/99999)
- **Request:** `GET /products/99999`
- **Response Status:** `HTTP 404`
```json
{
  "success": false,
  "error": {
    "status": 404,
    "code": "NOT_FOUND",
    "message": "Product with ID 99999 was not found.",
    "details": null,
    "path": "/products/99999",
    "timestamp": "2026-11-20T20:36:53.984Z"
  }
}
```

## 5. Get Malformed Product ID (GET /products/abc)
- **Request:** `GET /products/abc`
- **Response Status:** `HTTP 400`
```json
{
  "success": false,
  "error": {
    "status": 400,
    "code": "BAD_REQUEST",
    "message": "Invalid product ID \"abc\". ID must be a positive integer.",
    "details": null,
    "path": "/products/abc",
    "timestamp": "2026-11-20T20:36:53.998Z"
  }
}
```

## 6. Create Product with Valid Payload (POST /products)
- **Request:** `POST /products`
- **Headers:** `{"Content-Type":"application/json"}`
- **Request Body:** `{"name":"CalDigit TS4 Thunderbolt 4 Dock","category":"Workspace","price":379.99,"stock":8,"sku":"WRK-CAL-405","description":"18-port Thunderbolt 4 docking station with 98W host charging."}`
- **Response Status:** `HTTP 201`
```json
{
  "success": true,
  "message": "Product created successfully.",
  "data": {
    "id": 7,
    "name": "CalDigit TS4 Thunderbolt 4 Dock",
    "category": "Workspace",
    "price": 379.99,
    "stock": 8,
    "sku": "WRK-CAL-405",
    "description": "18-port Thunderbolt 4 docking station with 98W host charging."
  }
}
```

## 7. Create Product with Empty Body (POST /products)
- **Request:** `POST /products`
- **Headers:** `{"Content-Type":"application/json"}`
- **Request Body:** `{}`
- **Response Status:** `HTTP 400`
```json
{
  "success": false,
  "error": {
    "status": 400,
    "code": "BAD_REQUEST",
    "message": "Invalid product data: Request body cannot be empty. Provide required product fields.",
    "details": [
      "Request body cannot be empty. Provide required product fields."
    ],
    "path": "/products",
    "timestamp": "2026-11-20T20:36:54.098Z"
  }
}
```

## 8. Create Product with Invalid Fields (POST /products)
- **Request:** `POST /products`
- **Headers:** `{"Content-Type":"application/json"}`
- **Request Body:** `{"name":"","category":"Peripherals","price":-25,"stock":2.5}`
- **Response Status:** `HTTP 400`
```json
{
  "success": false,
  "error": {
    "status": 400,
    "code": "BAD_REQUEST",
    "message": "Invalid product data: \"name\" is required and must be a non-empty string.",
    "details": [
      "\"name\" is required and must be a non-empty string.",
      "\"price\" must be between 0 and 1,000,000.",
      "\"stock\" is required and must be a whole integer."
    ],
    "path": "/products",
    "timestamp": "2026-11-20T20:36:54.106Z"
  }
}
```

## 9. Update Existing Product (PUT /products/1)
- **Request:** `PUT /products/1`
- **Headers:** `{"Content-Type":"application/json"}`
- **Request Body:** `{"price":139.99,"stock":22}`
- **Response Status:** `HTTP 200`
```json
{
  "success": true,
  "message": "Product with ID 1 updated successfully.",
  "data": {
    "id": 1,
    "name": "Logitech MX Mechanical Mini",
    "category": "Peripherals",
    "price": 139.99,
    "stock": 22,
    "sku": "PER-LOG-101",
    "description": "Compact wireless illuminated mechanical keyboard with tactile quiet switches."
  }
}
```

## 10. Update Nonexistent Product (PUT /products/99999)
- **Request:** `PUT /products/99999`
- **Headers:** `{"Content-Type":"application/json"}`
- **Request Body:** `{"price":59.99}`
- **Response Status:** `HTTP 404`
```json
{
  "success": false,
  "error": {
    "status": 404,
    "code": "NOT_FOUND",
    "message": "Product with ID 99999 was not found.",
    "details": null,
    "path": "/products/99999",
    "timestamp": "2026-11-20T20:36:54.124Z"
  }
}
```

## 11. Reject Unexpected Field on Update (PUT /products/1)
- **Request:** `PUT /products/1`
- **Headers:** `{"Content-Type":"application/json"}`
- **Request Body:** `{"maliciousField":"corrupt"}`
- **Response Status:** `HTTP 400`
```json
{
  "success": false,
  "error": {
    "status": 400,
    "code": "BAD_REQUEST",
    "message": "Invalid update data: Unexpected or non-editable field(s): maliciousField. Allowed fields are: name, category, price, stock, sku, description.",
    "details": [
      "Unexpected or non-editable field(s): maliciousField. Allowed fields are: name, category, price, stock, sku, description."
    ],
    "path": "/products/1",
    "timestamp": "2026-11-20T20:36:54.132Z"
  }
}
```

## 12. Delete Product Without Auth Token (DELETE /products/7)
- **Request:** `DELETE /products/7`
- **Response Status:** `HTTP 401`
```json
{
  "success": false,
  "error": {
    "status": 401,
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Provide a valid token in the \"Authorization: Bearer <token>\" or \"x-auth-token\" header.",
    "details": {
      "expectedHeader": "Authorization: Bearer <token>"
    },
    "path": "/products/7",
    "timestamp": "2026-11-20T20:36:54.137Z"
  }
}
```

## 13. Delete Product With Wrong Auth Token (DELETE /products/7)
- **Request:** `DELETE /products/7`
- **Headers:** `{"Authorization":"Bearer wrong-token"}`
- **Response Status:** `HTTP 401`
```json
{
  "success": false,
  "error": {
    "status": 401,
    "code": "UNAUTHORIZED",
    "message": "Invalid authorization token. Deletion rejected.",
    "details": {
      "expectedHeader": "Authorization: Bearer <token>"
    },
    "path": "/products/7",
    "timestamp": "2026-11-20T20:36:54.141Z"
  }
}
```

## 14. Delete Product With Valid Auth Token (DELETE /products/7)
- **Request:** `DELETE /products/7`
- **Headers:** `{"Authorization":"Bearer stockwise-secret-2026"}`
- **Response Status:** `HTTP 200`
```json
{
  "success": true,
  "message": "Product with ID 7 (\"CalDigit TS4 Thunderbolt 4 Dock\") was deleted.",
  "data": {
    "id": 7,
    "name": "CalDigit TS4 Thunderbolt 4 Dock",
    "category": "Workspace",
    "price": 379.99,
    "stock": 8,
    "sku": "WRK-CAL-405",
    "description": "18-port Thunderbolt 4 docking station with 98W host charging."
  }
}
```

## 15. Category Route Without Parameter (GET /products/category)
- **Request:** `GET /products/category`
- **Response Status:** `HTTP 200`
```json
{
  "success": true,
  "message": "No category specified; returning all products.",
  "category": "ALL",
  "count": 6,
  "data": [
    {
      "id": 1,
      "name": "Logitech MX Mechanical Mini",
      "category": "Peripherals",
      "price": 139.99,
      "stock": 22,
      "sku": "PER-LOG-101",
      "description": "Compact wireless illuminated mechanical keyboard with tactile quiet switches."
    },
    {
      "id": 2,
      "name": "Keychron M3 Ultralight Wireless Mouse",
      "category": "Peripherals",
      "price": 49,
      "stock": 32,
      "sku": "PER-KEY-104",
      "description": "Ergonomic 79g optical mouse supporting 2.4GHz, Bluetooth 5.1, and wired USB-C."
    },
    {
      "id": 3,
      "name": "Sony MDR-7506 Studio Monitor Headphones",
      "category": "Audio",
      "price": 99.99,
      "stock": 9,
      "sku": "AUD-SNY-201",
      "description": "Closed-back dynamic studio headphones with 40mm neodymium drivers and foldable frame."
    },
    {
      "id": 4,
      "name": "Anker Prime 100W GaN Wall Charger",
      "category": "Accessories",
      "price": 69.5,
      "stock": 4,
      "sku": "ACC-ANK-301",
      "description": "Compact 3-port fast USB-C and USB-A GaN charger for laptops, tablets, and phones."
    },
    {
      "id": 5,
      "name": "BenQ ScreenBar Halo Monitor Light",
      "category": "Workspace",
      "price": 179,
      "stock": 3,
      "sku": "WRK-BNQ-401",
      "description": "LED monitor light bar with wireless controller, asymmetrical optics, and back-light."
    },
    {
      "id": 6,
      "name": "Shure MV7+ Podcast Microphone",
      "category": "Audio",
      "price": 279,
      "stock": 12,
      "sku": "AUD-SHR-205",
      "description": "Hybrid USB-C and XLR dynamic microphone with voice isolation and LED touch mute panel."
    }
  ]
}
```

## 16. Category Route With Parameter (GET /products/category/Peripherals)
- **Request:** `GET /products/category/Peripherals`
- **Response Status:** `HTTP 200`
```json
{
  "success": true,
  "message": "Filtered products by category \"Peripherals\".",
  "category": "Peripherals",
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Logitech MX Mechanical Mini",
      "category": "Peripherals",
      "price": 139.99,
      "stock": 22,
      "sku": "PER-LOG-101",
      "description": "Compact wireless illuminated mechanical keyboard with tactile quiet switches."
    },
    {
      "id": 2,
      "name": "Keychron M3 Ultralight Wireless Mouse",
      "category": "Peripherals",
      "price": 49,
      "stock": 32,
      "sku": "PER-KEY-104",
      "description": "Ergonomic 79g optical mouse supporting 2.4GHz, Bluetooth 5.1, and wired USB-C."
    }
  ]
}
```

## 17. Named Wildcard Route (GET /files/images/products/photo.png)
- **Request:** `GET /files/images/products/photo.png`
- **Response Status:** `HTTP 200`
```json
{
  "success": true,
  "message": "Wildcard file path captured as an array of segments.",
  "path": [
    "images",
    "products",
    "photo.png"
  ],
  "segments": [
    "images",
    "products",
    "photo.png"
  ],
  "data": [
    "images",
    "products",
    "photo.png"
  ]
}
```

## 18. Unknown Route 404 Handler (GET /this-route-does-not-exist)
- **Request:** `GET /this-route-does-not-exist`
- **Response Status:** `HTTP 404`
```json
{
  "success": false,
  "error": {
    "status": 404,
    "code": "NOT_FOUND",
    "message": "Route not found: Cannot GET /this-route-does-not-exist",
    "details": null,
    "path": "/this-route-does-not-exist",
    "timestamp": "2026-11-20T20:36:54.174Z"
  }
}
```

## 19. Bonus Search Route (GET /products/search?name=keyboard)
- **Request:** `GET /products/search?name=keyboard`
- **Response Status:** `HTTP 200`
```json
{
  "success": true,
  "message": "Found 1 matching product(s).",
  "query": {
    "name": "keyboard",
    "category": null
  },
  "count": 1,
  "data": [
    {
      "id": 1,
      "name": "Logitech MX Mechanical Mini",
      "category": "Peripherals",
      "price": 139.99,
      "stock": 22,
      "sku": "PER-LOG-101",
      "description": "Compact wireless illuminated mechanical keyboard with tactile quiet switches."
    }
  ]
}
```

## 20. Bonus Second Resource List (GET /categories)
- **Request:** `GET /categories`
- **Response Status:** `HTTP 200`
```json
{
  "success": true,
  "message": "Retrieved all categories successfully.",
  "count": 4,
  "data": [
    {
      "id": 1,
      "name": "Peripherals",
      "code": "PER",
      "aisle": "Aisle A1",
      "description": "Keyboards, mice, control pads, and desktop input devices."
    },
    {
      "id": 2,
      "name": "Audio",
      "code": "AUD",
      "aisle": "Aisle B2",
      "description": "Studio headphones, microphones, audio interfaces, and monitors."
    },
    {
      "id": 3,
      "name": "Accessories",
      "code": "ACC",
      "aisle": "Aisle C1",
      "description": "GaN chargers, braided cables, hubs, and power adapters."
    },
    {
      "id": 4,
      "name": "Workspace",
      "code": "WRK",
      "aisle": "Aisle D3",
      "description": "Monitor light bars, desk mounts, stands, and ergonomic gear."
    }
  ]
}
```

## 21. Bonus Second Resource Create (POST /categories)
- **Request:** `POST /categories`
- **Headers:** `{"Content-Type":"application/json"}`
- **Request Body:** `{"name":"Networking","code":"NET","aisle":"Aisle E1","description":"Routers, Ethernet switches, and patch cables."}`
- **Response Status:** `HTTP 201`
```json
{
  "success": true,
  "message": "Category created successfully.",
  "data": {
    "id": 5,
    "name": "Networking",
    "code": "NET",
    "aisle": "Aisle E1",
    "description": "Routers, Ethernet switches, and patch cables."
  }
}
```

## 22. Frontend Dashboard HTML (GET /dashboard/)
- **Request:** `GET /dashboard/`
- **Response Status:** `HTTP 200`
```text
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>StockWise — Monochrome Inventory Dashboard</title>
  <link rel="stylesheet" href="/dashboard/css/style.css" />
</head>
<body>
  <aside id="sidebar">
...
```

## 23. Frontend Inventory View (GET /dashboard/inventory.html)
- **Request:** `GET /dashboard/inventory.html`
- **Response Status:** `HTTP 200`
```text
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Inventory Database — StockWise</title>
  <link rel="stylesheet" href="/dashboard/css/style.css" />
</head>
<body>
  <aside id="sidebar">
    <div cla...
```

## 24. Frontend Add/Edit Form Page (GET /dashboard/form.html)
- **Request:** `GET /dashboard/form.html`
- **Response Status:** `HTTP 200`
```text
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Add / Edit Product — StockWise</title>
  <link rel="stylesheet" href="/dashboard/css/style.css" />
</head>
<body>
  <aside id="sidebar">
    <div cla...
```

## 25. Frontend Reports & Categories View (GET /dashboard/reports.html)
- **Request:** `GET /dashboard/reports.html`
- **Response Status:** `HTTP 200`
```text
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reports &amp; Categories — StockWise</title>
  <link rel="stylesheet" href="/dashboard/css/style.css" />
</head>
<body>
  <aside id="sidebar">
    <d...
```

## 26. Frontend Settings & Wildcard Tester View (GET /dashboard/settings.html)
- **Request:** `GET /dashboard/settings.html`
- **Response Status:** `HTTP 200`
```text
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Settings &amp; API Diagnostics — StockWise</title>
  <link rel="stylesheet" href="/dashboard/css/style.css" />
</head>
<body>
  <aside id="sidebar">
...
```

## 27. Frontend CSS Asset (GET /dashboard/css/style.css)
- **Request:** `GET /dashboard/css/style.css`
- **Response Status:** `HTTP 200`
```text
/**
 * public/css/style.css
 * StockWise — Adapted from Mono Stock (Mono-Inventory-Dashboard)
 * Strict Monochrome Design System (Black, White, Shades of Gray) + Responsive Sidebar
 */

:root {
  --bg-body: #f4f4f4;
  --bg-card: #ffffff;
  --bg-sidebar: #000000;
  --text-main: #1a1a1a;
  --text-mute...
```

## 28. Frontend JS Asset (GET /dashboard/js/app.js)
- **Request:** `GET /dashboard/js/app.js`
- **Response Status:** `HTTP 200`
```text
/**
 * public/js/app.js
 * Adapted directly from Mono-Inventory-Dashboard/script.js and mapped to
 * the StockWise Express 5 REST API (/products, /categories, /files/*path).
 *
 * Mapped Mono Stock features:
 * 1. toggleSidebar() & highlightCurrentPage()
 * 2. renderDate()
 * 3. renderKPIs()
 * 4. r...
```
