#!/usr/bin/env node
// scripts/test-db-connection.js
// Usage: node scripts/test-db-connection.js

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([^#=]+)=([\s\S]*)$/)
    if (!m) return
    const key = m[1].trim()
    let val = m[2].trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  })
}

async function main() {
  loadEnv()
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set in .env.local')
    process.exit(1)
  }

  const client = new Client({ connectionString: DATABASE_URL })
  try {
    console.log('Connecting to database...')
    await client.connect()
    console.log('Connected. Running test query...')
    const res = await client.query('SELECT 1 as ok')
    console.log('Test query result:', res.rows[0])
    await client.end()
    console.log('✅ Database reachable')
    process.exit(0)
  } catch (err) {
    console.error('❌ Database connection failed:')
    console.error(err)
    try { await client.end() } catch (e) {}
    process.exit(2)
  }
}

main()
