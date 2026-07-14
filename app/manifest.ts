import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tech ELO',
    short_name: 'Tech ELO',
    description: 'Pool & ping pong rankings for the Houses',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0e16',
    theme_color: '#0a0e16',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
