import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10,2) NOT NULL,
      available BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      delivery_date DATE NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_method TEXT NOT NULL,
      total NUMERIC(10,2) NOT NULL,
      telegram_message_id BIGINT,
      confirmed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id),
      item_name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      price NUMERIC(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO menu_items (name, description, price) VALUES
      ('Salted Honey', 'Sweet honey with a hint of salt.', 6.00),
      ('Salted Caramel', 'Rich caramel balanced with the perfect pinch of salt.', 6.00),
      ('Vanilla', 'Smooth, classic vanilla with a sweet finish.', 6.00),
      ('White Mocha', 'Creamy white chocolate with a hint of coffee.', 6.00)
    ON CONFLICT DO NOTHING;

    INSERT INTO settings (key, value) VALUES ('min_delivery_days', '2')
    ON CONFLICT DO NOTHING;
  `)

  console.log('✅ Migration complete')
  await pool.end()
}

migrate().catch(console.error)
