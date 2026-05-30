import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    lobbyId: string;
  };
};

const LOBBY_FIELDS =
  "id, max_players, current_players, status, wager_amount";

async function fetchLobby(lobbyId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from("lobbies")
    .select(LOBBY_FIELDS)
    .eq("id", lobbyId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function syncLobbyPlayerCount(lobbyId: string) {
  const supabaseAdmin = getSupabaseAdmin()
  const { count } = await supabaseAdmin
    .from("lobby_players")
    .select("id", { count: "exact", head: true })
    .eq("lobby_id", lobbyId);

  await supabaseAdmin
    .from("lobbies")
    .update({ current_players: count ?? 0 })
    .eq("id", lobbyId);
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  const { lobbyId } = params;

  if (!lobbyId) {
    return NextResponse.json(
      { error: "Lobby ID is required" },
      { status: 400 },
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from("lobby_players")
      .select(
        "id, wallet_address, username, is_ready, wager_amount, wager_confirmed, joined_at",
      )
      .eq("lobby_id", lobbyId)
      .order("joined_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ players: data ?? [] });
  } catch (error) {
    console.error("Failed to load lobby players", error);
    return NextResponse.json(
      { error: "Unable to load lobby players" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  const { lobbyId } = params;

  if (!lobbyId) {
    return NextResponse.json(
      { error: "Lobby ID is required" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  // Note: wagerAmount is intentionally NOT read from the client — the wager is
  // always the lobby's configured amount so a player cannot tamper with it.
  const { walletAddress, username } = body as {
    walletAddress?: string;
    username?: string;
  };

  if (!walletAddress) {
    return NextResponse.json(
      { error: "walletAddress is required" },
      { status: 400 },
    );
  }

  try {
    const lobby = await fetchLobby(lobbyId);

    if (!lobby) {
      return NextResponse.json(
        { error: "Lobby not found" },
        { status: 404 },
      );
    }

    if (lobby.status !== "open" && lobby.status !== "countdown") {
      return NextResponse.json(
        { error: "Lobby is not joinable" },
        { status: 409 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { data: existingPlayer, error: existingError } = await supabaseAdmin
      .from("lobby_players")
      .select("id")
      .eq("lobby_id", lobbyId)
      .eq("wallet_address", walletAddress)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (lobby.current_players >= lobby.max_players && !existingPlayer) {
      return NextResponse.json(
        { error: "Lobby is full" },
        { status: 409 },
      );
    }

    const { data: player, error } = await supabaseAdmin
      .from("lobby_players")
      .upsert(
        {
          lobby_id: lobbyId,
          wallet_address: walletAddress,
          username: username?.trim() || walletAddress,
          wager_amount: lobby.wager_amount,
        },
        { onConflict: "lobby_id,wallet_address" },
      )
      .select(
        "id, wallet_address, username, is_ready, wager_amount, wager_confirmed, joined_at",
      )
      .single();

    if (error || !player) {
      throw new Error(error?.message ?? "Failed to join lobby");
    }

    await syncLobbyPlayerCount(lobbyId);

    return NextResponse.json({ player }, { status: 201 });
  } catch (error) {
    console.error("Failed to join lobby", error);
    return NextResponse.json(
      { error: "Unable to join lobby" },
      { status: 500 },
    );
  }
}


