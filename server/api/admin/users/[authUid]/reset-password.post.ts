import { randomBytes } from 'node:crypto'
import {
  assertAdminAccess,
  getAdminUsersClient,
  getCurrentAuthUid,
  getSupabaseAdminConfigOrThrow,
} from '../_helpers'
import type { AdminResetUserPasswordResponse } from '../../../../../shared/types/AdminUsers'
import { isResendConfigured, sendEmailWithResend } from '../../../../services/email/resend'

type ProfileEmailRow = {
  email?: string | null
  nome?: string | null
}

const generateTemporaryPassword = () => {
  const base = randomBytes(9).toString('base64url')
  return `Tmp#${base}9aA`
}

const buildCustomResetEmailHtml = (params: {
  nome: string
  temporaryPassword: string
  resetLink?: string | null
}) => {
  const linkHtml = params.resetLink
    ? `<p style="margin:16px 0;"><a href="${params.resetLink}" style="display:inline-block;padding:10px 16px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;">Redefinir senha agora</a></p>`
    : ''

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.5;">
      <h2 style="margin-bottom:8px;">Redefinição de senha</h2>
      <p>Olá, ${params.nome}.</p>
      <p>Seu acesso foi atualizado por um administrador.</p>
      <p>Senha temporária: <strong>${params.temporaryPassword}</strong></p>
      <p>Por segurança, altere sua senha no primeiro acesso.</p>
      ${linkHtml}
    </div>
  `
}

export default defineEventHandler(async (event): Promise<AdminResetUserPasswordResponse> => {
  const requesterAuthUid = await getCurrentAuthUid(event)
  const client = await getAdminUsersClient(event)

  await assertAdminAccess(client, requesterAuthUid)

  const targetAuthUid = getRouterParam(event, 'authUid')
  if (!targetAuthUid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Usuario alvo nao informado.',
    })
  }

  const { data: profile, error: profileError } = await (client as any)
    .from('profiles')
    .select('email, nome')
    .eq('auth_uid', targetAuthUid)
    .maybeSingle()

  if (profileError) {
    console.error('[api/admin/users] reset password profile error:', profileError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Falha ao carregar usuario para redefinicao de senha.',
    })
  }

  const email = String((profile as ProfileEmailRow | null)?.email || '').trim().toLowerCase()
  const nome = String((profile as ProfileEmailRow | null)?.nome || 'Usuario').trim()

  if (!email) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Usuario sem e-mail valido em profiles.',
    })
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminConfigOrThrow()
  const temporaryPassword = generateTemporaryPassword()

  const updatePasswordResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetAuthUid}`, {
    method: 'PUT',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password: temporaryPassword,
    }),
  })

  if (!updatePasswordResponse.ok) {
    const payload = await updatePasswordResponse.json().catch(() => null)
    const message = (payload as { msg?: string; error_description?: string; error?: string } | null)?.msg
      || (payload as { msg?: string; error_description?: string; error?: string } | null)?.error_description
      || (payload as { msg?: string; error_description?: string; error?: string } | null)?.error
      || 'Falha ao atualizar senha do usuario no Supabase Auth.'

    throw createError({
      statusCode: updatePasswordResponse.status,
      statusMessage: message,
    })
  }

  let recoveryEmailSent = false
  const recoverResponse = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  if (recoverResponse.ok) {
    recoveryEmailSent = true
  }

  let customEmailSent = false

  if (isResendConfigured()) {
    const generateLinkResponse = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'recovery',
        email,
      }),
    })

    const generateLinkPayload = await generateLinkResponse.json().catch(() => null)
    const actionLink = (generateLinkPayload as { action_link?: string; properties?: { action_link?: string } } | null)?.action_link
      || (generateLinkPayload as { action_link?: string; properties?: { action_link?: string } } | null)?.properties?.action_link
      || null

    const html = buildCustomResetEmailHtml({
      nome,
      temporaryPassword,
      resetLink: actionLink,
    })

    const resendResponse = await sendEmailWithResend({
      to: email,
      subject: 'Atualizacao de senha da sua conta',
      html,
    })

    customEmailSent = resendResponse.ok
  }

  return {
    success: true,
    message: customEmailSent
      ? 'Senha temporaria atualizada e e-mail personalizado enviado ao usuario.'
      : recoveryEmailSent
        ? 'Senha temporaria atualizada e e-mail de recuperacao enviado ao usuario.'
        : 'Senha temporaria atualizada, mas nao foi possivel enviar e-mail automaticamente.',
    auth_uid: targetAuthUid,
    email,
    recovery_email_sent: recoveryEmailSent,
    custom_email_sent: customEmailSent,
  }
})
