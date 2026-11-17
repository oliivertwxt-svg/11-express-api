# Express Products API

A file-backed REST API built with Node.js and Express 5.

## Run locally

```sh
npm install
npm run dev
```

The API listens on port `3000` by default. Set `PORT` to use another port.

## Endpoints

Successful responses use `{ "data": ... }`. Errors use
`{ "error": { "message": "..." } }`; validation errors also include a
`fields` object with field-specific messages.

Product request bodies use these fields:

| Field | Constraints |
| --- | --- |
| `name` | String, 2–100 characters |
| `sku` | Unique string matching `^[A-Z]{3}-\d{4}$` |
| `category` | `Home & Kitchen`, `Outdoor`, `Electronics`, `Accessories`, or `Stationery` |
| `price` | Number greater than 0 |
| `stock` | Integer greater than or equal to 0 |

| Method | Path | Body | Success code | Error codes |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | — | 200 | 500 |
| GET | `/api/products` | — (optional `category`, `q`, and `sort` query parameters) | 200 | 500 |
| GET | `/api/products/:id` | — | 200 | 404, 500 |
| POST | `/api/products` | All product fields | 201 | 400, 422, 500 |
| PUT | `/api/products/:id` | All product fields (full replacement) | 200 | 400, 404, 422, 500 |
| PATCH | `/api/products/:id` | One or more product fields (partial update) | 200 | 400, 404, 422, 500 |
| DELETE | `/api/products/:id` | — | 204 | 404, 500 |
| Any | Unknown route | — | — | 404 |

`sort=price` sorts by ascending price; `sort=-price` sorts by descending price.
Product categories are matched case-insensitively. Search (`q`) matches the
product name, SKU, or category.

### Status codes

- **200** — Request succeeded and returned a response body.
- **201** — Product created; the response includes a `Location` header.
- **204** — Product deleted successfully; there is no response body.
- **400** — Malformed request, such as invalid JSON.
- **404** — Product or route was not found.
- **422** — Request was understood, but product validation failed.
- **500** — Unexpected server-side error.

## curl examples

List products, search, and sort:

```sh
curl http://localhost:3000/api/products
curl "http://localhost:3000/api/products?category=Outdoor&q=trail"
curl "http://localhost:3000/api/products?sort=-price"
```

Create a product:

```sh
curl -i -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Desk Lamp","sku":"HOM-4510","category":"Home & Kitchen","price":34.99,"stock":15}'
```

Set `ID` to the `id` returned by the create response, then use it for subsequent
requests:

```sh
ID="paste-created-product-id-here"

curl -i -X PUT "http://localhost:3000/api/products/${ID}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Desk Lamp Plus","sku":"HOM-4511","category":"Home & Kitchen","price":39.99,"stock":10}'

curl -i -X PATCH "http://localhost:3000/api/products/${ID}" \
  -H "Content-Type: application/json" \
  -d '{"stock":8}'

curl -i -X DELETE "http://localhost:3000/api/products/${ID}"
```

## VS Code REST Client

Open [requests.http](./requests.http) and use **Send Request** above a request.
The `create` request provides an ID reused by the subsequent get, update,
patch, delete, and not-found requests. The duplicate-SKU request uses the
existing SKU `HOM-0001`.
