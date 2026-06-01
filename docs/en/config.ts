import { defineAdditionalConfig, type DefaultTheme } from 'vitepress'

export default defineAdditionalConfig({
  description:
    'OpenFlare is a lightweight, self-hosted OpenResty control plane for managing reverse proxy rules, configuration publishing, node synchronization, TLS certificates, and basic observability.',

  themeConfig: {
    nav: nav(),

    sidebar: {
      '/en/guide/': { base: '/en/guide/', items: sidebarGuide() },
      '/en/reference/': { base: '/en/reference/', items: sidebarReference() },
      '/en/design/': { base: '/en/design/', items: sidebarDesign() }
    },

    editLink: {
      pattern: 'https://github.com/Rain-kl/OpenFlare/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the Apache License 2.0',
      copyright: 'Copyright © OpenFlare contributors'
    },

    docFooter: {
      prev: 'Previous Page',
      next: 'Next Page'
    },

    outline: {
      label: 'On this page'
    },

    lastUpdated: {
      text: 'Last updated at'
    },

    notFound: {
      title: 'Page Not Found',
      quote: 'This document does not have a corresponding page yet.',
      linkLabel: 'Go to Home',
      linkText: 'Back to OpenFlare Docs'
    },

    langMenuLabel: 'Language',
    returnToTopLabel: 'Back to top',
    sidebarMenuLabel: 'Menu',
    darkModeSwitchLabel: 'Theme',
    lightModeSwitchTitle: 'Switch to light theme',
    darkModeSwitchTitle: 'Switch to dark theme',
    skipToContentLabel: 'Skip to content'
  }
})

function nav(): DefaultTheme.NavItem[] {
  return [
    { text: 'Guide', link: '/en/guide/', activeMatch: '/en/guide/' },
    { text: 'Reference', link: '/en/reference/', activeMatch: '/en/reference/' },
    { text: 'Design', link: '/en/design/', activeMatch: '/en/design/' }
  ]
}

function sidebarGuide(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Guide',
      items: [
        { text: 'Overview', link: '' },
        { text: 'Quick Start', link: 'quick-start' },
        { text: 'Basic Usage', link: 'usage' },
        { text: 'Tunnel & Intranet Penetration', link: 'tunnel-usage' },
        { text: 'WAF Security Protection', link: 'waf-usage' },
        { text: 'WAF Auto IP Group Expressions', link: 'waf-ip-group-expr' },
        { text: 'SSO Login Configuration', link: 'sso' },
        { text: 'Publish First Configuration', link: 'first-site' },
        { text: 'Troubleshooting', link: 'troubleshooting' },
        { text: 'Credits', link: 'credits' }
      ]
    }
  ]
}

function sidebarReference(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Reference',
      items: [
        { text: 'Overview', link: '' },
        { text: 'System Architecture', link: '../design/architecture' },
        { text: 'Launch Server', link: '../deployment/server' },
        { text: 'Access Agent', link: '../deployment/agent' },
        { text: 'Deployment Guide', link: '../deployment/deployment' },
        { text: 'Deploy Relay (Tunnel)', link: '../deployment/relay' },
        { text: 'Deploy OpenFlared', link: '../deployment/openflared' },
        { text: 'Upgrade & Maintenance', link: '../deployment/upgrade' },
        { text: 'Configuration Options', link: 'configuration' },
        { text: 'CLI Commands', link: 'cli' },
        { text: 'API Conventions', link: 'api' }
      ]
    }
  ]
}

function sidebarDesign(): DefaultTheme.SidebarItem[] {
  return [
    {
      text: 'Design',
      items: [
        { text: 'Product Boundaries', link: '' },
        { text: 'System Architecture', link: 'architecture' },
        { text: 'Agent & Publish Model', link: 'agent-design' },
        { text: 'Tunnel & Intranet Penetration', link: 'tunnel-design' },
        { text: 'WAF Design', link: 'waf-design' },
        { text: 'Repository Structure', link: 'repository' }
      ]
    }
  ]
}
