import { NextResponse } from 'next/server'
import { fetchAccountHistory } from '@/lib/account-history'

type RouteContext = {
  params: {
    wallet: string
  }
}

export async function GET(_req: Request, { params }: RouteContext) {
  const wallet = params.wallet
  if (!wallet) {
    return NextResponse.json({ error: 'Wallet is required' }, { status: 400 })
  }
  try {
    const payload = await fetchAccountHistory(wallet)
    return NextResponse.json(payload)
  } catch (error: any) {
    console.error('Failed to fetch account history', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch history' }, { status: 500 })
  }
}


