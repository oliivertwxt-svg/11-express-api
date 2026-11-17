import { findProductById, listProducts } from "../services/products.service.js";

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
    return res.status(404).json({ error: { message: "Product not found" } });
  }

  return res.json({ data: product });
}
