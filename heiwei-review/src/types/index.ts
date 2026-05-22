export interface Prize {
  index: number
  name: string
  probability: number
  color: string
}

export interface VerifyResponse {
  valid: boolean
  error?: string
}

export interface SubmitReviewPayload {
  lineUid: string
  orderNumber: string
  stars: number
  comment: string
}

export interface SpinPayload {
  lineUid: string
  orderNumber: string
}

export interface SpinResult {
  prizeIndex: number
  prizeName: string
}
