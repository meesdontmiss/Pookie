import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: {
    lobbyId: string;
    playerId: string;
  };
};

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

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  const { lobbyId, playerId } = params;

  if (!lobbyId || !playerId) {
    return NextResponse.json(
      { error: "Missing lobby or player id" },
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

  const { isReady, wagerAmount, wagerConfirmed } = body as {
    isReady?: boolean;
    wagerAmount?: number;
    wagerConfirmed?: boolean;
  };

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from("lobby_players")
      .update({
        is_ready: typeof isReady === "boolean" ? isReady : undefined,
        wager_amount:
          typeof wagerAmount === "number" ? wagerAmount : undefined,
        wager_confirmed:
          typeof wagerConfirmed === "boolean" ? wagerConfirmed : undefined,
      })
      .eq("id", playerId)
      .eq("lobby_id", lobbyId)
      .select(
        "id, wallet_address, username, is_ready, wager_amount, wager_confirmed, joined_at",
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Player update failed");
    }

    return NextResponse.json({ player: data });
  } catch (error) {
    console.error("Failed to update lobby player", error);
    return NextResponse.json(
      { error: "Unable to update lobby player" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  const { lobbyId, playerId } = params;

  if (!lobbyId || !playerId) {
    return NextResponse.json(
      { error: "Missing lobby or player id" },
      { status: 400 },
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { error } = await supabaseAdmin
      .from("lobby_players")
      .delete()
      .eq("id", playerId)
      .eq("lobby_id", lobbyId);

    if (error) {
      throw new Error(error.message);
    }

    await syncLobbyPlayerCount(lobbyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove lobby player", error);
    return NextResponse.json(
      { error: "Unable to remove lobby player" },
      { status: 500 },
    );
  }
}


