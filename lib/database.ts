import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

export const sql = neon(process.env.DATABASE_URL)

// Database utility functions
export const db = {
  async query(text: string, params?: any[]) {
    try {
      if (!params) {
        // If no params, use tagged template literal
        return await sql`${text}`
      }
      // Use sql.query for parameterized queries
      return await sql.query(text, params)
    } catch (error) {
      console.error("Database query error:", error)
      throw error
    }
  },

  // Test database connection
  async testConnection() {
    try {
      await sql`SELECT 1 as test`
      console.log("✅ Database connection successful")
      return true
    } catch (error) {
      console.error("❌ Database connection failed:", error)
      return false
    }
  }
}
