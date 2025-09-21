interface User {
  userId: string
  email: string
  fullName: string
  phone: string
  role: "agent" | "admin" | "receiver"
}

interface AuthResponse {
  user: User
  token: string
  message: string
}

class AuthService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
  private tokenKey = "kivu_belt_token"
  private userKey = "kivu_belt_user"

  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Login failed")
    }

    const data = await response.json()

    // Store token and user data
    localStorage.setItem(this.tokenKey, data.token)
    localStorage.setItem(this.userKey, JSON.stringify(data.user))

    return data
  }

  // Register new user
  async register(userData: {
    email: string
    password: string
    fullName: string
    phone: string
    role: "agent" | "admin"
  }): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Registration failed")
    }

    const data = await response.json()

    // Store token and user data
    localStorage.setItem(this.tokenKey, data.token)
    localStorage.setItem(this.userKey, JSON.stringify(data.user))

    return data
  }

  // Get current user
  getCurrentUser(): User | null {
    if (typeof window === "undefined") return null

    const userStr = localStorage.getItem(this.userKey)
    return userStr ? JSON.parse(userStr) : null
  }

  // Get auth token
  getToken(): string | null {
    if (typeof window === "undefined") return null

    return localStorage.getItem(this.tokenKey)
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  // Logout user
  logout(): void {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.userKey)
  }

  // Get auth headers for API requests
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Refresh token
  async refreshToken(): Promise<string> {
    const token = this.getToken()
    if (!token) throw new Error("No token available")

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Token refresh failed")
    }

    const data = await response.json()
    localStorage.setItem(this.tokenKey, data.token)

    return data.token
  }
}

export const authService = new AuthService()
export type { User, AuthResponse }
