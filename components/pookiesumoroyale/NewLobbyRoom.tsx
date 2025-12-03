"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";

import { supabase } from "@/services/supabase-config";
import { WagerPrompt } from "./WagerPrompt";

interface LobbyMeta {
  id: string;
  name: string;
  wager: number;
  status: string;
  maxPlayers: number;
}

interface LobbyPlayer {
  id: string;
  walletAddress: string;
  username: string;
  isReady: boolean;
  wagerAmount: number;
  wagerConfirmed: boolean;
  joinedAt: string;
}

interface NewLobbyRoomProps {
  lobbyId: string;
  isPractice: boolean;
}

const UNKNOWN_LOBBY_MESSAGE =
  "Waiting for lobby details. If this takes longer than a few seconds, rejoin from the lobby browser.";

function shortenWallet(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function NewLobbyRoom({
  lobbyId,
  isPractice,
}: NewLobbyRoomProps) {
  const router = useRouter();
  const { publicKey } = useWallet();
  const walletAddress = publicKey?.toBase58() ?? null;

  const [lobby, setLobby] = useState<LobbyMeta | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [wagerAmount, setWagerAmount] = useState(0.25);
  const [showWagerPrompt, setShowWagerPrompt] = useState(false);
  const [statusMessage, setStatusMessage] = useState(UNKNOWN_LOBBY_MESSAGE);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const everyoneReady = players.length > 0 && players.every((p) => p.isReady);
  const wagersLocked =
    isPractice || players.every((player) => player.wagerConfirmed);

  const localPlayer = useMemo(
    () =>
      players.find((player) => player.walletAddress === walletAddress) ??
      null,
    [players, walletAddress],
  );

  const refreshLobbyMeta = useCallback(async () => {
    const { data, error } = await supabase
      .from("lobbies")
      .select("id, name, wager_amount, status, max_players")
      .eq("id", lobbyId)
      .single();

    if (error) {
      console.error("Failed to load lobby details", error);
      setStatusMessage("Unable to load lobby details.");
      return;
    }

    setLobby({
      id: data.id,
      name: data.name,
      wager: Number(data.wager_amount ?? 0),
      status: data.status ?? "open",
      maxPlayers: data.max_players ?? 2,
    });

    setStatusMessage(
      data.status === "countdown"
        ? "Countdown in progress"
        : data.status === "in_game"
          ? "Match in progress"
          : "Waiting for players to ready up...",
    );
    setWagerAmount(Number(data.wager_amount ?? 0.25));
  }, [lobbyId]);

  const hydratePlayers = useCallback(async () => {
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/players`);
      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }

      const body = (await response.json()) as {
        players: Array<{
          id: string;
          wallet_address: string;
          username: string | null;
          is_ready: boolean;
          wager_amount: number | null;
          wager_confirmed: boolean;
          joined_at: string;
        }>;
      };

      const normalized = (body.players ?? []).map((player) => ({
        id: player.id,
        walletAddress: player.wallet_address,
        username:
          player.username?.trim() ||
          shortenWallet(player.wallet_address ?? ""),
        isReady: player.is_ready ?? false,
        wagerAmount: Number(player.wager_amount ?? 0),
        wagerConfirmed: player.wager_confirmed ?? false,
        joinedAt: player.joined_at,
      }));

      setPlayers(normalized);

      if (walletAddress) {
        const me = normalized.find(
          (player) => player.walletAddress === walletAddress,
        );
        if (me) {
          setLocalPlayerId(me.id);
          setWagerAmount(me.wagerAmount || lobby?.wager || 0.25);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load lobby players.");
    }
  }, [lobbyId, walletAddress, lobby?.wager]);

  const ensureLocalPlayer = useCallback(async () => {
    if (!walletAddress || joining) return;

    setJoining(true);
    try {
      const response = await fetch(`/api/lobbies/${lobbyId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          username: shortenWallet(walletAddress),
          wagerAmount: lobby?.wager ?? 0.25,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to join lobby");
      }

      const { player } = (await response.json()) as {
        player: { id: string; wager_amount: number };
      };

      setLocalPlayerId(player.id);
      setWagerAmount(Number(player.wager_amount ?? lobby?.wager ?? 0.25));
      await hydratePlayers();
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setJoining(false);
    }
  }, [walletAddress, lobbyId, lobby?.wager, hydratePlayers, joining]);

  const updatePlayer = useCallback(
    async (payload: {
      isReady?: boolean;
      wagerAmount?: number;
      wagerConfirmed?: boolean;
    }) => {
      if (!localPlayerId || !walletAddress) return;

      const response = await fetch(
        `/api/lobbies/${lobbyId}/players/${localPlayerId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update player");
      }
    },
    [localPlayerId, lobbyId, walletAddress],
  );

  const leaveLobby = useCallback(async () => {
    if (!localPlayerId) return;
    await fetch(`/api/lobbies/${lobbyId}/players/${localPlayerId}`, {
      method: "DELETE",
    });
  }, [localPlayerId, lobbyId]);

  useEffect(() => {
    refreshLobbyMeta();
    hydratePlayers();
  }, [refreshLobbyMeta, hydratePlayers]);

  useEffect(() => {
    if (!walletAddress) return;
    ensureLocalPlayer();
  }, [walletAddress, ensureLocalPlayer]);

  useEffect(() => {
    const channel = supabase
      .channel(`lobby-${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lobby_players",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        () => hydratePlayers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, hydratePlayers]);

  useEffect(() => {
    return () => {
      leaveLobby().catch((err) =>
        console.warn("Failed to leave lobby cleanly", err),
      );
    };
  }, [leaveLobby]);

  const toggleReady = async () => {
    if (!localPlayer) {
      setError("Connect your wallet to ready up.");
      return;
    }

    try {
      await updatePlayer({ isReady: !localPlayer.isReady });
      await hydratePlayers();
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    }
  };

  const handleWagerConfirm = async (amount: number) => {
    try {
      await updatePlayer({ wagerAmount: amount, wagerConfirmed: true });
      setWagerAmount(amount);
      setShowWagerPrompt(false);
      await hydratePlayers();
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    }
  };

  const handleStartMatch = () => {
    setStatusMessage("Starting match...");
    setTimeout(() => {
      router.push(`/pookiesumoroyale/game/${lobbyId}`);
    }, 800);
  };

  if (!walletAddress && !isPractice) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center text-white">
        <h1 className="text-4xl font-bold">Connect your wallet</h1>
        <p className="text-blue-100/80">
          You need to connect a Solana wallet before joining wagered matches.
          Head back to the lobby browser, connect, and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10 text-white">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-widest text-blue-200/70">
          Lobby {lobbyId}
        </p>
        <h1 className="text-4xl font-bold">
          {lobby?.name ?? "Pookie Sumo Room"}
        </h1>
        <p className="text-blue-100/80">{statusMessage}</p>
        {error && (
          <p className="text-sm text-rose-300">Lobby error: {error}</p>
        )}
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl lg:col-span-2">
          <h2 className="text-xl font-semibold">Players</h2>
          <ul className="mt-4 space-y-3">
            {players.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-white/20 bg-black/20 px-4 py-6 text-center text-sm text-blue-100/60">
                Waiting for players to join
              </li>
            ) : (
              players.map((player) => (
                <li
                  key={player.id}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">
                      {player.username}
                      {player.walletAddress === walletAddress && (
                        <span className="ml-2 text-xs text-blue-200">
                          (You)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-blue-100/70">
                      {player.isReady ? "Ready" : "Not ready"} ·{" "}
                      {isPractice
                        ? "Practice mode"
                        : player.wagerConfirmed
                          ? "Wager locked"
                          : "Wager pending"}
                    </p>
        </div>
                  <div className="flex gap-2 text-xs uppercase tracking-wide">
                    <span
                      className={`rounded-full px-3 py-1 ${
                        player.isReady
                          ? "bg-emerald-500/80 text-white"
                          : "bg-white/10 text-blue-100"
                      }`}
                    >
                      {player.isReady ? "Ready" : "Waiting"}
                    </span>
                    {!isPractice && (
                      <span
                        className={`rounded-full px-3 py-1 ${
                          player.wagerConfirmed
                            ? "bg-orange-500/80 text-white"
                            : "bg-white/10 text-blue-100"
                        }`}
                      >
                        {player.wagerConfirmed ? "Locked" : "Unconfirmed"}
                      </span>
                    )}
                </div>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h2 className="text-xl font-semibold">Your actions</h2>

          <button
            onClick={toggleReady}
            disabled={!walletAddress || joining}
            className="group relative w-full rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-4 py-3 font-bold text-white shadow-[0_4px_20px_rgba(59,130,246,0.4)] transition-all duration-200 hover:shadow-[0_6px_30px_rgba(59,130,246,0.6)] hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-200" />
            <span className="relative z-10">{localPlayer?.isReady ? "Cancel Ready" : "Ready Up"}</span>
          </button>

          {!isPractice && (
            <button
              onClick={() => setShowWagerPrompt(true)}
              disabled={!walletAddress || joining}
              className="group relative w-full rounded-xl bg-slate-800/80 border border-white/20 px-4 py-3 font-bold text-white shadow-lg shadow-black/20 transition-all duration-200 hover:bg-slate-700/80 hover:border-white/30 hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-200" />
              <span className="relative z-10">
                {localPlayer?.wagerConfirmed
                  ? `Wager Locked (${wagerAmount.toFixed(2)} SOL)`
                  : "Lock Wager"}
              </span>
            </button>
          )}

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-blue-100/80">
            <p>Lobby requirements</p>
            <ul className="mt-3 space-y-1">
              <li>Everyone must ready up</li>
              <li>
                {isPractice
                  ? "No wager needed in practice mode"
                  : "All wagers must be locked"}
          </li>
      </ul>
          </div>

          <button
            disabled={
              !everyoneReady ||
              !wagersLocked ||
              !localPlayer ||
              joining ||
              (!isPractice && !walletAddress)
            }
            onClick={handleStartMatch}
            className="group relative w-full rounded-xl bg-gradient-to-br from-orange-600 via-orange-500 to-pink-600 px-4 py-3 font-bold text-white shadow-[0_4px_20px_rgba(251,146,60,0.4)] transition-all duration-200 hover:shadow-[0_6px_30px_rgba(251,146,60,0.6)] hover:scale-[1.01] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none disabled:bg-slate-800 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-200" />
            <span className="relative z-10">
              {everyoneReady && wagersLocked
                ? "Start Match"
                : "Waiting for players"}
            </span>
          </button>
        </div>
      </section>

      <WagerPrompt
        open={showWagerPrompt}
        defaultAmount={wagerAmount}
        onConfirm={handleWagerConfirm}
        onClose={() => setShowWagerPrompt(false)}
      />
    </div>
  );
}
