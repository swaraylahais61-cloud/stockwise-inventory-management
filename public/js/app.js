/**
 * public/js/app.js
 * Adapted directly from Mono-Inventory-Dashboard/script.js and mapped to
 * the StockWise Express 5 REST API (/products, /categories, /files/*path).
 *
 * Mapped Mono Stock features:
 * 1. toggleSidebar() & highlightCurrentPage()
 * 2. renderDate()
 * 3. renderKPIs()
 * 4. renderLowStock() (< 10 units)
 * 5. renderTable() & sortTable(column)
 * 6. drawChart() (HTML5 Canvas 2D context on Dashboard)
 * 7. drawReportChart() (HTML5 Canvas 2D bar chart on Reports)
 * 8. exportToCSV() & Dark Mode toggle
 * 9. Full Express 5 CRUD via fetch() (GET, POST, PUT, DELETE with Auth Token, Search, Category Filter)
 */

let productsArray = [];
let categoriesArray = [];
let activeCategory = 'All';
let activeSort = 'Oldest First';

let sortState = {
  column: null,
  direction: 'asc'
};

// Unregister any leftover Service Workers from older localhost:3000 projects
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {});
}

// Apply saved monochrome theme mode (Light / Dark)
function applySavedTheme() {
  const savedTheme = localStorage.getItem('stockwise_theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

function getSavedAuthToken() {
  return localStorage.getItem('stockwise_auth_token') || 'stockwise-secret-2026';
}

function getSavedCurrency() {
  return localStorage.getItem('stockwise_currency') === 'USD' ? 'USD' : 'IDR';
}

function getSavedExchangeRate() {
  const rate = Number(localStorage.getItem('stockwise_idr_per_usd'));
  return Number.isFinite(rate) && rate > 0 ? rate : 16000;
}

function getDisplayPriceFromIdr(amountInIdr) {
  const amount = Number(amountInIdr) || 0;
  return getSavedCurrency() === 'USD' ? amount / getSavedExchangeRate() : amount;
}

function getIdrPriceFromDisplay(amount) {
  const value = Number(amount) || 0;
  return getSavedCurrency() === 'USD'
    ? Math.round(value * getSavedExchangeRate())
    : Math.round(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(amount) {
  if (getSavedCurrency() === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(getDisplayPriceFromIdr(amount));
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

function updateApiTrace(method, endpoint, status, elapsedMs) {
  const el = document.getElementById('apiTraceText');
  if (el) {
    el.textContent = `${method} ${endpoint} → ${status} (${elapsedMs}ms)`;
  }
}

function showToast(message, isError = false) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${isError ? 'toast-error' : ''}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    <button type="button" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1rem;">&times;</button>
  `;
  toast.querySelector('button').addEventListener('click', () => toast.remove());
  stack.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 4000);
}

async function apiFetch(endpoint, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const start = performance.now();
  const response = await fetch(endpoint, {
    ...options,
    method,
    headers
  });
  const elapsed = Math.round(performance.now() - start);
  updateApiTrace(method, endpoint, response.status, elapsed);

  let payload = null;
  try {
    payload = await response.json();
  } catch (_e) {
    payload = null;
  }

  if (!response.ok) {
    const msg =
      (payload && payload.error && payload.error.message) ||
      (payload && payload.message) ||
      `HTTP ${response.status}`;
    const err = new Error(msg);
    err.status = response.status;
    err.details =
      payload && payload.error && Array.isArray(payload.error.details)
        ? payload.error.details
        : null;
    throw err;
  }

  return payload;
}

// ============================================================================
// 1. SIDEBAR & DATE HELPERS (Mono-Inventory-Dashboard/script.js)
// ============================================================================
function highlightCurrentPage() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';

  const links = document.querySelectorAll('nav li a');
  links.forEach((link) => {
    const href = (link.getAttribute('href') || '').split('/').pop();
    if (href === page || (page === 'dashboard' && href === 'index.html')) {
      link.parentElement.classList.add('active');
    } else {
      link.parentElement.classList.remove('active');
    }
  });
}

function renderDate() {
  const dateEl = document.getElementById('currentDate');
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const width = window.innerWidth;

  if (width <= 768) {
    sidebar.classList.toggle('open');
  } else {
    sidebar.classList.toggle('collapsed');
  }
}

// ============================================================================
// 2. KPI & LOW STOCK RENDERING (Mono-Inventory-Dashboard/script.js)
// ============================================================================
function renderKPIs(data = productsArray) {
  const list = Array.isArray(data) ? data : [];
  const totalItemsEl = document.getElementById('totalItems');
  const totalStockEl = document.getElementById('totalStock');
  const totalValueEl = document.getElementById('totalValue');
  const bestSellerEl = document.getElementById('bestSeller');
  const bestSellerMetaEl = document.getElementById('bestSellerMeta');

  const totalProdSub = document.getElementById('total-product-value');
  const lowStockSub = document.getElementById('low-stock-value');
  const outStockSub = document.getElementById('out-of-stock-value');

  const totalStock = list.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0);
  const totalVal = list.reduce(
    (acc, curr) => acc + (Number(curr.stock) || 0) * (Number(curr.price) || 0),
    0
  );
  const lowCount = list.filter((p) => Number(p.stock) > 0 && Number(p.stock) < 10).length;
  const outCount = list.filter((p) => Number(p.stock) === 0).length;

  if (totalItemsEl) totalItemsEl.textContent = String(list.length);
  if (totalProdSub) totalProdSub.textContent = `${list.length} active SKUs`;
  if (totalStockEl) totalStockEl.textContent = totalStock.toLocaleString('en-US');
  if (lowStockSub) lowStockSub.textContent = String(lowCount);
  if (outStockSub) outStockSub.textContent = String(outCount);
  if (totalValueEl) totalValueEl.textContent = formatMoney(totalVal);

  if (bestSellerEl) {
    if (list.length > 0) {
      const topAsset = list.reduce((prev, curr) =>
        curr.price * curr.stock > prev.price * prev.stock ? curr : prev
      );
      bestSellerEl.textContent = topAsset.name;
      if (bestSellerMetaEl) {
        bestSellerMetaEl.textContent = `${topAsset.sku} • ${formatMoney(
          topAsset.price * topAsset.stock
        )}`;
      }
    } else {
      bestSellerEl.textContent = '-';
    }
  }
}

function renderLowStock(data = productsArray) {
  const listContainer = document.getElementById('lowStockList');
  if (!listContainer) return;

  const lowStockItems = (Array.isArray(data) ? data : []).filter(
    (item) => Number(item.stock) < 10
  );

  if (lowStockItems.length === 0) {
    listContainer.innerHTML =
      '<div style="color:var(--text-muted); padding:10px;">All product stock levels are healthy (&ge; 10 units).</div>';
    return;
  }

  listContainer.innerHTML = lowStockItems
    .map(
      (item) => `
      <div class="list-item">
        <div class="list-item-left">
          <span class="item-name">${escapeHtml(item.name)}</span>
          <span class="item-sub">SKU: ${escapeHtml(item.sku)} &bull; ID: #${item.id}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="status-badge critical">Remaining: ${item.stock}</span>
          <button type="button" class="qty-btn" title="Quick +5 Restock (PUT /products/${item.id})" onclick="adjustStock(${item.id}, 5)">+5</button>
        </div>
      </div>
    `
    )
    .join('');
}

// ============================================================================
// 3. TABLE RENDERING & SORTING (Mono-Inventory-Dashboard/script.js)
// ============================================================================
function getStatusBadge(stock) {
  const qty = Number(stock) || 0;
  if (qty === 0) {
    return `<span class="status-badge critical">Out of Stock</span>`;
  }
  if (qty < 10) {
    return `<span class="status-badge critical">Low Stock (${qty})</span>`;
  }
  return `<span class="status-badge">In Stock</span>`;
}

function renderTable(data = productsArray) {
  const tbody =
    document.getElementById('productTableBody') ||
    document.querySelector('#inventoryTable tbody');
  if (!tbody) return;

  const list = Array.isArray(data) ? data : [];
  tbody.innerHTML = '';

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:24px;">No matching products found.</td></tr>`;
    return;
  }

  list.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${item.id}</td>
      <td><span class="sku-code">${escapeHtml(item.sku)}</span></td>
      <td>
        <strong>${escapeHtml(item.name)}</strong>
        ${
          item.description
            ? `<span class="item-desc-sub">${escapeHtml(item.description)}</span>`
            : ''
        }
      </td>
      <td><span class="status-badge">${escapeHtml(item.category)}</span></td>
      <td>${formatMoney(item.price)}</td>
      <td>
        <div class="qty-controls">
          <button type="button" class="qty-btn" onclick="adjustStock(${item.id}, -1)" aria-label="Decrease">&minus;</button>
          <strong>${Number(item.stock).toLocaleString('en-US')}</strong>
          <button type="button" class="qty-btn" onclick="adjustStock(${item.id}, 1)" aria-label="Increase">+</button>
        </div>
      </td>
      <td>${getStatusBadge(item.stock)}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <a href="/dashboard/form.html?id=${item.id}" class="mono-btn mono-btn-outline mono-btn-sm">Edit</a>
          <button type="button" class="mono-btn mono-btn-sm" onclick="deleteProduct(${item.id})">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function sortTable(column) {
  if (sortState.column === column) {
    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.column = column;
    sortState.direction = 'asc';
  }

  const sortedData = [...productsArray].sort((a, b) => {
    let valA = a[column];
    let valB = b[column];

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
    return 0;
  });

  renderTable(sortedData);
}

function sortProducts() {
  const sortVal = document.getElementById('sort');
  if (sortVal) activeSort = sortVal.value;

  const copy = [...productsArray];
  switch (activeSort) {
    case 'Name (A–Z)':
      copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'Name (Z–A)':
      copy.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      break;
    case 'Price (Low → High)':
      copy.sort((a, b) => Number(a.price) - Number(b.price));
      break;
    case 'Price (High → Low)':
      copy.sort((a, b) => Number(b.price) - Number(a.price));
      break;
    case 'Quantity (Low → High)':
      copy.sort((a, b) => Number(a.stock) - Number(b.stock));
      break;
    case 'Quantity (High → Low)':
      copy.sort((a, b) => Number(b.stock) - Number(a.stock));
      break;
    case 'Newest First':
      copy.sort((a, b) => Number(b.id) - Number(a.id));
      break;
    case 'Oldest First':
    default:
      copy.sort((a, b) => Number(a.id) - Number(b.id));
      break;
  }

  renderTable(copy);
}

// ============================================================================
// 4. HTML5 CANVAS CHARTS (Mono-Inventory-Dashboard/script.js)
// ============================================================================
function drawChart(data = productsArray) {
  const canvas = document.getElementById('salesChart');
  if (!canvas) return;

  const list = Array.isArray(data) && data.length > 0 ? data : [];
  const ctx = canvas.getContext('2d');
  const isDark = document.body.classList.contains('dark-mode');

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const padding = 44;

  ctx.clearRect(0, 0, width, height);

  const values = list.length > 0 ? list.map((p) => Number(p.price) * Number(p.stock)) : [0, 0];
  const labels = list.length > 0 ? list.map((p) => p.sku || `#${p.id}`) : ['-', '-'];
  const maxVal = Math.max(...values, 100) * 1.15;
  const dataPoints = values.length;
  const stepX = dataPoints > 1 ? (width - padding * 2) / (dataPoints - 1) : width - padding * 2;
  const getY = (val) => height - padding - (val / maxVal) * (height - padding * 2);

  // Horizontal Grid Lines
  ctx.beginPath();
  ctx.strokeStyle = isDark ? '#2c2c2c' : '#e0e0e0';
  ctx.lineWidth = 1;

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const yVal = (maxVal / gridSteps) * i;
    const yPos = getY(yVal);
    ctx.moveTo(padding, yPos);
    ctx.lineTo(width - padding, yPos);
    ctx.fillStyle = '#888888';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(`$${Math.round(yVal)}`, 4, yPos + 3);
  }
  ctx.stroke();

  if (list.length === 0) return;

  // Monochrome Trend Line
  ctx.beginPath();
  ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  values.forEach((val, index) => {
    const x = padding + index * stepX;
    const y = getY(val);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Points & SKU Labels
  values.forEach((val, index) => {
    const x = padding + index * stepX;
    const y = getY(val);
    ctx.beginPath();
    ctx.fillStyle = isDark ? '#181818' : '#ffffff';
    ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
    ctx.lineWidth = 2;
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#888888';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(labels[index], x - 18, height - 14);
  });
}

function drawReportChart(products = productsArray, categories = categoriesArray) {
  const canvas = document.getElementById('reportChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const isDark = document.body.classList.contains('dark-mode');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);

  // Aggregate stock per category
  const catMap = new Map();
  categories.forEach((c) => catMap.set(c.name, 0));
  products.forEach((p) => {
    const prev = catMap.get(p.category) || 0;
    catMap.set(p.category, prev + (Number(p.stock) || 0));
  });

  const entries = Array.from(catMap.entries());
  if (entries.length === 0) return;

  const maxUnits = Math.max(...entries.map((e) => e[1]), 10) * 1.2;
  const barWidth = Math.min(54, Math.floor((width - 80) / entries.length) - 16);
  const gap = 24;
  const startX = 44;

  entries.forEach(([catName, units], i) => {
    const barHeight = Math.max(4, (units / maxUnits) * (height - 70));
    const x = startX + i * (barWidth + gap);
    const y = height - barHeight - 32;

    ctx.fillStyle = isDark ? '#f4f4f4' : '#1a1a1a';
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = '#888888';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`${units}u`, x + 4, y - 6);
    ctx.fillText(catName.slice(0, 10), x, height - 12);
  });
}

// ============================================================================
// 5. EXPRESS 5 API ACTIONS (FILTER, SEARCH, ADJUST STOCK, DELETE, CSV EXPORT)
// ============================================================================
async function loadCategoriesDropdown() {
  try {
    const res = await apiFetch('/categories');
    categoriesArray = Array.isArray(res.data) ? res.data : [];

    ['categories', 'category'].forEach((id) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const existing = new Set(Array.from(sel.options).map((o) => o.value.toLowerCase()));
      categoriesArray.forEach((cat) => {
        if (cat.name && !existing.has(cat.name.toLowerCase())) {
          const opt = document.createElement('option');
          opt.value = cat.name;
          opt.textContent = cat.name;
          sel.appendChild(opt);
        }
      });
    });
  } catch (_e) {
    // Keep existing options
  }
}

async function loadInventoryFromApi(endpoint = '/products') {
  try {
    const res = await apiFetch(endpoint);
    productsArray = Array.isArray(res.data) ? res.data : [];
    renderKPIs(productsArray);
    renderLowStock(productsArray);
    sortProducts();
    drawChart(productsArray);
  } catch (err) {
    showToast(`API Error (${err.status || 500}): ${err.message}`, true);
  }
}

async function filterCategory() {
  const sel = document.getElementById('categories');
  if (!sel) return;
  activeCategory = sel.value;

  if (activeCategory === 'All') {
    await loadInventoryFromApi('/products/category');
  } else {
    await loadInventoryFromApi(`/products/category/${encodeURIComponent(activeCategory)}`);
  }
}

async function searchItem() {
  const searchTag = document.getElementById('searchBar');
  if (!searchTag) return;

  const query = searchTag.value.trim();
  if (!query) {
    await filterCategory();
    return;
  }

  const params = new URLSearchParams({ name: query });
  if (activeCategory && activeCategory !== 'All') {
    params.set('category', activeCategory);
  }
  await loadInventoryFromApi(`/products/search?${params.toString()}`);
}

async function adjustStock(productId, delta) {
  const item = productsArray.find((p) => p.id === Number(productId));
  if (!item) return;

  const nextStock = Math.max(0, (Number(item.stock) || 0) + delta);
  if (nextStock === item.stock) return;

  try {
    const res = await apiFetch(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ stock: nextStock })
    });
    item.stock = res.data.stock;
    renderKPIs(productsArray);
    renderLowStock(productsArray);
    sortProducts();
    drawChart(productsArray);
    showToast(`Updated #${productId} "${item.name}" stock → ${res.data.stock} units`);
  } catch (err) {
    showToast(`HTTP ${err.status || 400}: ${err.message}`, true);
  }
}

async function deleteProduct(productId) {
  const item = productsArray.find((p) => p.id === Number(productId));
  const tokenInput = document.getElementById('authTokenInput');
  const token = tokenInput ? tokenInput.value.trim() : getSavedAuthToken();

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await apiFetch(`/products/${productId}`, {
      method: 'DELETE',
      headers
    });
    productsArray = productsArray.filter((p) => p.id !== Number(productId));
    renderKPIs(productsArray);
    renderLowStock(productsArray);
    sortProducts();
    drawChart(productsArray);
    showToast(res.message || `Deleted "${item ? item.name : productId}" (HTTP 200)`);
  } catch (err) {
    showToast(`DELETE Rejected (HTTP ${err.status || 401}): ${err.message}`, true);
  }
}

function exportToCSV() {
  if (!productsArray.length) {
    showToast('No product records to export.', true);
    return;
  }

  const currency = getSavedCurrency();
  const headers = ['ID', 'SKU', 'Name', 'Category', `Price_${currency}`, 'Stock', 'Description'];
  const rows = productsArray.map((p) => [
    p.id,
    `"${String(p.sku || '').replace(/"/g, '""')}"`,
    `"${String(p.name || '').replace(/"/g, '""')}"`,
    `"${String(p.category || '').replace(/"/g, '""')}"`,
    getDisplayPriceFromIdr(p.price).toFixed(currency === 'USD' ? 2 : 0),
    p.stock,
    `"${String(p.description || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `stockwise-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast(`Exported ${productsArray.length} products to CSV.`);
}

// ============================================================================
// 6. FORM PAGE LOGIC (public/form.html)
// ============================================================================
async function initProductFormPage() {
  const form = document.getElementById('productForm');
  if (!form) return;

  const pName = document.getElementById('productName');
  const pCategory = document.getElementById('category');
  const pSku = document.getElementById('sku');
  const pPrice = document.getElementById('price');
  const pQuantity = document.getElementById('quantity');
  const pDescription = document.getElementById('description');
  const editingIdField = document.getElementById('editingProductId');
  const formHeading = document.getElementById('formHeading');
  const submitBtnText = document.getElementById('submitBtnText');

  const previewStatusBadge = document.getElementById('previewStatusBadge');
  const previewEndpoint = document.getElementById('previewEndpoint');
  const previewLotValue = document.getElementById('previewLotValue');
  const previewSkuCode = document.getElementById('previewSkuCode');
  const previewStockUnits = document.getElementById('previewStockUnits');
  const previewJsonPayload = document.getElementById('previewJsonPayload');
  const priceLabel = document.getElementById('priceLabel');

  if (priceLabel) {
    const currency = getSavedCurrency();
    priceLabel.textContent = `Price (${currency === 'USD' ? 'US Dollar/USD' : 'Rupiah/IDR'}) *`;
  }
  if (pPrice) {
    pPrice.step = getSavedCurrency() === 'USD' ? '0.01' : '1';
    pPrice.placeholder = getSavedCurrency() === 'USD'
      ? 'Enter price in USD'
      : 'Enter price in Rupiah';
  }

  await loadCategoriesDropdown();

  function updateFormPreview() {
    const nameVal = pName ? pName.value.trim() : '';
    const catVal = pCategory ? pCategory.value.trim() : '';
    const skuVal = pSku ? pSku.value.trim().toUpperCase() : '';
    const displayPriceVal = pPrice && pPrice.value !== '' ? Number(pPrice.value) : 0;
    const priceVal = getIdrPriceFromDisplay(displayPriceVal);
    const qtyVal = pQuantity && pQuantity.value !== '' ? Number(pQuantity.value) : 0;
    const descVal = pDescription ? pDescription.value.trim() : '';
    const editId = editingIdField ? editingIdField.value.trim() : '';

    const autoSku =
      skuVal ||
      `${(catVal || 'PRD').slice(0, 3).toUpperCase()}-${(nameVal || 'ITM')
        .slice(0, 3)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, 'X')}`;

    if (previewEndpoint) {
      previewEndpoint.textContent = editId ? `PUT /products/${editId}` : 'POST /products';
    }
    if (previewLotValue) previewLotValue.textContent = formatMoney(priceVal * qtyVal);
    if (previewSkuCode) previewSkuCode.textContent = autoSku;
    if (previewStockUnits) previewStockUnits.textContent = `${qtyVal} units`;
    if (previewStatusBadge) {
      if (qtyVal <= 0) {
        previewStatusBadge.className = 'status-badge critical';
        previewStatusBadge.textContent = 'Out of Stock';
      } else if (qtyVal < 10) {
        previewStatusBadge.className = 'status-badge critical';
        previewStatusBadge.textContent = `Low Stock (${qtyVal})`;
      } else {
        previewStatusBadge.className = 'status-badge';
        previewStatusBadge.textContent = 'In Stock';
      }
    }

    if (previewJsonPayload) {
      const payload = {
        name: nameVal || '(required)',
        category: catVal || '(required)',
        price: priceVal,
        stock: qtyVal
      };
      if (skuVal) payload.sku = skuVal;
      if (descVal) payload.description = descVal;
      previewJsonPayload.textContent = JSON.stringify(payload, null, 2);
    }
  }

  [pName, pCategory, pSku, pPrice, pQuantity, pDescription].forEach((el) => {
    if (el) {
      el.addEventListener('input', updateFormPreview);
      el.addEventListener('change', updateFormPreview);
    }
  });

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');
  if (editId) {
    if (editingIdField) editingIdField.value = editId;
    if (formHeading) formHeading.textContent = `Edit Product #${editId}`;
    if (submitBtnText) submitBtnText.textContent = 'Update Product';

    try {
      const res = await apiFetch(`/products/${encodeURIComponent(editId)}`);
      const product = res.data;
      if (product) {
        pName.value = product.name || '';
        if (product.category) {
          const exists = Array.from(pCategory.options).some(
            (o) => o.value.toLowerCase() === product.category.toLowerCase()
          );
          if (!exists) {
            const opt = document.createElement('option');
            opt.value = product.category;
            opt.textContent = product.category;
            pCategory.appendChild(opt);
          }
          pCategory.value = product.category;
        }
        if (pSku) pSku.value = product.sku || '';
        const displayPrice = getDisplayPriceFromIdr(product.price ?? 0);
        pPrice.value = getSavedCurrency() === 'USD'
          ? displayPrice.toFixed(2)
          : String(Math.round(displayPrice));
        pQuantity.value = product.stock ?? 0;
        if (pDescription) pDescription.value = product.description || '';
        updateFormPreview();
      }
    } catch (err) {
      showToast(`Error loading product #${editId}: ${err.message}`, true);
    }
  } else {
    updateFormPreview();
  }

  form.addEventListener('reset', () => setTimeout(updateFormPreview, 10));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      name: pName.value.trim(),
      category: pCategory.value.trim(),
      price: pPrice.value === '' ? NaN : getIdrPriceFromDisplay(pPrice.value),
      stock: pQuantity.value === '' ? NaN : Number(pQuantity.value)
    };
    if (pSku && pSku.value.trim()) payload.sku = pSku.value.trim().toUpperCase();
    if (pDescription && pDescription.value.trim()) {
      payload.description = pDescription.value.trim();
    }

    const currentEditId = editingIdField ? editingIdField.value.trim() : '';

    try {
      if (currentEditId) {
        await apiFetch(`/products/${encodeURIComponent(currentEditId)}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        window.location.href = `/dashboard/index.html?toast=${encodeURIComponent(
          `Updated "${payload.name}" (HTTP 200)`
        )}`;
      } else {
        await apiFetch('/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        window.location.href = `/dashboard/index.html?toast=${encodeURIComponent(
          `Created "${payload.name}" (HTTP 201)`
        )}`;
      }
    } catch (err) {
      const detail =
        Array.isArray(err.details) && err.details.length > 0
          ? err.details.join(' ')
          : err.message;
      showToast(`HTTP ${err.status || 400}: ${detail}`, true);
    }
  });
}

// ============================================================================
// 7. REPORTS & CATEGORIES PAGE LOGIC (public/reports.html)
// ============================================================================
async function initReportsPage() {
  const catTbody = document.getElementById('categoriesTableBody');
  const catForm = document.getElementById('categoryForm');

  async function refreshReportsData() {
    try {
      const [prodRes, catRes] = await Promise.all([
        apiFetch('/products'),
        apiFetch('/categories')
      ]);
      productsArray = Array.isArray(prodRes.data) ? prodRes.data : [];
      categoriesArray = Array.isArray(catRes.data) ? catRes.data : [];

      const totalVal = productsArray.reduce(
        (sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0),
        0
      );
      const totalUnits = productsArray.reduce(
        (sum, p) => sum + (Number(p.stock) || 0),
        0
      );
      const lowCount = productsArray.filter((p) => Number(p.stock) < 10).length;

      const valEl = document.getElementById('reportTotalValuation');
      const unitEl = document.getElementById('reportTotalUnits');
      const catEl = document.getElementById('reportTotalCategories');
      const lowEl = document.getElementById('reportLowStockCount');

      if (valEl) valEl.textContent = formatMoney(totalVal);
      if (unitEl) unitEl.textContent = `${totalUnits.toLocaleString('en-US')} Units`;
      if (catEl) catEl.textContent = `${categoriesArray.length} Categories`;
      if (lowEl) lowEl.textContent = `${lowCount} Items`;

      if (catTbody) {
        catTbody.innerHTML = categoriesArray
          .map(
            (c) => `
            <tr>
              <td>#${c.id}</td>
              <td><span class="status-badge">${escapeHtml(c.code)}</span></td>
              <td><strong>${escapeHtml(c.name)}</strong></td>
              <td>${escapeHtml(c.aisle || 'General Storage')}</td>
              <td>${escapeHtml(c.description || '')}</td>
            </tr>
          `
          )
          .join('');
      }

      drawReportChart(productsArray, categoriesArray);
    } catch (err) {
      showToast(`Failed to load reports: ${err.message}`, true);
    }
  }

  if (catForm) {
    catForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        name: document.getElementById('catNameInput').value.trim(),
        code: document.getElementById('catCodeInput').value.trim(),
        aisle: document.getElementById('catAisleInput').value.trim() || 'General Storage',
        description: document.getElementById('catDescInput').value.trim()
      };

      try {
        await apiFetch('/categories', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        catForm.reset();
        showToast(`Created category "${payload.name}" (HTTP 201)`);
        await refreshReportsData();
      } catch (err) {
        showToast(`HTTP ${err.status || 400}: ${err.message}`, true);
      }
    });
  }

  await refreshReportsData();
}

// ============================================================================
// 8. SETTINGS & WILDCARD TESTER PAGE LOGIC (public/settings.html)
// ============================================================================
function initSettingsPage() {
  const settingsForm = document.getElementById('settingsForm');
  const authInput = document.getElementById('settingAuthToken');
  const themeSelect = document.getElementById('settingThemeMode');
  const currencySelect = document.getElementById('settingCurrency');
  const exchangeRateInput = document.getElementById('settingExchangeRate');
  const wildcardInput = document.getElementById('wildcardPathInput');
  const wildcardBtn = document.getElementById('runWildcardTestBtn');
  const wildcardResult = document.getElementById('wildcardResultBox');

  if (authInput) authInput.value = getSavedAuthToken();
  if (themeSelect) {
    themeSelect.value = localStorage.getItem('stockwise_theme') || 'light';
  }
  if (currencySelect) {
    currencySelect.value = getSavedCurrency();
  }
  if (exchangeRateInput) {
    exchangeRateInput.value = String(getSavedExchangeRate());
  }

  if (settingsForm) {
    settingsForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (authInput) {
        localStorage.setItem('stockwise_auth_token', authInput.value.trim());
      }
      if (themeSelect) {
        localStorage.setItem('stockwise_theme', themeSelect.value);
        applySavedTheme();
      }
      if (currencySelect) {
        localStorage.setItem('stockwise_currency', currencySelect.value);
      }
      if (exchangeRateInput) {
        const rate = Number(exchangeRateInput.value);
        if (Number.isFinite(rate) && rate > 0) {
          localStorage.setItem('stockwise_idr_per_usd', String(Math.round(rate)));
        }
      }
      showToast('Preferences saved and applied.');
    });
  }

  if (wildcardBtn && wildcardInput && wildcardResult) {
    wildcardBtn.addEventListener('click', async () => {
      const pathVal = wildcardInput.value.trim() || '/files/images/products/photo.png';
      try {
        const res = await apiFetch(pathVal);
        wildcardResult.textContent = JSON.stringify(res, null, 2);
        showToast(`Wildcard route matched ${res.segments.length} segments (HTTP 200)`);
      } catch (err) {
        wildcardResult.textContent = JSON.stringify(
          { status: err.status, error: err.message },
          null,
          2
        );
        showToast(`HTTP ${err.status || 404}: ${err.message}`, true);
      }
    });
  }
}

// ============================================================================
// 9. GLOBAL INIT ON DOMContentLoaded
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  applySavedTheme();
  renderDate();
  highlightCurrentPage();

  const currency = getSavedCurrency();
  const unitPriceHeading = document.getElementById('unitPriceHeading');
  if (unitPriceHeading) {
    unitPriceHeading.textContent = `Unit Price (${currency}) ↕`;
  }

  const authTokenInput = document.getElementById('authTokenInput');
  if (authTokenInput) {
    authTokenInput.value = getSavedAuthToken();
    authTokenInput.addEventListener('change', () => {
      localStorage.setItem('stockwise_auth_token', authTokenInput.value.trim());
    });
  }

  const params = new URLSearchParams(window.location.search);
  const toastMsg = params.get('toast');
  if (toastMsg) {
    showToast(toastMsg);
    window.history.replaceState({}, '', window.location.pathname);
  }

  const searchTag = document.getElementById('searchBar');
  let debounceTimer = null;
  if (searchTag) {
    searchTag.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(searchItem, 180);
    });
    searchTag.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        clearTimeout(debounceTimer);
        searchItem();
      }
    });
  }

  if (document.getElementById('inventoryTable')) {
    await loadCategoriesDropdown();
    await loadInventoryFromApi('/products');
  }

  if (document.getElementById('productForm')) {
    await initProductFormPage();
  }

  if (document.getElementById('reportChart')) {
    await initReportsPage();
  }

  if (document.getElementById('settingsForm')) {
    initSettingsPage();
  }

  window.addEventListener('resize', () => {
    if (document.getElementById('salesChart')) drawChart(productsArray);
    if (document.getElementById('reportChart')) {
      drawReportChart(productsArray, categoriesArray);
    }
  });
});

window.toggleSidebar = toggleSidebar;
window.sortTable = sortTable;
window.filterCategory = filterCategory;
window.sortProducts = sortProducts;
window.deleteProduct = deleteProduct;
window.adjustStock = adjustStock;
window.exportToCSV = exportToCSV;
