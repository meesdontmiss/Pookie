'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface MatchRecord {
  id: string;
  lobby_id: string;
  game_mode: string;
  status: string;
  winner_wallet: string | null;
  roster: Array<{ wallet: string; username: string; isAi?: boolean }>;
  started_at: string;
  completed_at: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function MatchHistoryPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    async function fetchMatches() {
      if (!supabaseUrl || !supabaseAnonKey) {
        setLoading(false);
        return;
      }
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        let query = supabase
          .from('match_state')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(50);

        if (filter !== 'all') {
          query = query.eq('status', filter);
        }

        const { data, error } = await query;
        if (error) throw error;
        setMatches((data as MatchRecord[]) || []);
      } catch (err) {
        console.error('Failed to fetch match history:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMatches();
  }, [filter]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const shortWallet = (w: string | null) => {
    if (!w) return '—';
    return w.length > 8 ? `${w.slice(0, 4)}...${w.slice(-4)}` : w;
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#00ff88';
      case 'cancelled': return '#ff4466';
      case 'active': return '#ffaa00';
      default: return '#888';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b1120 0%, #1a1040 50%, #0b1120 100%)',
      color: '#e0e8f0',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '24px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <button
            onClick={() => router.push('/pookiesumoroyale/lobby-browser')}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#ccc',
              padding: '10px 20px',
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Back to Lobbies
          </button>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            background: 'linear-gradient(90deg, #00ff88, #0af0ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}>
            Match History
          </h1>
          <div style={{ width: 120 }} />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {(['all', 'completed', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setLoading(true); }}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: filter === f ? '1px solid #00ff88' : '1px solid rgba(255,255,255,0.12)',
                background: filter === f ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.05)',
                color: filter === f ? '#00ff88' : '#aaa',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>Loading matches...</div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>No matches found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {matches.map((m) => (
              <div
                key={m.id}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14,
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                    {m.game_mode || 'Sumo Royale'}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {m.started_at ? formatDate(m.started_at) : '—'}
                  </div>
                  {m.roster && m.roster.length > 0 && (
                    <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                      {m.roster
                        .filter((r) => !r.isAi)
                        .map((r) => r.username || shortWallet(r.wallet))
                        .join(', ')}
                      {m.roster.filter((r) => r.isAi).length > 0 && (
                        <span> + {m.roster.filter((r) => r.isAi).length} AI</span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: statusColor(m.status),
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}>
                  {m.status}
                </div>

                <div style={{ textAlign: 'right' }}>
                  {m.winner_wallet ? (
                    <div>
                      <div style={{ fontSize: 11, color: '#888' }}>Winner</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#00ff88' }}>
                        {m.roster?.find((r) => r.wallet === m.winner_wallet)?.username || shortWallet(m.winner_wallet)}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#555' }}>—</div>
                  )}
                </div>

                <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>
                  {m.id.slice(0, 8)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
