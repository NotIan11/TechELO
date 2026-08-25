export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Base URL for links in emails (empty string when unknown) */
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  )
}

/**
 * Minimal HTML wrapper shared by transactional emails. `paragraphs` must
 * already be HTML-escaped; `cta` renders as a link button.
 */
export function renderEmail(opts: {
  greetingName: string
  paragraphs: string[]
  cta?: { label: string; url: string }
}): string {
  const body = opts.paragraphs.map((p) => `<p style="margin: 0 0 16px;">${p}</p>`).join('\n  ')
  const cta = opts.cta
    ? `<p style="margin: 0 0 24px;"><a href="${escapeHtml(opts.cta.url)}" style="color: #2563eb; text-decoration: underline;">${escapeHtml(opts.cta.label)}</a></p>`
    : ''
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #111827; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">Hello ${escapeHtml(opts.greetingName)},</p>
  ${body}
  ${cta}
  <p style="margin: 0; font-size: 0.875rem;">Tech ELO</p>
</body>
</html>
  `.trim()
}

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
