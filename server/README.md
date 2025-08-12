RoyalRaptorPOS API (Express + MongoDB)

Quick start

1. Copy `.env.example` to `.env` and adjust values
2. Install deps: `npm install`
3. Run dev server: `npm run dev`

API

- `GET /api/health` health check
- `GET /api/products` list products
- `POST /api/products` create product
- `PUT /api/products/:id` update product
- `DELETE /api/products/:id` delete product
- `GET /api/orders` list orders
- `POST /api/orders` create order

Data shapes

- Product: `{ name, sku, price, stock, category }`
- Create order: `{ items: [{ productId, quantity }] }`


