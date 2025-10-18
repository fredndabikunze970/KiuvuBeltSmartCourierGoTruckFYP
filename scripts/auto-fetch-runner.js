#!/usr/bin/env node
/**
 * Robust auto-fetch runner
 * Usage: NODE_ENV=production API_URL=http://localhost:3000/api/packages/auto-transition INTERVAL_MS=30000 node scripts/auto-fetch-runner.js
 */
const fetch = globalThis.fetch || require('node-fetch')

const API_URL = process.env.API_URL || 'http://localhost:3000/api/packages/auto-transition'
const INTERVAL_MS = Number(process.env.INTERVAL_MS) || 30000

console.log(`Starting auto-fetch-runner -> ${API_URL} every ${INTERVAL_MS}ms`)

async function runOnce() {
  try {
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    const data = await res.json().catch(() => ({}))
    console.log(new Date().toISOString(), 'auto-fetch result:', data)
  } catch (err) {
    console.error(new Date().toISOString(), 'auto-fetch error:', err)
  }
}

// Run immediately then on interval
void runOnce()
setInterval(() => void runOnce(), INTERVAL_MS)
