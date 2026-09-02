import { getTenantConfig } from './tenant'

export function applyTenantTheme(): void {
  const config = getTenantConfig()
  const root = document.documentElement

  // Title & favicon
  document.title = config.name
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (favicon) favicon.href = config.faviconPath

  // Google Fonts — solo inyectar si el cliente usa fuentes distintas a las del CSS base
  if (config.googleFontsUrl) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = config.googleFontsUrl
    document.head.appendChild(link)
  }

  // Font tokens — inline style gana sobre @theme inline de Tailwind
  if (config.fontHeading) {
    root.style.setProperty('--font-heading', `'${config.fontHeading}', sans-serif`)
  }
  if (config.fontBody) {
    root.style.setProperty('--font-sans', `'${config.fontBody}', system-ui, sans-serif`)
  }

  // Color tokens — solo se aplican si el cliente los define explícitamente.
  // Inline style tiene mayor especificidad que .dark { --primary: ... },
  // por lo que este único bloque cubre ambos temas sin duplicar lógica.
  if (config.primary) {
    root.style.setProperty('--primary',                    config.primary)
    root.style.setProperty('--ring',                       config.primary)
    root.style.setProperty('--sidebar-primary',            config.primary)
    root.style.setProperty('--sidebar-ring',               config.primary)
    root.style.setProperty('--chart-1',                    config.primary)
    root.style.setProperty('--accent-foreground',          config.primary)
  }
  if (config.primaryFg) {
    root.style.setProperty('--primary-foreground',         config.primaryFg)
    root.style.setProperty('--sidebar-primary-foreground', config.primaryFg)
  }
  if (config.background) {
    root.style.setProperty('--background',                 config.background)
  }
  if (config.surface) {
    root.style.setProperty('--card',                       config.surface)
    root.style.setProperty('--popover',                    config.surface)
    root.style.setProperty('--sidebar',                    config.surface)
  }
}
