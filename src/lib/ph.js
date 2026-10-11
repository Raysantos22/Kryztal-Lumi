// Philippine provinces grouped by island group. "Metro Manila" (NCR) is
// treated as one province. Shipping zones in the admin pick from this list;
// supabase/seed.sql uses the same groups for the default zones.
export const PH_REGIONS = [
  { name: 'Metro Manila', provinces: ['Metro Manila'] },
  {
    name: 'Luzon',
    provinces: [
      'Abra', 'Albay', 'Apayao', 'Aurora', 'Bataan', 'Batanes', 'Batangas', 'Benguet', 'Bulacan', 'Cagayan',
      'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Cavite', 'Ifugao', 'Ilocos Norte', 'Ilocos Sur',
      'Isabela', 'Kalinga', 'La Union', 'Laguna', 'Marinduque', 'Masbate', 'Mountain Province', 'Nueva Ecija',
      'Nueva Vizcaya', 'Occidental Mindoro', 'Oriental Mindoro', 'Palawan', 'Pampanga', 'Pangasinan', 'Quezon',
      'Quirino', 'Rizal', 'Romblon', 'Sorsogon', 'Tarlac', 'Zambales',
    ],
  },
  {
    name: 'Visayas',
    provinces: [
      'Aklan', 'Antique', 'Biliran', 'Bohol', 'Capiz', 'Cebu', 'Eastern Samar', 'Guimaras', 'Iloilo', 'Leyte',
      'Negros Occidental', 'Negros Oriental', 'Northern Samar', 'Samar', 'Siquijor', 'Southern Leyte',
    ],
  },
  {
    name: 'Mindanao',
    provinces: [
      'Agusan del Norte', 'Agusan del Sur', 'Basilan', 'Bukidnon', 'Camiguin', 'Cotabato', 'Davao de Oro',
      'Davao del Norte', 'Davao del Sur', 'Davao Occidental', 'Davao Oriental', 'Dinagat Islands',
      'Lanao del Norte', 'Lanao del Sur', 'Maguindanao del Norte', 'Maguindanao del Sur', 'Misamis Occidental',
      'Misamis Oriental', 'Sarangani', 'South Cotabato', 'Sultan Kudarat', 'Sulu', 'Surigao del Norte',
      'Surigao del Sur', 'Tawi-Tawi', 'Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay',
    ],
  },
]

export const PH_PROVINCES = PH_REGIONS.flatMap((r) => r.provinces).sort((a, b) =>
  a === 'Metro Manila' ? -1 : b === 'Metro Manila' ? 1 : a.localeCompare(b),
)

// The first active zone listing the province (same rule as create_order).
export function zoneForProvince(zones, province) {
  const p = (province || '').trim().toLowerCase()
  if (!p) return null
  return (
    [...(zones || [])]
      .filter((z) => z.is_active !== false)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
      .find((z) => (z.provinces || []).some((x) => x.trim().toLowerCase() === p)) || null
  )
}
