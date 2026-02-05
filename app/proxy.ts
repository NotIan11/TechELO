import { type NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  // Proxy is now only for routing - auth is handled in pages/layouts
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
