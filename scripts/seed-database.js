const { neon } = require("@neondatabase/serverless")
const bcrypt = require("bcryptjs")

async function seedDatabase() {
  const sql = neon(process.env.DATABASE_URL)

  console.log("Seeding database with test data...")

  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10)

    await sql`
      INSERT INTO users (email, password_hash, full_name, phone_number, role, status)
      VALUES ('admin@kivubelt.com', ${hashedPassword}, 'System Administrator', '+250788123456', 'admin', 'active')
      ON CONFLICT (email) DO NOTHING
    `

    // Create test customer
    const customerPassword = await bcrypt.hash("customer123", 10)

    await sql`
      INSERT INTO users (email, password_hash, full_name, phone_number, role, status)
      VALUES ('customer@test.com', ${customerPassword}, 'John Doe', '+250788654321', 'customer', 'active')
      ON CONFLICT (email) DO NOTHING
    `

    // Create sample packages
    const packages = [
      {
        tracking_number: "KB001234567",
        sender_name: "Alice Uwimana",
        sender_phone: "+250788111222",
        sender_address: "Kigali, Gasabo District",
        receiver_name: "Bob Nkurunziza",
        receiver_phone: "+250788333444",
        receiver_address: "Butare, Huye District",
        package_type: "Documents",
        weight: 0.5,
        dimensions: "30x20x5 cm",
        description: "Important business documents",
        status: "in_transit",
      },
      {
        tracking_number: "KB001234568",
        sender_name: "Grace Mukamana",
        sender_phone: "+250788555666",
        sender_address: "Musanze, Northern Province",
        receiver_name: "David Habimana",
        receiver_phone: "+250788777888",
        receiver_address: "Rubavu, Western Province",
        package_type: "Electronics",
        weight: 2.5,
        dimensions: "40x30x15 cm",
        description: "Mobile phone and accessories",
        status: "pending",
      },
    ]

    for (const pkg of packages) {
      await sql`
        INSERT INTO packages (
          tracking_number, sender_name, sender_phone, sender_address,
          receiver_name, receiver_phone, receiver_address, package_type,
          weight, dimensions, description, status, created_by
        )
        VALUES (
          ${pkg.tracking_number}, ${pkg.sender_name}, ${pkg.sender_phone}, ${pkg.sender_address},
          ${pkg.receiver_name}, ${pkg.receiver_phone}, ${pkg.receiver_address}, ${pkg.package_type},
          ${pkg.weight}, ${pkg.dimensions}, ${pkg.description}, ${pkg.status}, 1
        )
        ON CONFLICT (tracking_number) DO NOTHING
      `
    }

    // Add tracking data
    const trackingData = [
      {
        package_id: 1,
        status: "Package picked up",
        location: "Kigali Sorting Center",
        latitude: -1.9441,
        longitude: 30.0619,
        notes: "Package collected from sender",
      },
      {
        package_id: 1,
        status: "In transit",
        location: "Muhanga Transit Hub",
        latitude: -2.0853,
        longitude: 29.7089,
        notes: "Package in transit to destination",
      },
    ]

    for (const track of trackingData) {
      await sql`
        INSERT INTO tracking (package_id, status, location, latitude, longitude, notes)
        VALUES (${track.package_id}, ${track.status}, ${track.location}, ${track.latitude}, ${track.longitude}, ${track.notes})
      `
    }

    console.log("✅ Database seeded successfully!")
    console.log("📧 Admin login: admin@kivubelt.com / admin123")
    console.log("👤 Customer login: customer@test.com / customer123")
  } catch (error) {
    console.error("❌ Seeding failed:", error)
    process.exit(1)
  }
}

seedDatabase()
