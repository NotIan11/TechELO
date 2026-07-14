import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

/** App icon: 8-ball on the brand gradient. Generated, so no binary assets in the repo. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fb923c, #ea580c)',
          borderRadius: 96,
        }}
      >
        <div
          style={{
            width: 300,
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: '#0a0e16',
            color: '#ffffff',
            fontSize: 190,
            fontWeight: 700,
            paddingBottom: 12,
          }}
        >
          8
        </div>
      </div>
    ),
    { ...size }
  )
}
