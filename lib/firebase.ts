import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getDatabase } from "firebase-admin/database"

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    const firebaseConfig = {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: "https://accounts.google.com/o/oauth2/auth",
        tokenUri: "https://oauth2.googleapis.com/token",
        authProviderX509CertUrl: "https://www.googleapis.com/oauth2/v1/certs",
        clientX509CertUrl: process.env.FIREBASE_CLIENT_CERT_URL,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    }

    initializeApp(firebaseConfig)
    console.log("✅ Firebase Admin initialized successfully")
  } catch (error) {
    console.error("❌ Firebase initialization error:", error)
  }
}

export const database = getDatabase()

export async function updatePackageLocation(
  packageId: string,
  location: {
    latitude: number
    longitude: number
    address?: string
    timestamp?: number
  },
) {
  try {
    const ref = database.ref(`tracking/${packageId}`)
    await ref.set({
      ...location,
      timestamp: location.timestamp || Date.now(),
      lastUpdated: new Date().toISOString(),
    })
    console.log(`📍 Location updated for package ${packageId}`)
  } catch (error) {
    console.error("Error updating package location:", error)
    throw error
  }
}

export async function getPackageLocation(packageId: string) {
  try {
    const ref = database.ref(`tracking/${packageId}`)
    const snapshot = await ref.once("value")
    return snapshot.val()
  } catch (error) {
    console.error("Error getting package location:", error)
    throw error
  }
}

export async function subscribeToPackageUpdates(packageId: string, callback: (data: any) => void) {
  const ref = database.ref(`tracking/${packageId}`)
  ref.on("value", (snapshot) => {
    callback(snapshot.val())
  })

  // Return unsubscribe function
  return () => ref.off("value")
}
