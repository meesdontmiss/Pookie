import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  const { name, wager, maxPlayers, walletAddress } = body as {
    name?: string
    wager?: number
    maxPlayers?: number
    walletAddress?: string
  }

  if (!name || !wager || !maxPlayers) {
    return NextResponse.json({ error: "Missing lobby fields" }, { status: 400 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("lobbies")
      .insert({
        name: name.trim(),
        wager_amount: wager,
        max_players: maxPlayers,
        current_players: 0,
        status: "open",
        created_by: walletAddress ?? null,
      })
      .select("id, name, wager_amount, max_players, status, current_players")
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create lobby")
    }

    return NextResponse.json({ lobby: data }, { status: 201 })
  } catch (error) {
    console.error("Failed to create lobby", error)
    return NextResponse.json({ error: "Unable to create lobby" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("lobbies")
      .select("id, name, wager_amount, max_players, status, current_players")
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ lobbies: data ?? [] })
  } catch (error) {
    console.error("Failed to load lobbies", error)
    return NextResponse.json({ error: "Unable to load lobbies" }, { status: 500 })
  }
}
