// Brand icons (lucide-react doesn't ship brand logos) + the Kryztal sparkle.
export function Facebook({ className = 'h-4 w-4', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  )
}

export function Instagram({ className = 'h-4 w-4', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={className} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function TikTok({ className = 'h-4 w-4', ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
      <path d="M16.6 2h-3.3v13.2a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9a6.3 6.3 0 1 0 5.3 6.2V8.6a7.9 7.9 0 0 0 4.4 1.4V6.7A4.6 4.6 0 0 1 16.6 2z" />
    </svg>
  )
}

export const SOCIAL_ICONS = { facebook: Facebook, instagram: Instagram, tiktok: TikTok }

// The 4-point sparkle from the logo.
export function Sparkle({ className = 'h-4 w-4', gradient = false, ...props }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className} {...props}>
      {gradient && (
        <defs>
          <linearGradient id="kl-spark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f3cfc8" />
            <stop offset=".4" stopColor="#d99a95" />
            <stop offset=".55" stopColor="#f6dcd5" />
            <stop offset="1" stopColor="#9e5a57" />
          </linearGradient>
        </defs>
      )}
      <path
        fill={gradient ? 'url(#kl-spark)' : 'currentColor'}
        d="M32 4.5C33.4 20 37 26 54.5 32 37 38 33.4 44 32 59.5 30.6 44 27 38 9.5 32 27 26 30.6 20 32 4.5Z"
      />
    </svg>
  )
}
