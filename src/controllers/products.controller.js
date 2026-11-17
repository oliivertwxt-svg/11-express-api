import HttpError from "../errors/http-error.js";
import {
  createProduct as createProductRecord,
  deleteProduct as deleteProductRecord,
  findProductById,
  listProducts,
  patchProduct as patchProductRecord,
  replaceProduct as replaceProductRecord,
} from "../services/products.service.js";

export async function getProducts(req, res) {
  const products = await listProducts({
    category: req.query.category,
    q: req.query.q,
    sort: req.query.sort,
  });

  res.json({ data: products });
}

export async function getProduct(req, res) {
  const product = await findProductById(req.params.id);

  if (!product) {
    throw new HttpError(404, "Product not found");
  }

  return res.json({ data: product });
}

export async function createProduct(req, res) {
  const product = await createProductRecord(req.body);
  res.location(`/api/products/${product.id}`);
  return res.status(201).json({ data: product });
}

export async function replaceProduct(req, res) {
  const product = await replaceProductRecord(req.params.id, req.body);
  return res.json({ data: product });
}

export async function patchProduct(req, res) {
  const product = await patchProductRecord(req.params.id, req.body);
  return res.json({ data: product });
}

export async function deleteProduct(req, res) {
  await deleteProductRecord(req.params.id);
  return res.status(204).end();
}
