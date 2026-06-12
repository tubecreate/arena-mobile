<template>
  <div class="viewer-overlay" @click.self="$emit('close')">
    <div class="viewer-sheet">
      <!-- Handle bar -->
      <div class="sheet-handle"></div>

      <!-- Header -->
      <div class="viewer-header">
        <div class="viewer-title">
          <span>{{ gameIcon(match.game_id) }}</span>
          <span>Match {{ shortId(match.match_id) }}</span>
          <span class="live-badge-sm" v-if="streamStatus === 'running'">
            <span class="live-dot-sm"></span> LIVE
          </span>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>



      <!-- Connection Status -->
      <div class="stream-status" :class="streamStatus">
        <span v-if="streamStatus === 'connecting'">🔄 Đang kết nối SSE...</span>
        <span v-else-if="streamStatus === 'running'">🟢 Đang stream live</span>
        <span v-else-if="streamStatus === 'finished'">🏁 Trận đã kết thúc</span>
        <span v-else>🔴 Mất kết nối</span>
      </div>

      <!-- Chess Board from FEN -->
      <div class="board-area" v-if="match.game_id === 'chess' && currentFen">
        <ChessBoard
          :fen="currentFen"
          :lastMove="currentLastMove"
          :turn="currentTurn"
          :p1Name="match.p1_name"
          :p2Name="match.p2_name"
          :winner="match.winner || (result ? result.winner : null)"
          :p1Id="match.player_1_id"
          :p2Id="match.player_2_id"
        />
      </div>

      <!-- Move Log -->
      <div class="move-log-header">
        <span>📋 Nước đi ({{ moves.length }})</span>
        <span class="turn-indicator" v-if="lastTurn">Lượt {{ lastTurn }}</span>
      </div>
      <div class="move-log" ref="logEl">
        <div v-if="!moves.length" class="log-empty">Chờ nước đi đầu tiên...</div>
        <div
          v-for="(mv, i) in moves"
          :key="i"
          class="move-row"
          :class="{ even: i % 2 === 0, latest: i === moves.length - 1 }"
        >
          <span class="move-num">{{ i + 1 }}.</span>
          <span class="move-player">{{ mv.player_id === match.player_1_id ? '♔' : '♚' }}</span>
          <span class="move-text">{{ displayMove(mv) }}</span>
          <span class="move-san" v-if="displaySan(mv)">{{ displaySan(mv) }}</span>
          <span class="move-time" v-if="mv.time_spent">{{ mv.time_spent.toFixed(1) }}s</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { openMatchStream, fetchMatchDetail, shortId, gameIcon } from '../hub.js';
import ChessBoard from './ChessBoard.vue';

const props = defineProps({ match: Object });
const emit = defineEmits(['close']);



// Live chess state helpers
const currentFen = computed(() => {
  if (!moves.value.length) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
  const lastItem = moves.value[moves.value.length - 1];
  let state = lastItem?.state || {};
  if (typeof state === 'string') {
    try { state = JSON.parse(state); } catch { state = {}; }
  }
  const board = state.board || null;
  if (board) return board.split(' ')[0];
  return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
});

const currentLastMove = computed(() => {
  if (!moves.value.length) return null;
  const lastItem = moves.value[moves.value.length - 1];
  const rawMove = lastItem?.move;
  if (!rawMove) return null;
  if (typeof rawMove === 'string') {
    const trimmed = rawMove.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed.move || null;
      } catch {}
    }
    return rawMove;
  }
  if (typeof rawMove === 'object') return rawMove.move || null;
  return null;
});

const currentTurn = computed(() => {
  if (!moves.value.length) return 'white';
  const lastItem = moves.value[moves.value.length - 1];
  let state = lastItem?.state || {};
  if (typeof state === 'string') {
    try { state = JSON.parse(state); } catch { state = {}; }
  }
  return state.current_turn || 'white';
});

function displayMove(mv) {
  const rawMove = mv.move || mv.action;
  if (!rawMove) return '—';
  if (typeof rawMove === 'string') {
    const trimmed = rawMove.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed.move || parsed.san || parsed.action || '—';
      } catch {
        return rawMove.slice(0, 15);
      }
    }
    return rawMove;
  }
  if (typeof rawMove === 'object') {
    return rawMove.move || rawMove.san || rawMove.action || '—';
  }
  return '—';
}

function displaySan(mv) {
  let state = mv.state || {};
  if (typeof state === 'string') {
    try { state = JSON.parse(state); } catch { state = {}; }
  }
  const moveHistory = state.move_history || [];
  return moveHistory[moveHistory.length - 1] || null;
}

const moves = ref([]);
const streamStatus = ref('connecting');
const lastTurn = ref(0);
const result = ref(null);
const logEl = ref(null);
let es = null;

async function init() {
  // Load existing history first
  try {
    const detail = await fetchMatchDetail(props.match.match_id);
    moves.value = detail.history || [];
    lastTurn.value = moves.value.length;
    if (detail.status === 'finished' || detail.is_over) {
      streamStatus.value = 'finished';
      result.value = parseResult(detail);
    }
    scrollLog();
  } catch {}

  if (streamStatus.value === 'finished') return;

  // Open SSE stream
  streamStatus.value = 'connecting';
  es = openMatchStream(
    props.match.match_id,
    (data) => {
      streamStatus.value = 'running';
      if (data.type === 'move' || data.move || data.action) {
        moves.value.push(data);
        lastTurn.value = moves.value.length;
        nextTick(scrollLog);
      }
      if (data.type === 'end' || data.winner !== undefined) {
        streamStatus.value = 'finished';
        result.value = parseResult(data);
        es?.close();
      }
    },
    () => {
      if (streamStatus.value !== 'finished') streamStatus.value = 'error';
    }
  );
}

function scrollLog() {
  if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight;
}

function parseResult(data) {
  if (data.winner) {
    const isP1 = data.winner === props.match.player_1_id;
    return { icon: '🏆', text: `${isP1 ? (props.match.p1_name || 'Trắng') : (props.match.p2_name || 'Đen')} thắng!` };
  }
  if (data.result === 'draw') return { icon: '🤝', text: 'Hòa!' };
  return { icon: '🏁', text: 'Trận kết thúc' };
}

onMounted(init);
onUnmounted(() => es?.close());
</script>
