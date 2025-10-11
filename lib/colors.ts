/**
 * KIVU Belt Express - Professional Color System
 *
 * This file defines the consistent color palette and design tokens
 * used throughout the application for a professional appearance.
 */

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#eff6ff',   // Very light blue
    100: '#dbeafe',  // Light blue
    200: '#bfdbfe',  // Lighter blue
    300: '#93c5fd',  // Light medium blue
    400: '#60a5fa',  // Medium blue
    500: '#3b82f6',  // Brand blue
    600: '#2563eb',  // Darker blue
    700: '#1d4ed8',  // Dark blue
    800: '#1e40af',  // Very dark blue
    900: '#1e3a8a',  // Darkest blue
  },

  // Secondary Colors (Success/Delivery)
  secondary: {
    50: '#f0fdf4',   // Very light green
    100: '#dcfce7',  // Light green
    200: '#bbf7d0',  // Lighter green
    300: '#86efac',  // Light medium green
    400: '#4ade80',  // Medium green
    500: '#22c55e',  // Success green
    600: '#16a34a',  // Darker green
    700: '#15803d',  // Dark green
    800: '#166534',  // Very dark green
    900: '#14532d',  // Darkest green
  },

  // Accent Colors (Warnings/Notifications)
  accent: {
    50: '#fffbeb',   // Very light amber
    100: '#fef3c7',  // Light amber
    200: '#fde68a',  // Lighter amber
    300: '#fcd34d',  // Light medium amber
    400: '#fbbf24',  // Medium amber
    500: '#f59e0b',  // Warning amber
    600: '#d97706',  // Darker amber
    700: '#b45309',  // Dark amber
    800: '#92400e',  // Very dark amber
    900: '#78350f',  // Darkest amber
  },

  // Neutral Colors
  neutral: {
    50: '#fafafa',   // Very light gray
    100: '#f5f5f5',  // Light gray
    200: '#e5e5e5',  // Lighter gray
    300: '#d4d4d4',  // Light medium gray
    400: '#a3a3a3',  // Medium gray
    500: '#737373',  // Gray
    600: '#525252',  // Darker gray
    700: '#404040',  // Dark gray
    800: '#262626',  // Very dark gray
    900: '#171717',  // Darkest gray
  },

  // Status Colors
  status: {
    success: '#22c55e',    // Green for success
    warning: '#f59e0b',    // Amber for warnings
    error: '#ef4444',      // Red for errors
    info: '#3b82f6',       // Blue for info
    pending: '#f59e0b',    // Amber for pending
    delivered: '#22c55e',  // Green for delivered
    inTransit: '#3b82f6',  // Blue for in transit
    failed: '#ef4444',     // Red for failed
  },

  // Semantic Colors for specific use cases
  semantic: {
    // Backgrounds
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },

    // Text
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      tertiary: '#94a3b8',
      inverse: '#ffffff',
      muted: '#64748b',
    },

    // Borders
    border: {
      light: '#e2e8f0',
      medium: '#cbd5e1',
      dark: '#94a3b8',
    },

    // Shadows
    shadow: {
      light: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      heavy: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    },
  },
} as const

// Color utility functions
export const getColor = (category: keyof typeof colors, shade: number) => {
  return colors[category][shade as keyof typeof colors[typeof category]]
}

export const getStatusColor = (status: keyof typeof colors.status) => {
  return colors.status[status]
}

// Tailwind-compatible color classes
export const colorClasses = {
  // Primary brand colors
  primary: 'text-blue-600 bg-blue-600 border-blue-600',
  primaryHover: 'hover:bg-blue-700 hover:text-blue-700',
  primaryLight: 'bg-blue-50 text-blue-700 border-blue-200',
  primaryDark: 'bg-blue-800 text-white',

  // Secondary colors
  secondary: 'text-green-600 bg-green-600 border-green-600',
  secondaryHover: 'hover:bg-green-700 hover:text-green-700',
  secondaryLight: 'bg-green-50 text-green-700 border-green-200',

  // Accent colors
  accent: 'text-amber-600 bg-amber-600 border-amber-600',
  accentHover: 'hover:bg-amber-700 hover:text-amber-700',
  accentLight: 'bg-amber-50 text-amber-700 border-amber-200',

  // Status colors
  success: 'text-green-600 bg-green-100 border-green-300',
  warning: 'text-amber-600 bg-amber-100 border-amber-300',
  error: 'text-red-600 bg-red-100 border-red-300',
  info: 'text-blue-600 bg-blue-100 border-blue-300',

  // Neutral colors
  neutral: 'text-gray-600 bg-gray-100 border-gray-300',
  neutralLight: 'bg-gray-50 text-gray-700 border-gray-200',
  neutralDark: 'bg-gray-800 text-white',

  // Backgrounds
  background: 'bg-white',
  backgroundSecondary: 'bg-gray-50',
  backgroundTertiary: 'bg-gray-100',

  // Text colors
  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-600',
  textTertiary: 'text-gray-500',
  textMuted: 'text-gray-400',

  // Borders
  borderLight: 'border-gray-200',
  borderMedium: 'border-gray-300',
  borderDark: 'border-gray-400',
} as const

// Component-specific color schemes
export const componentColors = {
  // Navigation
  nav: {
    active: 'bg-blue-600 text-white',
    inactive: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    logo: 'bg-gradient-to-br from-blue-600 to-blue-500 text-white',
  },

  // Buttons
  button: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-white hover:bg-gray-50 text-gray-900 border-gray-300',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
  },

  // Cards
  card: {
    default: 'bg-white border-gray-200 shadow-sm',
    hover: 'hover:shadow-md hover:border-gray-300',
    active: 'ring-2 ring-blue-500 border-blue-500',
  },

  // Forms
  form: {
    input: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    label: 'text-gray-700 font-medium',
    error: 'text-red-600 border-red-300',
    success: 'text-green-600 border-green-300',
  },

  // Status badges
  badge: {
    admin: 'bg-red-100 text-red-800 border-red-200',
    agent: 'bg-blue-100 text-blue-800 border-blue-200',
    receiver: 'bg-gray-100 text-gray-800 border-gray-200',
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  },

  // Alerts
  alert: {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  },
} as const

// Export default
export default colors
