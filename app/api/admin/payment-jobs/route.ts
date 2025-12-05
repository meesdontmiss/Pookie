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

export async function GET(request: Request) {
  try {
    const secretHeader =
      request.headers.get('x-admin-secret') || request.headers.get('X-Admin-Secret')
    const expected = getAdminSecret()
    if (secretHeader !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'failed'
    const limit = Math.min(Number(searchParams.get('limit') || '50'), 200)

    const supa = getSupabaseAdmin()
    const query = supa
      .from('payment_jobs')
      .select('id, job_type, status, attempts, last_error, created_at, updated_at, payload')
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(limit)

    const { data, error } = await query
    if (error) {
      return NextResponse.json(
        { error: 'Failed to load payment jobs', details: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ jobs: data ?? [] })
  } catch (error: any) {
    console.error('[admin/payment-jobs] GET error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


