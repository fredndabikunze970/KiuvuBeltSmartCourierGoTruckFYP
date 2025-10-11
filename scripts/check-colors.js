#!/usr/bin/env node

/**
 * Color Consistency Checker for KIVU Belt Express
 *
 * This script scans the codebase for inconsistent color usage
 * and suggests improvements for design system compliance.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Define allowed color patterns based on design system
const allowedColors = {
  // Primary brand colors - all shades from design system
  primary: ['blue-50', 'blue-100', 'blue-200', 'blue-300', 'blue-400', 'blue-500', 'blue-600', 'blue-700', 'blue-800', 'blue-900'],
  secondary: ['green-50', 'green-100', 'green-200', 'green-300', 'green-400', 'green-500', 'green-600', 'green-700', 'green-800', 'green-900'],
  accent: ['amber-50', 'amber-100', 'amber-200', 'amber-300', 'amber-400', 'amber-500', 'amber-600', 'amber-700', 'amber-800', 'amber-900'],

  // Neutral colors
  neutral: ['gray-50', 'gray-100', 'gray-200', 'gray-300', 'gray-400', 'gray-500', 'gray-600', 'gray-700', 'gray-800', 'gray-900'],

  // Status colors
  status: {
    success: ['green-100', 'green-300', 'green-500', 'green-600', 'green-700', 'green-800'],
    warning: ['amber-100', 'amber-300', 'amber-500', 'amber-600', 'amber-700', 'amber-800'],
    error: ['red-100', 'red-300', 'red-500', 'red-600', 'red-700', 'red-800'],
    info: ['blue-100', 'blue-300', 'blue-500', 'blue-600', 'blue-700', 'blue-800']
  }
}

// Colors to avoid (inconsistent usage) - only truly deprecated ones
const deprecatedColors = [
  'yellow-', 'orange-', 'purple-', 'pink-', 'indigo-', 'cyan-', 'teal-', 'lime-', 'emerald-', 'sky-', 'slate-', 'zinc-'
]

function scanFiles(dir, results = { files: [], issues: [] }) {
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      scanFiles(fullPath, results)
    } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts') || (item.endsWith('.css') && !item.includes('globals')))) {
      const content = fs.readFileSync(fullPath, 'utf8')
      const issues = checkFile(fullPath, content)

      if (issues.length > 0) {
        results.files.push(fullPath)
        results.issues.push(...issues)
      }
    }
  }

  return results
}

function checkFile(filePath, content) {
  const issues = []

  // Check for deprecated colors
  for (const color of deprecatedColors) {
    const regex = new RegExp(`\\b${color}\\b`, 'g')
    const matches = content.match(regex)
    if (matches) {
      issues.push({
        file: filePath,
        type: 'deprecated',
        color,
        occurrences: matches.length,
        suggestion: getSuggestion(color)
      })
    }
  }

  // Check for hardcoded hex colors
  const hexRegex = /#[0-9a-fA-F]{3,6}/g
  const hexMatches = content.match(hexRegex)
  if (hexMatches) {
    // Filter out CSS variables and allowed colors
    const invalidHex = hexMatches.filter(hex => !isAllowedHex(hex))
    if (invalidHex.length > 0) {
      issues.push({
        file: filePath,
        type: 'hardcoded-hex',
        colors: invalidHex,
        suggestion: 'Use design system colors instead of hardcoded hex values'
      })
    }
  }

  return issues
}

function isAllowedHex(hex) {
  // Allow common design system colors and standard Tailwind hex values
  const allowedHexes = [
    '#ffffff', '#000000', '#f8fafc', '#e2e8f0', '#64748b',
    '#1e293b', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
    // Blue shades
    '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
    // Green shades
    '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#16a34a', '#15803d', '#166534', '#14532d',
    // Amber shades
    '#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#d97706', '#b45309', '#92400e', '#78350f',
    // Gray shades
    '#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717',
    // Other common
    '#f1f5f9', '#cbd5e1', '#94a3b8', '#0f172a', '#475569', '#84cc16', '#f97316', '#dc2626',
    '#10b981', '#8b5cf6', '#06b6d4', '#6b7280', '#f0f0f0', '#9e9e9e', '#fbbc04', '#7c3aed', '#ea4335', '#34a853',
    '#666', '#888', '#eee', '#059669', '#4285f4', '#15803d', '#1d4ed8'
  ]
  return allowedHexes.includes(hex.toLowerCase())
}

function getSuggestion(deprecatedColor) {
  if (deprecatedColor.includes('blue-')) {
    return 'Use blue-500, blue-600, blue-700, or blue-800 for primary colors'
  }
  if (deprecatedColor.includes('green-')) {
    return 'Use green-500, green-600, green-700, or green-800 for success colors'
  }
  if (deprecatedColor.includes('red-')) {
    return 'Use red-100, red-300, red-800 for status colors'
  }
  return 'Use colors from the design system'
}

function generateReport(results) {
  console.log('🎨 KIVU Belt Express - Color Consistency Report')
  console.log('=' .repeat(50))

  if (results.issues.length === 0) {
    console.log('✅ No color consistency issues found!')
    return
  }

  console.log(`❌ Found ${results.issues.length} issues in ${results.files.length} files\n`)

  // Group issues by type
  const issuesByType = results.issues.reduce((acc, issue) => {
    if (!acc[issue.type]) acc[issue.type] = []
    acc[issue.type].push(issue)
    return acc
  }, {})

  for (const [type, issues] of Object.entries(issuesByType)) {
    console.log(`🔍 ${type.toUpperCase()} ISSUES:`)

    issues.forEach(issue => {
      console.log(`  📁 ${path.relative(process.cwd(), issue.file)}`)
      if (issue.color) {
        console.log(`     Color: ${issue.color} (${issue.occurrences || 1} occurrences)`)
      }
      if (issue.colors) {
        console.log(`     Colors: ${issue.colors.join(', ')}`)
      }
      console.log(`     💡 ${issue.suggestion}`)
      console.log('')
    })
  }

  console.log('📖 For more information, see DESIGN_SYSTEM.md')
}

function main() {
  const projectRoot = path.join(__dirname, '..')

  try {
    console.log('🔍 Scanning for color consistency issues...')
    const results = scanFiles(projectRoot)
    generateReport(results)
  } catch (error) {
    console.error('❌ Error scanning files:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { scanFiles, checkFile }
