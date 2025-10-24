import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set.\n" +
      "Set DATABASE_URL to your Postgres connection string (e.g. postgres://user:pass@host:5432/dbname)\n" +
      "During local development you can add it to a .env file or set it in your shell."
  )
}

export const sql = neon(process.env.DATABASE_URL)

// Database utility functions
export const db = {
  async query(query: string | { text: string; values: any[] }, values?: any[]) {
    try {
      // If caller passed an object with text/values
      if (typeof query === 'object' && query !== null && 'text' in query) {
        return await sql.query(query.text, query.values)
      }

      // If a plain string is provided, allow optional values array as second arg
      let res: any
      if (typeof query === 'string') {
        if (Array.isArray(values) && values.length) {
          res = await sql.query(query, values)
        } else {
          // No parameters: execute simple query
          res = await sql.query(query)
        }
      } else {
        throw new Error('Unsupported query signature')
      }

      // Normalize return: many callers expect either an array of rows or an object with `.rows`.
      // If the driver returned an object with `.rows`, return the rows array but keep a `.rows` property on it.
      const rows = Array.isArray(res) ? res : (res && res.rows ? res.rows : [])
      try {
        // Attach `.rows` property to the returned array for callers that expect an object with rows
        if (Array.isArray(rows) && !(rows as any).rows) {
          Object.defineProperty(rows, 'rows', {
            value: rows,
            enumerable: false,
            writable: false,
            configurable: true,
          })
        }
      } catch (e) {
        // Ignore defineProperty failures
      }

      return rows
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
