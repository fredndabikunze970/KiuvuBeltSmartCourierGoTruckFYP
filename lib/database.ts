import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

export const sql = neon(process.env.DATABASE_URL)

// Database utility functions
export const db = {
  async query(query: string | { text: string; values: any[] }) {
    try {
      if (typeof query === 'string') {
        // If string query, use tagged template literal
        return await sql`${query}`
      }
      // Use sql.query for parameterized queries
      return await sql.query(query.text, query.values)
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
