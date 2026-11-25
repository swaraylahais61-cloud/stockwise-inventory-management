/**
 * routes/categories.js
 * Bonus (+5): Second modular resource with its own in-memory array and Express router.
 *
 * Endpoints:
 * - GET    /categories      — List all inventory categories
 * - POST   /categories      — Create a new category
 * - GET    /categories/:id  — Get a single category by ID
 * - PUT    /categories/:id  — Update a category by ID
 * - DELETE /categories/:id  — Delete a category (protected by requireAuth)
 */

const express = require('express');
const router = express.Router();
const { createApiError, requireAuth } = require('../middleware');

const categories = [
  {
    id: 1,
    name: 'Peripherals',
    code: 'PER',
    aisle: 'Aisle A1',
    description: 'Keyboards, mice, control pads, and desktop input devices.'
  },
  {
    id: 2,
    name: 'Audio',
    code: 'AUD',
    aisle: 'Aisle B2',
    description: 'Studio headphones, microphones, audio interfaces, and monitors.'
  },
  {
    id: 3,
    name: 'Accessories',
    code: 'ACC',
    aisle: 'Aisle C1',
    description: 'GaN chargers, braided cables, hubs, and power adapters.'
  },
  {
    id: 4,
    name: 'Workspace',
    code: 'WRK',
    aisle: 'Aisle D3',
    description: 'Monitor light bars, desk mounts, stands, and ergonomic gear.'
  }
];

let nextCategoryId = 5;
const ALLOWED_CATEGORY_FIELDS = ['name', 'code', 'aisle', 'description'];

function parseCategoryId(rawId) {
  if (typeof rawId !== 'string' || !/^\d+$/.test(rawId.trim())) {
    return null;
  }
  const parsed = Number(rawId.trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function validateCategoryInput(body, isPartial = false, currentId = null) {
  const errors = [];
  const cleaned = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { errors: ['Request body must be a valid JSON object.'], cleaned };
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return { errors: ['Request body cannot be empty.'], cleaned };
  }

  const unexpected = keys.filter((k) => !ALLOWED_CATEGORY_FIELDS.includes(k));
  if (unexpected.length > 0) {
    errors.push(
      `Unexpected field(s): ${unexpected.join(', ')}. Allowed fields: ${ALLOWED_CATEGORY_FIELDS.join(', ')}.`
    );
  }

  if (!isPartial || Object.prototype.hasOwnProperty.call(body, 'name')) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      errors.push('"name" is required and must be a non-empty string.');
    } else {
      const trimmedName = body.name.trim();
      const duplicate = categories.find(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== currentId
      );
      if (duplicate) {
        errors.push(`Category "${trimmedName}" already exists.`);
      } else {
        cleaned.name = trimmedName;
      }
    }
  }

  if (!isPartial || Object.prototype.hasOwnProperty.call(body, 'code')) {
    if (typeof body.code !== 'string' || body.code.trim().length < 2 || body.code.trim().length > 6) {
      errors.push('"code" is required and must be a 2-6 character string (e.g., "PER").');
    } else {
      cleaned.code = body.code.trim().toUpperCase();
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'aisle')) {
    if (typeof body.aisle !== 'string' || body.aisle.trim().length === 0) {
      errors.push('"aisle" must be a non-empty string when provided.');
    } else {
      cleaned.aisle = body.aisle.trim();
    }
  } else if (!isPartial) {
    cleaned.aisle = 'General Storage';
  }

  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    if (typeof body.description !== 'string') {
      errors.push('"description" must be a string.');
    } else {
      cleaned.description = body.description.trim();
    }
  } else if (!isPartial) {
    cleaned.description = '';
  }

  return { errors, cleaned };
}

router
  .route('/')
  .get((req, res) => {
    res.status(200).json({
      success: true,
      message: 'Retrieved all categories successfully.',
      count: categories.length,
      data: categories
    });
  })
  .post((req, res, next) => {
    const { errors, cleaned } = validateCategoryInput(req.body, false, null);
    if (errors.length > 0) {
      return next(createApiError(400, `Invalid category data: ${errors[0]}`, errors));
    }

    const newCategory = {
      id: nextCategoryId++,
      name: cleaned.name,
      code: cleaned.code,
      aisle: cleaned.aisle,
      description: cleaned.description
    };

    categories.push(newCategory);

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: newCategory
    });
  });

router
  .route('/:id')
  .get(async (req, res) => {
    const categoryId = parseCategoryId(req.params.id);
    if (categoryId === null) {
      throw createApiError(400, `Invalid category ID "${req.params.id}".`);
    }

    const category = categories.find((item) => item.id === categoryId);
    if (!category) {
      throw createApiError(404, `Category with ID ${categoryId} was not found.`);
    }

    res.status(200).json({
      success: true,
      message: `Retrieved category with ID ${categoryId}.`,
      data: category
    });
  })
  .put(async (req, res) => {
    const categoryId = parseCategoryId(req.params.id);
    if (categoryId === null) {
      throw createApiError(400, `Invalid category ID "${req.params.id}".`);
    }

    const index = categories.findIndex((item) => item.id === categoryId);
    if (index === -1) {
      throw createApiError(404, `Category with ID ${categoryId} was not found.`);
    }

    const { errors, cleaned } = validateCategoryInput(req.body, true, categoryId);
    if (errors.length > 0) {
      throw createApiError(400, `Invalid category update: ${errors[0]}`, errors);
    }

    categories[index] = {
      ...categories[index],
      ...cleaned,
      id: categoryId
    };

    res.status(200).json({
      success: true,
      message: `Category with ID ${categoryId} updated successfully.`,
      data: categories[index]
    });
  })
  .delete(requireAuth, async (req, res) => {
    const categoryId = parseCategoryId(req.params.id);
    if (categoryId === null) {
      throw createApiError(400, `Invalid category ID "${req.params.id}".`);
    }

    const index = categories.findIndex((item) => item.id === categoryId);
    if (index === -1) {
      throw createApiError(404, `Category with ID ${categoryId} was not found.`);
    }

    const [deleted] = categories.splice(index, 1);

    res.status(200).json({
      success: true,
      message: `Category with ID ${categoryId} ("${deleted.name}") deleted.`,
      data: deleted
    });
  });

module.exports = router;
