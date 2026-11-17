import HttpError from "../errors/http-error.js";
import { isSkuAvailable } from "../services/products.service.js";

const productFields = ["name", "sku", "category", "price", "stock"];
const allowedCategories = new Set([
  "Home & Kitchen",
  "Outdoor",
  "Electronics",
  "Accessories",
  "Stationery",
]);
const skuPattern = /^[A-Z]{3}-\d{4}$/;

export async function validateProduct(req, res, next) {
  const isPartial = req.method === "PATCH";
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(422, "Product validation failed", {
      body: "must be a JSON object",
    });
  }

  const fields = {};
  const bodyKeys = Object.keys(body);

  for (const key of bodyKeys) {
    if (!productFields.includes(key)) {
      fields[key] = "is not allowed";
    }
  }

  if (isPartial && bodyKeys.length === 0) {
    fields.body = "must include at least one product field";
  }

  for (const field of productFields) {
    if (!Object.hasOwn(body, field)) {
      if (!isPartial) {
        fields[field] = "is required";
      }
      continue;
    }

    const value = body[field];

    switch (field) {
      case "name":
        if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 100) {
          fields.name = "must be a string between 2 and 100 characters";
        } else {
          body.name = value.trim();
        }
        break;
      case "sku":
        if (typeof value !== "string" || !skuPattern.test(value)) {
          fields.sku = "must match the pattern AAA-0000";
        }
        break;
      case "category":
        if (typeof value !== "string" || !allowedCategories.has(value)) {
          fields.category = `must be one of: ${[...allowedCategories].join(", ")}`;
        }
        break;
      case "price":
        if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
          fields.price = "must be a number greater than 0";
        }
        break;
      case "stock":
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
          fields.stock = "must be an integer greater than or equal to 0";
        }
        break;
    }
  }

  if (typeof body.sku === "string" && skuPattern.test(body.sku)) {
    const available = await isSkuAvailable(body.sku, req.params.id);
    if (!available) {
      fields.sku = "must be unique";
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(422, "Product validation failed", fields);
  }

  req.body = Object.fromEntries(
    productFields
      .filter((field) => Object.hasOwn(body, field))
      .map((field) => [field, body[field]]),
  );
  return next();
}
