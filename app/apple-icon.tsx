import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** Apple touch icon (no rounded corners — iOS applies its own mask). Same mark as /icon. */
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
          background: '#FF6C0C',
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            border: '18px solid #0b0b0c',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
