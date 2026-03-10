export interface NavLink {
  label: string
  url: string
  openInNewTab: boolean
}

export interface FooterLink {
  label: string
  url: string
  icon?: string
}

export interface FooterSection {
  title: string
  links: FooterLink[]
}

export interface PublicSiteSettings {
  siteName: string
  siteLogo: string
  contactEmail: string
  brandDisplayName: string
  brandSubtitle: string
  googleLoginEnabled: boolean
  appleLoginEnabled: boolean
  headerLeftLinks: NavLink[]
  headerRightLinks: NavLink[]
  footerDescription: string
  footerSections: FooterSection[]
}

export const PUBLIC_SITE_DEFAULTS: PublicSiteSettings = {
  siteName: 'Course Platform',
  siteLogo: '/icon.png',
  contactEmail: 'support@example.com',
  brandDisplayName: 'Course Platform',
  brandSubtitle: 'Learning System',
  googleLoginEnabled: false,
  appleLoginEnabled: false,
  headerLeftLinks: [],
  headerRightLinks: [],
  footerDescription: '',
  footerSections: [],
}
