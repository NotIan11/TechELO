/**
 * Send transactional email via Resend. No-op if RESEND_API_KEY is missing.
 * Pass html for HTML emails; text is used as fallback for plain-text clients.
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  if (!apiKey) {
    return
  }

  const payload: { from: string; to: string[]; subject: string; text: string; html?: string } = {
    from,
    to: [to],
    subject,
    text,
  }
  if (html) payload.html = html

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend email failed: ${res.status} ${err}`)
  }
}
