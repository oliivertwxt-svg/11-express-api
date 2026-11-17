import { request } from "./api.js";

const searchInput = document.querySelector("#searchInput");
const categoryFilter = document.querySelector("#categoryFilter");
const sortFilter = document.querySelector("#sortFilter");
const productRows = document.querySelector("#productRows");
const productCount = document.querySelector("#productCount");
const resultSummary = document.querySelector("#resultSummary");
const catalogContent = document.querySelector("#catalogContent");
const loadingState = document.querySelector("#loadingState");
const emptyState = document.querySelector("#emptyState");
const errorState = document.querySelector("#errorState");
const loadErrorMessage = document.querySelector("#loadErrorMessage");
const tableWrap = document.querySelector("#tableWrap");
const productDialog = document.querySelector("#productDialog");
const productForm = document.querySelector("#productForm");
const submitProduct = document.querySelector("#submitProduct");
const formError = document.querySelector("#formError");
const toast = document.querySelector("#toast");
const fieldElements = {
  name: {
    input: document.querySelector("#productName"),
    error: document.querySelector("#productNameError"),
  },
  sku: {
    input: document.querySelector("#productSku"),
    error: document.querySelector("#productSkuError"),
  },
  category: {
    input: document.querySelector("#productCategory"),
    error: document.querySelector("#productCategoryError"),
  },
  price: {
    input: document.querySelector("#productPrice"),
    error: document.querySelector("#productPriceError"),
  },
  stock: {
    input: document.querySelector("#productStock"),
    error: document.querySelector("#productStockError"),
  },
};

let products = [];
let searchTimeout;
let toastTimeout;
let latestLoad = 0;
const busyProductIds = new Set();
const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

function showToast(message, type = "success") {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.dataset.type = type;
  toast.hidden = false;
  toastTimeout = window.setTimeout(() => {
    toast.hidden = true;
  }, 3600);
}

function setLoading() {
  catalogContent.setAttribute("aria-busy", "true");
  loadingState.hidden = false;
  emptyState.hidden = true;
  errorState.hidden = true;
  tableWrap.hidden = true;
}

function renderProducts() {
  const fragment = document.createDocumentFragment();
  for (const product of products) {
    fragment.append(createProductRow(product));
  }
  productRows.replaceChildren(fragment);

  const hasProducts = products.length > 0;
  catalogContent.setAttribute("aria-busy", "false");
  productCount.textContent = String(products.length);
  resultSummary.textContent = products.length === 1 ? "1 item in this view" : `${products.length} items in this view`;
  loadingState.hidden = true;
  errorState.hidden = true;
  emptyState.hidden = hasProducts;
  tableWrap.hidden = !hasProducts;
}

function showLoadError(error) {
  catalogContent.setAttribute("aria-busy", "false");
  loadingState.hidden = true;
  emptyState.hidden = true;
  tableWrap.hidden = true;
  errorState.hidden = false;
  loadErrorMessage.textContent = error.message || "Please try again.";
}

function createProductRow(product) {
  const row = document.createElement("tr");

  const identityCell = document.createElement("td");
  identityCell.className = "product-identity";
  const name = document.createElement("span");
  name.className = "product-name";
  name.textContent = product.name;
  const sku = document.createElement("span");
  sku.className = "product-sku";
  sku.textContent = product.sku;
  identityCell.append(name, sku);

  const categoryCell = document.createElement("td");
  const category = document.createElement("span");
  category.className = "category-badge";
  category.textContent = product.category;
  categoryCell.append(category);

  const priceCell = document.createElement("td");
  priceCell.className = "numeric-cell price-cell";
  priceCell.textContent = currency.format(product.price);

  const stockCell = document.createElement("td");
  const stockControls = document.createElement("div");
  stockControls.className = "stock-controls";
  const decrease = document.createElement("button");
  decrease.className = "stock-button";
  decrease.type = "button";
  decrease.textContent = "−";
  decrease.setAttribute("aria-label", `Decrease stock for ${product.name}`);
  decrease.disabled = product.stock <= 0 || busyProductIds.has(product.id);
  decrease.addEventListener("click", () => changeStock(product, -1));

  const stockValue = document.createElement("span");
  stockValue.className = "stock-value";
  stockValue.textContent = String(product.stock);

  const increase = document.createElement("button");
  increase.className = "stock-button";
  increase.type = "button";
  increase.textContent = "+";
  increase.setAttribute("aria-label", `Increase stock for ${product.name}`);
  increase.disabled = busyProductIds.has(product.id);
  increase.addEventListener("click", () => changeStock(product, 1));
  stockControls.append(decrease, stockValue, increase);
  stockCell.append(stockControls);

  const actionsCell = document.createElement("td");
  actionsCell.className = "actions-cell";
  const remove = document.createElement("button");
  remove.className = "icon-button delete-button";
  remove.type = "button";
  remove.textContent = "⌫";
  remove.title = "Delete product";
  remove.setAttribute("aria-label", `Delete ${product.name}`);
  remove.disabled = busyProductIds.has(product.id);
  remove.addEventListener("click", () => deleteProduct(product));
  actionsCell.append(remove);

  row.append(identityCell, categoryCell, priceCell, stockCell, actionsCell);
  return row;
}

