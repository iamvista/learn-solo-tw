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
  siteName: '自由人學院',
  siteLogo: '/icon.png',
  contactEmail: 'support@example.com',
  brandDisplayName: '自由人學院',
  brandSubtitle: '自由人學院',
  googleLoginEnabled: false,
  appleLoginEnabled: false,
  headerLeftLinks: [],
  headerRightLinks: [],
  footerDescription: '',
  footerSections: [],
}
