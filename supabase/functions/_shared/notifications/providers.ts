import type { NotificationProvider, OutgoingMessage, Recipient } from './types.ts'
import { toE164 } from './phone.ts'

const env = (k: string) => Deno.env.get(k) ?? ''

async function ensureOk(res: Response, label: string) {
  if (res.ok) return
  let detail = ''
  try {
    detail = (await res.text()).slice(0, 300)
  } catch {
    /* ignore */
  }
  throw new Error(`${label} responded ${res.status}${detail ? `: ${detail}` : ''}`)
}

// ---------------------------------------------------------------- Resend ---
export const resendEmail: NotificationProvider = {
  channel: 'email',
  isConfigured: () => !!env('RESEND_API_KEY') && !!env('RESEND_FROM'),
  addressFor: (r: Recipient) => (r.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email) ? r.email : null),
  async send(address: string, msg: OutgoingMessage) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env('RESEND_FROM'),
        to: [address],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        ...(env('RESEND_REPLY_TO') ? { reply_to: env('RESEND_REPLY_TO') } : {}),
      }),
    })
    await ensureOk(res, 'Resend')
  },
}

// ------------------------------------------------------- Twilio (stub) ---
// Ready to use but OFF by default: add "sms" to NOTIFY_CHANNELS and set the
// TWILIO_* secrets to text customers / the owner.
export const twilioSms: NotificationProvider = {
  channel: 'sms',
  isConfigured: () =>
    !!env('TWILIO_ACCOUNT_SID') && !!env('TWILIO_AUTH_TOKEN') && (!!env('TWILIO_FROM') || !!env('TWILIO_MESSAGING_SERVICE_SID')),
  addressFor: (r: Recipient) => toE164(r.phone, env('DEFAULT_COUNTRY_CODE') || '63'),
  async send(address: string, msg: OutgoingMessage) {
    const sid = env('TWILIO_ACCOUNT_SID')
    const form = new URLSearchParams({ To: address, Body: msg.text.slice(0, 600) })
    if (env('TWILIO_MESSAGING_SERVICE_SID')) form.set('MessagingServiceSid', env('TWILIO_MESSAGING_SERVICE_SID'))
    else form.set('From', env('TWILIO_FROM'))
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${env('TWILIO_AUTH_TOKEN')}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    })
    await ensureOk(res, 'Twilio')
  },
}

export const ALL_PROVIDERS: NotificationProvider[] = [resendEmail, twilioSms]
