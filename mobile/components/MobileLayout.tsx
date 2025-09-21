"use client"

// Mobile app layout component for Smart Courier Go Track System
// This simulates React Native components using React with mobile-first styling

import type React from "react"

interface MobileLayoutProps {
  children: React.ReactNode
  title: string
  showBackButton?: boolean
  onBack?: () => void
  rightAction?: React.ReactNode
}

export function MobileLayout({ children, title, showBackButton = false, onBack, rightAction }: MobileLayoutProps) {
  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen">
      {/* Mobile Header */}
      <div className="bg-kivu-primary text-white p-4 flex items-center justify-between">
        {showBackButton && (
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-lg font-semibold flex-1 text-center">{title}</h1>
        <div className="w-10 flex justify-end">{rightAction}</div>
      </div>

      {/* Mobile Content */}
      <div className="flex-1">{children}</div>
    </div>
  )
}
