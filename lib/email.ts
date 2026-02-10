/**
 * Send transactional email via Resend. No-op if RESEND_API_KEY is missing.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  if (!apiKey) {
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend email failed: ${res.status} ${err}`)
  }
}
