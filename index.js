/**
 * index.js
 * Entry point for StockWise — Small Shop Inventory Management REST API (Express 5).
 *
 * Middleware and Route Pipeline Order (Required for Demo Explanation):
 * 1. Built-in JSON body parser: express.json()
 * 2. Custom request logger middleware: logger
 * 3. Static frontend dashboard mounted at /dashboard (so GET / stays the API welcome route)
 * 4. Application routes & modular routers (/, /files/*path, /products, /categories)
 * 5. 404 Not-Found handler for any unmatched URL
 * 6. Four-parameter centralized error handler (placed strictly last)
 */

const path = require('path');
const express = require('express');
const { createApiError, logger, errorHandler } = require('./middleware');
const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// STUDENT IDENTITY CONFIGURATION (Replace placeholders in this single block)
// ============================================================================
const STUDENT_INFO = {
  name: process.env.STUDENT_NAME || 'Lahai Simone Swaray',
  nim: process.env.STUDENT_NIM || '202500402*8',
  theme: 'Online Shop',
  project: 'StockWise — Small Shop Inventory Management System'
};

// ----------------------------------------------------------------------------
// 1. Built-in JSON Body Parsing Middleware
// ----------------------------------------------------------------------------
app.use(express.json());

// ----------------------------------------------------------------------------
// 2. Custom Request Logger Middleware
// ----------------------------------------------------------------------------
app.use(logger);

// ----------------------------------------------------------------------------
// 3. Optional Vanilla Frontend Dashboard (Mounted at /dashboard)
//    Mounted separately so GET / remains the lecturer-required JSON welcome route.
// ----------------------------------------------------------------------------
app.use('/dashboard', express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------------------
// 4. Required Routes & Modular Routers
// ----------------------------------------------------------------------------

// Route #1: Root welcome message containing student name and project theme
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: `Welcome to ${STUDENT_INFO.project}!`,
    student: {
      name: STUDENT_INFO.name,
      nim: STUDENT_INFO.nim
    },
    theme: STUDENT_INFO.theme,
    mainResource: '/products',
    secondaryResource: '/categories',
    dashboardUrl: '/dashboard',
    endpoints: {
      welcome: 'GET /',
      listProducts: 'GET /products',
      getProductById: 'GET /products/:id',
      createProduct: 'POST /products',
      updateProduct: 'PUT /products/:id',
      deleteProduct: 'DELETE /products/:id (requires Authorization header)',
      filterByCategory: 'GET /products/category{/:name}',
      searchProducts: 'GET /products/search?name=<keyword>',
      listCategories: 'GET /categories',
      wildcardFiles: 'GET /files/*path'
    }
  });
});

// Expose non-sensitive student metadata for the /dashboard header
app.get('/api/meta', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      student: {
        name: STUDENT_INFO.name,
        nim: STUDENT_INFO.nim
      },
      theme: STUDENT_INFO.theme,
      project: STUDENT_INFO.project,
      storageNotice: 'In-memory JavaScript array (resets when server restarts)'
    }
  });
});


// Handle browser favicon and stale localhost Service Worker probes cleanly
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.status(200).send(
    "self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', () => self.registration.unregister());"
  );
});

app.get('/files/*path', (req, res) => {
  const segments = Array.isArray(req.params.path)
    ? req.params.path
    : [req.params.path];

  res.status(200).json({
    success: true,
    message: 'Wildcard file path captured as an array of segments.',
    path: segments,
    segments,
    data: segments
  });
});

// Mount modular resource routers
app.use('/products', productsRouter);
app.use('/categories', categoriesRouter);


// ----------------------------------------------------------------------------
// 5. Unknown-Route 404 Handler (Catches any unmatched method/URL after all routes)
// ----------------------------------------------------------------------------
app.use((req, res, next) => {
  next(
    createApiError(
      404,
      `Route not found: Cannot ${req.method} ${req.originalUrl}`
    )
  );
});

// ----------------------------------------------------------------------------
// 6. Centralized Four-Parameter Error Handler (Placed strictly LAST)
// ----------------------------------------------------------------------------
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {

    console.log(`StockWise REST API (Express 5) running on port ${PORT}`);
    console.log(`Student : ${STUDENT_INFO.name} (${STUDENT_INFO.nim})`);
    console.log(`Theme   : ${STUDENT_INFO.theme}`);
    console.log(`API Root: http://localhost:${PORT}/`);
    console.log(`Web UI  : http://localhost:${PORT}/dashboard`);

  });
}

module.exports = app;