async function loadProducts() {
  const loadId = ++latestLoad;
  const params = new URLSearchParams();
  const query = searchInput.value.trim();

  if (query) {
    params.set("q", query);
  }
  if (categoryFilter.value) {
    params.set("category", categoryFilter.value);
  }
  if (sortFilter.value) {
    params.set("sort", sortFilter.value);
  }

  setLoading();
  try {
    const queryString = params.toString();
    const result = await request(`/products${queryString ? `?${queryString}` : ""}`);
    if (loadId !== latestLoad) {
      return;
    }

    products = result;
    renderProducts();
  } catch (error) {
    if (loadId !== latestLoad) {
      return;
    }
    showLoadError(error);
    showToast(error.message, "error");
  }
}

async function changeStock(product, amount) {
  const nextStock = product.stock + amount;
  if (nextStock < 0 || busyProductIds.has(product.id)) {
    return;
  }

  const loadId = latestLoad;
  busyProductIds.add(product.id);
  if (loadId === latestLoad) {
    renderProducts();
  }

  try {
    const updated = await request(`/products/${encodeURIComponent(product.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: nextStock }),
    });

    if (loadId === latestLoad) {
      products = products.map((item) => (item.id === updated.id ? updated : item));
      renderProducts();
    }
    showToast("Stock updated.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    busyProductIds.delete(product.id);
    if (loadId === latestLoad) {
      renderProducts();
    }
  }
}

async function deleteProduct(product) {
  if (busyProductIds.has(product.id)) {
    return;
  }
  if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) {
    return;
  }

  const loadId = latestLoad;
  busyProductIds.add(product.id);
  if (loadId === latestLoad) {
    renderProducts();
  }

  try {
    await request(`/products/${encodeURIComponent(product.id)}`, {
      method: "DELETE",
    });

    if (loadId === latestLoad) {
      products = products.filter((item) => item.id !== product.id);
      renderProducts();
    }
    showToast("Product deleted.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    busyProductIds.delete(product.id);
    if (loadId === latestLoad) {
      renderProducts();
    }
  }
}

function clearFormErrors() {
  formError.textContent = "";
  formError.hidden = true;
  for (const { input, error } of Object.values(fieldElements)) {
    input.removeAttribute("aria-invalid");
    error.textContent = "";
  }
}

function displayValidationErrors(error) {
  clearFormErrors();
  const summary = [];

  for (const [field, message] of Object.entries(error.fields || {})) {
    const elements = fieldElements[field];
    if (elements) {
      elements.input.setAttribute("aria-invalid", "true");
      elements.error.textContent = message;
    } else {
      summary.push(`${field}: ${message}`);
    }
  }

  if (summary.length > 0) {
    formError.textContent = summary.join(" ");
    formError.hidden = false;
  } else if (Object.keys(error.fields || {}).length === 0) {
    formError.textContent = error.message;
    formError.hidden = false;
  }

  const firstInvalid = Object.values(fieldElements).find(({ input }) =>
    input.hasAttribute("aria-invalid"),
  );
  firstInvalid?.input.focus();
}

document.querySelector("#openProductDialog").addEventListener("click", () => {
  clearFormErrors();
  productDialog.showModal();
  fieldElements.name.input.focus();
});

document.querySelector("#closeProductDialog").addEventListener("click", () => {
  productDialog.close();
});

document.querySelector("#cancelProduct").addEventListener("click", () => {
  productDialog.close();
});

productDialog.addEventListener("close", () => {
  productForm.reset();
  clearFormErrors();
});

productForm.addEventListener("input", (event) => {
  const input = event.target;
  if (input.name && fieldElements[input.name]) {
    input.removeAttribute("aria-invalid");
    fieldElements[input.name].error.textContent = "";
  }
  formError.hidden = true;
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFormErrors();
  if (!productForm.reportValidity()) {
    return;
  }

  const formData = new FormData(productForm);
  const body = {
    name: formData.get("name"),
    sku: formData.get("sku"),
    category: formData.get("category"),
    price: Number(formData.get("price")),
    stock: Number(formData.get("stock")),
  };

  submitProduct.disabled = true;
  submitProduct.textContent = "Adding...";
  try {
    await request("/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    productDialog.close();
    showToast("Product added to your catalog.");
    await loadProducts();
  } catch (error) {
    if (error.status === 422) {
      displayValidationErrors(error);
    }
    showToast(error.message, "error");
  } finally {
    submitProduct.disabled = false;
    submitProduct.textContent = "Add product";
  }
});

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimeout);
  searchTimeout = window.setTimeout(loadProducts, 300);
});

categoryFilter.addEventListener("change", loadProducts);
sortFilter.addEventListener("change", loadProducts);

document.querySelector("#clearFilters").addEventListener("click", () => {
  window.clearTimeout(searchTimeout);
  searchInput.value = "";
  categoryFilter.value = "";
  sortFilter.value = "";
  loadProducts();
});

document.querySelector("#retryLoad").addEventListener("click", loadProducts);

loadProducts();
