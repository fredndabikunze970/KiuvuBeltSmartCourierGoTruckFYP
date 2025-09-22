const { neon } = require("@neondatabase/serverless")

async function runMigrations() {
  const sql = neon(process.env.DATABASE_URL)

  console.log("Running database migrations...")

  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        role VARCHAR(50) DEFAULT 'customer',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create packages table
    await sql`
      CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        tracking_number VARCHAR(100) UNIQUE NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        sender_phone VARCHAR(20) NOT NULL,
        sender_address TEXT NOT NULL,
        receiver_name VARCHAR(255) NOT NULL,
        receiver_phone VARCHAR(20) NOT NULL,
        receiver_address TEXT NOT NULL,
        package_type VARCHAR(100),
        weight DECIMAL(10,2),
        dimensions VARCHAR(100),
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create tracking table
    await sql`
      CREATE TABLE IF NOT EXISTS tracking (
        id SERIAL PRIMARY KEY,
        package_id INTEGER REFERENCES packages(id),
        status VARCHAR(100) NOT NULL,
        location VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        package_id INTEGER REFERENCES packages(id),
        recipient_phone VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    console.log("✅ Database migrations completed successfully!")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  }
}

runMigrations()
