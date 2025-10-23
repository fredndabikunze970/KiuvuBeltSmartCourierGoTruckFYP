#!/usr/bin/env node
// scripts/run-arrival-check.js
// Simple CLI to run the arrival SQL for a package id. Usage:
//   node scripts/run-arrival-check.js <package_id>

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
    // remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  })
}

async function main() {
  loadEnv()
  const packageId = process.argv[2]
  if (!packageId) {
    console.error('Usage: node scripts/run-arrival-check.js <package_id>')
    process.exit(1)
  }

  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not set in .env.local')
    process.exit(1)
  }

  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  try {
    const receiverLocationRes = await client.query('SELECT receiver_address FROM packages WHERE package_id = $1', [packageId])
    const receiverLocation = receiverLocationRes.rows[0] ? (receiverLocationRes.rows[0].receiver_address || 'Destination') : 'Destination'

    const sql = `WITH upd_pkg AS (
      UPDATE packages
      SET status = 'arrived', updated_at = NOW(), delivered_at = NOW()
      WHERE package_id = $1 AND (status IS DISTINCT FROM 'arrived')
      RETURNING package_id
    ),
    upd_tracking AS (
      UPDATE tracking
      SET progress_percentage = 100,
          status = 'arrived',
          notes = CASE WHEN notes IS NULL OR notes = '' THEN 'Package successfully arrived at destination' ELSE notes || ' | Package successfully arrived at destination' END
      WHERE package_id = $1
        AND (progress_percentage IS NULL OR progress_percentage < 100 OR status IS DISTINCT FROM 'arrived')
      RETURNING id
    ),
    ins AS (
      INSERT INTO tracking (package_id, status, location_name, progress_percentage, notes, updated_by)
      SELECT $1, 'arrived', $2, 100, 'Package successfully arrived at destination - Delivery complete', NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM tracking WHERE package_id = $1 AND status = 'arrived' AND progress_percentage = 100
      )
      RETURNING id, created_at
    )
    SELECT (SELECT count(*) FROM upd_pkg) AS pkg_updated,
           (SELECT count(*) FROM upd_tracking) AS tracking_updated,
           (SELECT id FROM ins) AS new_tracking_id;`

    const res = await client.query(sql, [packageId, receiverLocation])
    console.log('Result:', res.rows[0])
  } catch (err) {
    console.error('Error running arrival check:', err)
  } finally {
    await client.end()
  }
}

main()
