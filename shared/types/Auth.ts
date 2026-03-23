export type SignInPayload = {
  email: string
  password: string
}

export type SignUpPayload = {
  email: string
  password: string
  nome: string
  redirectTo?: string
}

export type AuthResult = {
  success: boolean
  message?: string
}
