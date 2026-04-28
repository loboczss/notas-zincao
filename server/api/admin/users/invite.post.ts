import {
  assertAdminAccess,
  getAdminUsersClient,
  getCurrentAuthUid,
  getSupabaseAdminConfigOrThrow,
  normalizeRoleInputOrThrow,
} from './_helpers'
import type { AdminInviteUserPayload, AdminInviteUserResponse } from '../../../../shared/types/AdminUsers'
import { isResendConfigured, sendEmailWithResend } from '../../../services/email/resend'

const isValidEmail = (value: string) => /.+@.+\..+/.test(value)

const roleLabelMap: Record<string, string> = {
  admin: 'Administrador',
  colaborador: 'Colaborador',
  operador: 'Operador',
  visualizador: 'Visualizador',
}

const buildInviteEmailHtml = (params: { nome: string; role: string }) => {
  const roleLabel = roleLabelMap[params.role] || params.role

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.5;">
      <h2 style="margin-bottom:8px;">Seu convite foi criado</h2>
      <p>Olá, ${params.nome}.</p>
      <p>Você recebeu acesso ao sistema Notas Zincão com o perfil <strong>${roleLabel}</strong>.</p>
      <p>Também enviamos o convite oficial de autenticação para este e-mail. Verifique sua caixa de entrada e spam.</p>
    </div>
  `
}

export default defineEventHandler(async (event): Promise<AdminInviteUserResponse> => {
  const requesterAuthUid = await getCurrentAuthUid(event)
  const client = await getAdminUsersClient(event)

  await assertAdminAccess(client, requesterAuthUid)

  const body = await readBody<AdminInviteUserPayload>(event)
  const email = String(body?.email || '').trim().toLowerCase()
  const nome = typeof body?.nome === 'string' ? body.nome.trim().slice(0, 120) : ''
  const role = normalizeRoleInputOrThrow(body?.role || 'colaborador')

  if (!isValidEmail(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'E-mail invalido para convite.',
    })
  }

  const { supabaseUrl, serviceRoleKey } = getSupabaseAdminConfigOrThrow()

  const response = await fetch(`${supabaseUrl}/auth/v1/invite`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      data: {
        nome: nome || undefined,
        full_name: nome || undefined,
        role,
      },
    }),
  })

  const result = await response.json().catch(() => null)

  if (!response.ok) {
    const message = (result as { msg?: string; error_description?: string; error?: string } | null)?.msg
      || (result as { msg?: string; error_description?: string; error?: string } | null)?.error_description
      || (result as { msg?: string; error_description?: string; error?: string } | null)?.error
      || 'Falha ao enviar convite pelo Supabase Auth.'

    throw createError({
      statusCode: response.status,
      statusMessage: message,
    })
  }

  const invitedAuthUid = (result as { id?: string; user?: { id?: string } } | null)?.id
    || (result as { id?: string; user?: { id?: string } } | null)?.user?.id

  if (invitedAuthUid) {
    await (client as any)
      .from('profiles')
      .update({
        nome: nome || null,
        role,
        updated_by: requesterAuthUid,
      })
      .eq('auth_uid', invitedAuthUid)
  }

  let customEmailSent = false

  if (isResendConfigured()) {
    const resendResult = await sendEmailWithResend({
      to: email,
      subject: 'Convite para acesso ao Notas Zincão',
      html: buildInviteEmailHtml({
        nome: nome || 'Usuario',
        role,
      }),
    })

    customEmailSent = resendResult.ok
  }

  return {
    success: true,
    message: customEmailSent
      ? `Convite enviado para ${email} com e-mail personalizado.`
      : `Convite enviado para ${email}.`,
    email,
    role,
    auth_uid: invitedAuthUid || null,
    custom_email_sent: customEmailSent,
  }
})
