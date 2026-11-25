/**
 * routes/products.js
 * Modular router and in-memory data store for the /products resource.
 *
 * Route registration order (important to prevent route shadowing):
 * 1. GET    /products/search?name=...         (Bonus: query-string search)
 * 2. GET    /products/category{/:name}        (Express 5 optional route part)
 * 3. GET    /products                         (List all products — grouped via router.route('/'))
 * 4. POST   /products                         (Create product    — grouped via router.route('/'))
 * 5. GET    /products/:id                     (Get by ID         — grouped via router.route('/:id'))
 * 6. PUT    /products/:id                     (Update by ID      — grouped via router.route('/:id'))
 * 7. DELETE /products/:id                     (Delete by ID      — protected by requireAuth)
 */

const express = require('express');
const router = express.Router();
const { createApiError, requireAuth } = require('../middleware');

// ============================================================================
// IN-MEMORY PRODUCT DATA ARRAY (Seeded with 6 realistic inventory items)
// ============================================================================
const products = [
  {
    id: 1,
    name: 'Logitech MX Mechanical Mini',
    category: 'Peripherals',
    price: 2249850,
    stock: 18,
    sku: 'PER-LOG-101',
    description: 'Compact wireless illuminated mechanical keyboard with tactile quiet switches.'
  },
  {
    id: 2,
    name: 'Keychron M3 Ultralight Wireless Mouse',
    category: 'Peripherals',
    price: 735000,
    stock: 32,
    sku: 'PER-KEY-104',
    description: 'Ergonomic 79g optical mouse supporting 2.4GHz, Bluetooth 5.1, and wired USB-C.'
  },
  {
    id: 3,
    name: 'Sony MDR-7506 Studio Monitor Headphones',
    category: 'Audio',
    price: 1499850,
    stock: 9,
    sku: 'AUD-SNY-201',
    description: 'Closed-back dynamic studio headphones with 40mm neodymium drivers and foldable frame.'
  },
  {
    id: 4,
    name: 'Anker Prime 100W GaN Wall Charger',
    category: 'Accessories',
    price: 1042500,
    stock: 4,
    sku: 'ACC-ANK-301',
    description: 'Compact 3-port fast USB-C and USB-A GaN charger for laptops, tablets, and phones.'
  },
  {
    id: 5,
    name: 'BenQ ScreenBar Halo Monitor Light',
    category: 'Workspace',
    price: 2685000,
    stock: 3,
    sku: 'WRK-BNQ-401',
    description: 'LED monitor light bar with wireless controller, asymmetrical optics, and back-light.'
  },
  {
    id: 6,
    name: 'Shure MV7+ Podcast Microphone',
    category: 'Audio',
    price: 4185000,
    stock: 12,
    sku: 'AUD-SHR-205',
    description: 'Hybrid USB-C and XLR dynamic microphone with voice isolation and LED touch mute panel.'
  }
];

// Counter for automatic ID generation (never entered manually by users)
let nextProductId = 7;

const ALLOWED_FIELDS = ['name', 'category', 'price', 'stock', 'sku', 'description'];

/**
 * Parses and validates a route :id parameter.
 * Returns null if the ID is not a valid positive integer.
 */
