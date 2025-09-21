export function generatePackageId(): string {
  const prefix = "KBE"
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export function generatePickupCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function generateTrackingNumber(): string {
  const prefix = "TRK"
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2, 4).toUpperCase()
  return `${prefix}${timestamp}${random}`
}
