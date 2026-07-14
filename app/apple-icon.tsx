import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** Apple touch icon (no rounded corners — iOS applies its own mask). */
export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            width: 106,
            height: 106,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: '#0a0e16',
            color: '#ffffff',
            fontSize: 66,
            fontWeight: 700,
            paddingBottom: 4,
          }}
        >
          8
        </div>
      </div>
    ),
    { ...size }
  )
}