function parseProductId(rawId) {
  if (typeof rawId !== 'string' || !/^\d+$/.test(rawId.trim())) {
    return null;
  }
  const parsed = Number(rawId.trim());
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

/**
 * Validates incoming product payload using explicit if/else checks.
 * @param {Object} body - Request body
 * @param {boolean} isPartial - True for PUT updates, false for POST creation
 * @param {number|null} currentId - Current product ID when updating
 * @returns {{ errors: string[], cleaned: Object }}
 */
function validateProductInput(body, isPartial = false, currentId = null) {
  const errors = [];
  const cleaned = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      errors: ['Request body must be a valid JSON object.'],
      cleaned
    };
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return {
      errors: ['Request body cannot be empty. Provide required product fields.'],
      cleaned
    };
  }

  // Prevent unexpected fields or manual ID manipulation
  const unexpectedFields = keys.filter((key) => !ALLOWED_FIELDS.includes(key));
  if (unexpectedFields.length > 0) {
    errors.push(
      `Unexpected or non-editable field(s): ${unexpectedFields.join(', ')}. Allowed fields are: ${ALLOWED_FIELDS.join(', ')}.`
    );
  }

  // 1. Validate "name" (string, required on POST)
  if (!isPartial || Object.prototype.hasOwnProperty.call(body, 'name')) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      errors.push('"name" is required and must be a non-empty string.');
    } else if (body.name.trim().length > 120) {
      errors.push('"name" must not exceed 120 characters.');
    } else {
      cleaned.name = body.name.trim();
    }
  }

  // 2. Validate "category" (string, required on POST)
  if (!isPartial || Object.prototype.hasOwnProperty.call(body, 'category')) {
    if (typeof body.category !== 'string' || body.category.trim().length === 0) {
      errors.push('"category" is required and must be a non-empty string.');
    } else if (body.category.trim().length > 60) {
      errors.push('"category" must not exceed 60 characters.');
    } else {
      cleaned.category = body.category.trim();
    }
  }

  // 3. Validate "price" (whole Rupiah amount >= 0, required on POST)
  if (!isPartial || Object.prototype.hasOwnProperty.call(body, 'price')) {
    const rawPrice = body.price;
    if (
      rawPrice === undefined ||
      rawPrice === null ||
      rawPrice === '' ||
      typeof rawPrice === 'boolean' ||
      Number.isNaN(Number(rawPrice)) ||
      !Number.isFinite(Number(rawPrice))
    ) {
      errors.push('"price" is required and must be a valid number.');
    } else {
      const numericPrice = Number(rawPrice);
      if (!Number.isInteger(numericPrice) || numericPrice < 0 || numericPrice > 1000000000) {
        errors.push('"price" must be a whole Rupiah amount between 0 and 1,000,000,000.');
      } else {
        cleaned.price = numericPrice;
      }
    }
  }

  // 4. Validate "stock" (integer >= 0, required on POST)
  if (!isPartial || Object.prototype.hasOwnProperty.call(body, 'stock')) {
    const rawStock = body.stock;
    if (
      rawStock === undefined ||
      rawStock === null ||
      rawStock === '' ||
      typeof rawStock === 'boolean' ||
      !Number.isInteger(Number(rawStock))
    ) {
      errors.push('"stock" is required and must be a whole integer.');
    } else {
      const numericStock = Number(rawStock);
      if (numericStock < 0 || numericStock > 1000000) {
        errors.push('"stock" must be an integer between 0 and 1,000,000.');
      } else {
        cleaned.stock = numericStock;
      }
    }
  }

  // 5. Validate "sku" (string; optional on simple POST, validated if provided)
  if (Object.prototype.hasOwnProperty.call(body, 'sku')) {
    if (typeof body.sku !== 'string' || body.sku.trim().length === 0) {
      errors.push('"sku" must be a non-empty string when provided.');
    } else if (body.sku.trim().length > 40) {
      errors.push('"sku" must not exceed 40 characters.');
    } else {
      const normalizedSku = body.sku.trim().toUpperCase();
      const duplicateSku = products.find(
        (p) => p.sku.toUpperCase() === normalizedSku && p.id !== currentId
      );
      if (duplicateSku) {
        errors.push(`A product with SKU "${normalizedSku}" already exists (ID ${duplicateSku.id}).`);
      } else {
        cleaned.sku = normalizedSku;
      }
    }
  } else if (!isPartial) {
    const prefix = cleaned.category
      ? cleaned.category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD')
      : 'PRD';
    cleaned.sku = `${prefix}-GEN-${String(nextProductId).padStart(3, '0')}`;
  }

  // 6. Validate "description" (string; defaults to concise text if omitted on POST)
  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    if (typeof body.description !== 'string') {
      errors.push('"description" must be a string.');
    } else if (body.description.trim().length > 500) {
      errors.push('"description" must not exceed 500 characters.');
    } else {
      cleaned.description = body.description.trim();
    }
  } else if (!isPartial) {
    cleaned.description = '';
  }

  return { errors, cleaned };
}

// ============================================================================
// 1. BONUS ROUTE (+3): Query-String Search
//    GET /products/search?name=keyboard (also supports ?q= or ?category=)
//    Registered BEFORE /:id so "search" is not interpreted as a product ID.
// ============================================================================
router.get('/search', (req, res, next) => {
  const searchTerm =
    typeof req.query.name === 'string'
      ? req.query.name.trim()
      : typeof req.query.q === 'string'
        ? req.query.q.trim()
        : '';

  const categoryFilter =
    typeof req.query.category === 'string' ? req.query.category.trim() : '';

  if (!searchTerm && !categoryFilter) {
    return next(
      createApiError(
        400,
        'Search query is required. Use ?name=<keyword> (for example: /products/search?name=keyboard).'
      )
    );
  }

  const keyword = searchTerm.toLowerCase();
  const catKeyword = categoryFilter.toLowerCase();

  const matches = products.filter((product) => {
    const matchesTerm =
      !keyword ||
      product.name.toLowerCase().includes(keyword) ||
      product.sku.toLowerCase().includes(keyword) ||
      product.description.toLowerCase().includes(keyword) ||
      product.category.toLowerCase().includes(keyword);

    const matchesCategory =
      !catKeyword || product.category.toLowerCase() === catKeyword;

    return matchesTerm && matchesCategory;
  });

  res.status(200).json({
    success: true,
    message: `Found ${matches.length} matching product(s).`,
    query: {
      name: searchTerm || null,
      category: categoryFilter || null
    },
    count: matches.length,
    data: matches
  });
});

