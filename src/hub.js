// Hub API client — all calls go to tournament-hub.tubecreate.com
const HUB = 'https://tournament-hub.tubecreate.com/api/v1/hub';

export async function fetchActiveMatches() {
  const res = await fetch(`${HUB}/matches/active`);
  if (!res.ok) throw new Error('Failed to fetch active matches');
  return (await res.json()).items || [];
}

export async function fetchMatchDetail(matchId) {
  const res = await fetch(`${HUB}/matches/${matchId}`);
  if (!res.ok) throw new Error('Failed to fetch match');
  return res.json();
}

export async function fetchHistory(page = 0) {
  const res = await fetch(`${HUB}/matches/list`);
  if (!res.ok) throw new Error('Failed to fetch history');
  const data = await res.json();
  return data.items || [];
}

export async function fetchLeaderboard(gameId = 'chess') {
  const res = await fetch(`${HUB}/leaderboard/${gameId}`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  const data = await res.json();
  return data.items || [];
}

export async function fetchOnlineAgents(gameId = 'chess') {
  const res = await fetch(`${HUB}/agents?game_id=${gameId}&online_only=true`);
  if (!res.ok) throw new Error('Failed to fetch online agents');
  return (await res.json()).items || [];
}

export function openMatchStream(matchId, onEvent, onError) {
  const url = `${HUB}/matches/${matchId}/stream`;
  const es = new EventSource(url);
  es.onmessage = (e) => {
    try { onEvent(JSON.parse(e.data)); } catch {}
  };
  es.onerror = onError;
  return es; // caller must call es.close()
}

export function shortId(id) {
  return id ? id.slice(-8).toUpperCase() : '???';
}

export function formatDuration(sec) {
  if (!sec || sec < 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function gameIcon(gameId) {
  if (gameId === 'snake') return '🐍';
  if (gameId === 'tetris') return '🧱';
  return '♟️';
}
