import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

function getAdminSecret() {
  const secret = process.env.PAYOUT_SERVER_SECRET || process.env.ADMIN_SERVER_SECRET
  if (!secret) {
    throw new Error('Missing admin secret env (PAYOUT_SERVER_SECRET or ADMIN_SERVER_SECRET)')
  }
  return secret
}

type RouteContext = {
  params: {
    id: string
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const secretHeader =
      request.headers.get('x-admin-secret') || request.headers.get('X-Admin-Secret')
    const expected = getAdminSecret()
    if (secretHeader !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'Missing job id' }, { status: 400 })
    }

    const supa = getSupabaseAdmin()
    const { data, error } = await supa
      .from('payment_jobs')
      .select('id, status, attempts')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Payment job not found', details: error?.message },
        { status: 404 },
      )
    }

    const { error: updateError } = await supa
      .from('payment_jobs')
      .update({
        status: 'pending',
        attempts: 0,
        last_error: null,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to reset payment job', details: updateError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('[admin/payment-jobs/retry] POST error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


