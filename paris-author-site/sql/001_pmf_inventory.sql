-- P.M. France Bookstore: independent transactional inventory and Square order ledger.
-- Applied to dedicated Neon project "P.M. France Bookstore Inventory" / pmf_bookstore.
CREATE TABLE IF NOT EXISTS pmf_inventory (
 product_id UUID PRIMARY KEY,
 stock_total INTEGER NOT NULL CHECK (stock_total >= 0),
 stock_sold INTEGER NOT NULL DEFAULT 0 CHECK (stock_sold >= 0),
 stock_reserved INTEGER NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CONSTRAINT pmf_inventory_nonnegative CHECK (stock_total >= stock_sold + stock_reserved)
);
CREATE TABLE IF NOT EXISTS pmf_checkout_reservations (
 id UUID PRIMARY KEY,
 status TEXT NOT NULL DEFAULT 'preparing'
   CHECK (status IN ('preparing','awaiting_payment','paid','released','review')),
 square_order_id TEXT UNIQUE,
 square_link_id TEXT UNIQUE,
 payment_id TEXT UNIQUE,
 expected_total_cents INTEGER NOT NULL CHECK(expected_total_cents > 0),
 reserved_until TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '45 minutes',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 paid_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS pmf_reservation_items (
 reservation_id UUID NOT NULL REFERENCES pmf_checkout_reservations(id),
 product_id UUID NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 40),
 tracked BOOLEAN NOT NULL,
 PRIMARY KEY (reservation_id,product_id)
);
CREATE INDEX IF NOT EXISTS pmf_checkout_status_idx
 ON pmf_checkout_reservations(status,reserved_until);
CREATE INDEX IF NOT EXISTS pmf_reservation_items_product_idx
 ON pmf_reservation_items(product_id);
CREATE TABLE IF NOT EXISTS pmf_square_webhook_events (
 event_id TEXT PRIMARY KEY,
 event_type TEXT NOT NULL,
 processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
