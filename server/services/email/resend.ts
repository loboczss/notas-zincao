type SendEmailWithResendInput = {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

type SendEmailWithResendResult = {
  ok: boolean
  status: number
  id?: string
  error?: string
  configured: boolean
}

export const isResendConfigured = () => {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
}

export const sendEmailWithResend = async (
  input: SendEmailWithResendInput,
): Promise<SendEmailWithResendResult> => {
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFrom = process.env.RESEND_FROM_EMAIL

  if (!resendApiKey || !resendFrom) {
    return {
      ok: false,
      configured: false,
      status: 0,
      error: 'RESEND_API_KEY e RESEND_FROM_EMAIL sao obrigatorios para envio via Resend.',
    }
  }

  const to = Array.isArray(input.to) ? input.to : [input.to]

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = (payload as { message?: string; error?: string } | null)?.message
      || (payload as { message?: string; error?: string } | null)?.error
      || 'Falha ao enviar e-mail via Resend.'

    return {
      ok: false,
      configured: true,
      status: response.status,
      error: message,
    }
  }

  return {
    ok: true,
    configured: true,
    status: response.status,
    id: (payload as { id?: string } | null)?.id,
  }
}
