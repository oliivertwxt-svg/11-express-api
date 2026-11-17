import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import HttpError from "../errors/http-error.js";

const productsDirectory = new URL("../data/", import.meta.url);
const productsFile = new URL("products.json", productsDirectory);
let writeQueue = Promise.resolve();

async function readProducts() {
  const contents = await readFile(productsFile, "utf8");
  return JSON.parse(contents);
}

function serializeWrite(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.catch(() => {});
  return result;
}

async function renameWithRetry(tempFile) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(tempFile, productsFile);
      return;
    } catch (error) {
      if (
        !["EPERM", "EACCES", "EBUSY"].includes(error.code) ||
        attempt >= 7
      ) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
    }
  }
}

async function writeProducts(products) {
  const tempFile = new URL(
    `products-${process.pid}-${randomUUID()}.tmp`,
    productsDirectory,
  );

  try {
    await writeFile(tempFile, `${JSON.stringify(products, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    await renameWithRetry(tempFile);
  } catch (error) {
    try {
      await rm(tempFile, { force: true });
    } catch (cleanupError) {
      console.error("Failed to remove a temporary products file", cleanupError);
    }
    throw error;
  }
}

function assertUniqueSku(products, sku, excludedId) {
  if (products.some((product) => product.id !== excludedId && product.sku === sku)) {
    throw new HttpError(422, "Product validation failed", {
      sku: "must be unique",
    });
  }
}

export async function listProducts({ category, q, sort } = {}) {
  let products = await readProducts();

  if (typeof category === "string" && category.trim()) {
    const normalizedCategory = category.trim().toLowerCase();
    products = products.filter(
      (product) => product.category.toLowerCase() === normalizedCategory,
    );
  }

  if (typeof q === "string" && q.trim()) {
    const searchTerm = q.trim().toLowerCase();
    products = products.filter((product) =>
      [product.name, product.sku, product.category].some((value) =>
        value.toLowerCase().includes(searchTerm),
      ),
    );
  }

  if (sort === "price" || sort === "-price") {
    const direction = sort === "price" ? 1 : -1;
    products.sort((a, b) => direction * (a.price - b.price));
  }

  return products;
}

export async function findProductById(id) {
  const products = await readProducts();
  return products.find((product) => product.id === id) || null;
}

export async function isSkuAvailable(sku, excludedId) {
  const products = await readProducts();
  return !products.some(
    (product) => product.id !== excludedId && product.sku === sku,
  );
}

export function createProduct(productData) {
  return serializeWrite(async () => {
    const products = await readProducts();
    assertUniqueSku(products, productData.sku);

    const product = {
      ...productData,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    await writeProducts([...products, product]);
    return product;
  });
}

export function replaceProduct(id, productData) {
  return serializeWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);

    if (index === -1) {
      throw new HttpError(404, "Product not found");
    }

    assertUniqueSku(products, productData.sku, id);
    const product = {
      ...productData,
      id: products[index].id,
      createdAt: products[index].createdAt,
    };
    products[index] = product;

    await writeProducts(products);
    return product;
  });
}

export function patchProduct(id, changes) {
  return serializeWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);

    if (index === -1) {
      throw new HttpError(404, "Product not found");
    }

    const currentProduct = products[index];
    const product = { ...currentProduct, ...changes };
    assertUniqueSku(products, product.sku, id);
    products[index] = product;

    await writeProducts(products);
    return product;
  });
}

export function deleteProduct(id) {
  return serializeWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);

    if (index === -1) {
      throw new HttpError(404, "Product not found");
    }

    products.splice(index, 1);
    await writeProducts(products);
  });
}
