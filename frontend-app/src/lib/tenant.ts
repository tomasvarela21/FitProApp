export interface TenantConfig {
  name: string
  trainerName: string
  logoPath: string
  faviconPath: string
  ogImage: string
  trainerPhoto: string | null
  primary: string | null
  primaryFg: string | null
  background: string | null
  surface: string | null
  fontHeading: string | null
  fontBody: string | null
  googleFontsUrl: string | null
  showRegisterLink: boolean
  showChat: boolean
  showRpe: boolean
}

export function getTenantConfig(): TenantConfig {
  return {
    name:             import.meta.env.VITE_BRAND_NAME           ?? 'KOREX',
    trainerName:      import.meta.env.VITE_BRAND_TRAINER_NAME   ?? 'KOREX Team',
    logoPath:         import.meta.env.VITE_BRAND_LOGO_PATH      ?? '/korex-icon.png',
    faviconPath:      import.meta.env.VITE_BRAND_FAVICON_PATH   ?? '/korex-icon.png',
    ogImage:          import.meta.env.VITE_BRAND_OG_IMAGE       ?? '/korex-icon.png',
    trainerPhoto:     import.meta.env.VITE_BRAND_TRAINER_PHOTO  ?? null,
    primary:          import.meta.env.VITE_BRAND_PRIMARY        ?? null,
    primaryFg:        import.meta.env.VITE_BRAND_PRIMARY_FG     ?? null,
    background:       import.meta.env.VITE_BRAND_BG             ?? null,
    surface:          import.meta.env.VITE_BRAND_SURFACE        ?? null,
    fontHeading:      import.meta.env.VITE_BRAND_FONT_HEADING   ?? null,
    fontBody:         import.meta.env.VITE_BRAND_FONT_BODY      ?? null,
    googleFontsUrl:   import.meta.env.VITE_BRAND_GOOGLE_FONTS   ?? null,
    showRegisterLink: import.meta.env.VITE_BRAND_SHOW_REGISTER !== 'false',
    showChat:         import.meta.env.VITE_BRAND_SHOW_CHAT      !== 'false',
    showRpe:          import.meta.env.VITE_BRAND_SHOW_RPE       !== 'false',
  }
}

export const tenant = getTenantConfig()
