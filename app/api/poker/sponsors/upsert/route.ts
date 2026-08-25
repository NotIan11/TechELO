import { NextResponse } from 'next/server'
import { isUuid } from '@/lib/poker/validation'
import { badRequest, firstRow, getRouteContext, readJson, rpcErrorResponse, serverError } from '@/lib/poker/server'
import type { PokerSponsorRow } from '@/lib/poker/types'

export async function POST(request: Request) {
  try {
    const ctx = await getRouteContext()
    if (ctx.unauthorized) return ctx.unauthorized

    const body = (await readJson(request)) as
      | { id?: unknown; name?: unknown; logo_url?: unknown; website_url?: unknown }
      | null
    if (!body) return badRequest('Invalid request body.')
    if (body.id != null && !isUuid(body.id)) return badRequest('Invalid sponsor id.')
    if (typeof body.name !== 'string' || body.name.trim() === '') return badRequest('Sponsor name is required.')
    if (body.name.trim().length > 60) return badRequest('Sponsor name must be 60 characters or fewer.')
    for (const key of ['logo_url', 'website_url'] as const) {
      const v = body[key]
      if (v != null && (typeof v !== 'string' || v.length > 300)) return badRequest(`${key} is invalid.`)
      if (typeof v === 'string' && v.trim() !== '' && !/^https?:\/\//i.test(v.trim())) {
        return badRequest(`${key === 'logo_url' ? 'Logo' : 'Website'} must be an http(s) URL.`)
      }
    }

    const { data, error } = await ctx.supabase.rpc('upsert_poker_sponsor', {
      p_payload: {
        id: body.id ?? null,
        name: body.name.trim(),
        logo_url: typeof body.logo_url === 'string' ? body.logo_url.trim() || null : null,
        website_url: typeof body.website_url === 'string' ? body.website_url.trim() || null : null,
      },
    })
    if (error) return rpcErrorResponse(error)

    return NextResponse.json({ sponsor: firstRow<PokerSponsorRow>(data) }, { status: 200 })
  } catch (error) {
    return serverError(error)
  }
}
