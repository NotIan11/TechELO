import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

/** App icon: the brand mark — orange disc with a single black ring. Generated, so no binary assets. */
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
          background: '#FF6C0C',
          borderRadius: 96,
        }}
      >
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: '50%',
            border: '52px solid #0b0b0c',
          }}
        />
      </div>
    ),
    { ...size }
  )
}