// ============================================================================
// 2. EXPRESS 5 OPTIONAL ROUTE PART: Filter by Category
//    GET /products/category{/:name}
//    Without :name -> returns all products.
//    With :name    -> filters products matching that category (case-insensitive).
//    Registered BEFORE /:id so "category" is not interpreted as a product ID.
// ============================================================================
router.get('/category{/:name}', (req, res) => {
  const categoryName = req.params.name ? req.params.name.trim() : null;

  if (!categoryName) {
    return res.status(200).json({
      success: true,
      message: 'No category specified; returning all products.',
      category: 'ALL',
      count: products.length,
      data: products
    });
  }

  const filtered = products.filter(
    (product) => product.category.toLowerCase() === categoryName.toLowerCase()
  );

  res.status(200).json({
    success: true,
    message: `Filtered products by category "${categoryName}".`,
    category: categoryName,
    count: filtered.length,
    data: filtered
  });
});

// ============================================================================
// 3. COLLECTION ROUTES USING router.route('/')
//    GET  /products — List all products
//    POST /products — Add a new product (auto-generates ID)
// ============================================================================
router
  .route('/')
  .get((req, res) => {
    res.status(200).json({
      success: true,
      message: 'Retrieved all products successfully.',
      count: products.length,
      data: products
    });
  })
  .post((req, res, next) => {
    const { errors, cleaned } = validateProductInput(req.body, false, null);

    if (errors.length > 0) {
      return next(
        createApiError(400, `Invalid product data: ${errors[0]}`, errors)
      );
    }

    const newProduct = {
      id: nextProductId++,
      name: cleaned.name,
      category: cleaned.category,
      price: cleaned.price,
      stock: cleaned.stock,
      sku: cleaned.sku,
      description: cleaned.description
    };

    products.push(newProduct);

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: newProduct
    });
  });

// ============================================================================
// 4. SINGLE-ITEM ROUTES USING router.route('/:id')
//    GET    /products/:id — Return one product (throws 404 in async route if missing)
//    PUT    /products/:id — Update product (throws 404 in async route if missing)
//    DELETE /products/:id — Delete product (protected by requireAuth middleware)
// ============================================================================
router
  .route('/:id')
  .get(async (req, res) => {
    const productId = parseProductId(req.params.id);
    if (productId === null) {
      throw createApiError(
        400,
        `Invalid product ID "${req.params.id}". ID must be a positive integer.`
      );
    }

    const product = products.find((item) => item.id === productId);
    if (!product) {
      // Express 5 automatically catches errors thrown inside async route handlers
      throw createApiError(404, `Product with ID ${productId} was not found.`);
    }

    res.status(200).json({
      success: true,
      message: `Retrieved product with ID ${productId}.`,
      data: product
    });
  })
  .put(async (req, res) => {
    const productId = parseProductId(req.params.id);
    if (productId === null) {
      throw createApiError(
        400,
        `Invalid product ID "${req.params.id}". ID must be a positive integer.`
      );
    }

    const productIndex = products.findIndex((item) => item.id === productId);
    if (productIndex === -1) {
      throw createApiError(404, `Product with ID ${productId} was not found.`);
    }

    const { errors, cleaned } = validateProductInput(req.body, true, productId);
    if (errors.length > 0) {
      throw createApiError(400, `Invalid update data: ${errors[0]}`, errors);
    }

    const updatedProduct = {
      ...products[productIndex],
      ...cleaned,
      id: productId
    };

    products[productIndex] = updatedProduct;

    res.status(200).json({
      success: true,
      message: `Product with ID ${productId} updated successfully.`,
      data: updatedProduct
    });
  })
  .delete(requireAuth, async (req, res) => {
    const productId = parseProductId(req.params.id);
    if (productId === null) {
      throw createApiError(
        400,
        `Invalid product ID "${req.params.id}". ID must be a positive integer.`
      );
    }

    const productIndex = products.findIndex((item) => item.id === productId);
    if (productIndex === -1) {
      throw createApiError(404, `Product with ID ${productId} was not found.`);
    }

    const [deletedProduct] = products.splice(productIndex, 1);

    res.status(200).json({
      success: true,
      message: `Product with ID ${productId} ("${deletedProduct.name}") was deleted.`,
      data: deletedProduct
    });
  });

module.exports = router;
