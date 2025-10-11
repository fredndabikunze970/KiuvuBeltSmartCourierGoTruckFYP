# KIVU Belt Express - Design System

## Overview
This document outlines the professional design system and color consistency rules for the KIVU Belt Express application.

## Color Palette

### Primary Brand Colors
- **Primary Blue**: `#3b82f6` (Blue-500) - Trust, reliability, professionalism
- **Secondary Green**: `#22c55e` (Green-500) - Success, delivery completion
- **Accent Amber**: `#f59e0b` (Amber-500) - Warnings, notifications, urgency

### Neutral Colors
- **Background**: `#ffffff` (White)
- **Surface**: `#f8fafc` (Gray-50)
- **Border**: `#e2e8f0` (Gray-200)
- **Text Primary**: `#1e293b` (Slate-800)
- **Text Secondary**: `#64748b` (Slate-500)
- **Text Muted**: `#94a3b8` (Slate-400)

### Status Colors
- **Success**: `#22c55e` (Green-500)
- **Warning**: `#f59e0b` (Amber-500)
- **Error**: `#ef4444` (Red-500)
- **Info**: `#3b82f6` (Blue-500)

## Usage Guidelines

### Navigation
- **Active State**: `bg-blue-600 text-white`
- **Inactive State**: `text-gray-600 hover:text-gray-900 hover:bg-gray-100`
- **Logo**: `bg-gradient-to-br from-blue-600 to-blue-500 text-white`

### Buttons
- **Primary**: `bg-blue-600 hover:bg-blue-700 text-white`
- **Secondary**: `bg-white hover:bg-gray-50 text-gray-900 border-gray-300`
- **Success**: `bg-green-600 hover:bg-green-700 text-white`
- **Warning**: `bg-amber-600 hover:bg-amber-700 text-white`
- **Danger**: `bg-red-600 hover:bg-red-700 text-white`

### Cards
- **Default**: `bg-white border-gray-200 shadow-sm`
- **Hover**: `hover:shadow-md hover:border-gray-300`
- **Active**: `ring-2 ring-blue-500 border-blue-500`

### Forms
- **Input**: `border-gray-300 focus:border-blue-500 focus:ring-blue-500`
- **Label**: `text-gray-700 font-medium`
- **Error**: `text-red-600 border-red-300`
- **Success**: `text-green-600 border-green-300`

### Status Badges
- **Admin**: `bg-red-100 text-red-800 border-red-300`
- **Agent**: `bg-blue-100 text-blue-800 border-blue-300`
- **Receiver**: `bg-green-100 text-green-800 border-green-300`
- **Active**: `bg-green-100 text-green-800 border-green-300`
- **Inactive**: `bg-gray-100 text-gray-800 border-gray-300`

### Alerts
- **Success**: `bg-green-50 border-green-200 text-green-800`
- **Warning**: `bg-amber-50 border-amber-200 text-amber-800`
- **Error**: `bg-red-50 border-red-200 text-red-800`
- **Info**: `bg-blue-50 border-blue-200 text-blue-800`

## Implementation

### CSS Variables
All colors are defined as CSS custom properties in `app/globals.css`:

```css
:root {
  --primary: #3b82f6;
  --secondary: #22c55e;
  --accent: #f59e0b;
  --background: #ffffff;
  --foreground: #1e293b;
  /* ... more variables */
}
```

### TypeScript Color System
A comprehensive color system is available in `lib/colors.ts` with:
- Color constants for all shades
- Utility functions for color access
- Component-specific color schemes
- Tailwind-compatible class names

### Usage in Components
```tsx
import { componentColors } from '@/lib/colors'

// Use predefined color schemes
<div className={componentColors.button.primary}>
  Primary Button
</div>

<div className={componentColors.badge.agent}>
  Agent
</div>
```

## Best Practices

### 1. Consistency
- Always use the defined color palette
- Use semantic color names (primary, secondary, success, etc.)
- Avoid hardcoded color values in components

### 2. Accessibility
- Maintain sufficient contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Use color combinations that work for color-blind users
- Provide alternative indicators beyond color alone

### 3. Dark Mode Support
- All colors have corresponding dark mode variants
- Use CSS custom properties for automatic theme switching
- Test all components in both light and dark modes

### 4. Component Library
- Use shadcn/ui components with consistent theming
- Extend components with custom variants when needed
- Maintain component documentation

## Maintenance

### Adding New Colors
1. Add to the color palette in `lib/colors.ts`
2. Update CSS custom properties in `app/globals.css`
3. Add dark mode variants
4. Update this documentation

### Updating Existing Colors
1. Update the source of truth in `lib/colors.ts`
2. Update CSS variables
3. Test all affected components
4. Update screenshots/documentation

### Color Usage Audit
Regular audits should be performed to:
- Identify inconsistent color usage
- Remove unused color definitions
- Ensure accessibility compliance
- Update component libraries

## Tools and Resources

- **Color Palette Generator**: Use tools like Coolors, Adobe Color, or Material Design Color Tool
- **Contrast Checker**: WebAIM Contrast Checker or Stark plugin
- **Color Blindness Simulator**: Coblis or Color Oracle
- **Design System Documentation**: This document and component storybook

## Contact
For design system questions or updates, contact the design team.
