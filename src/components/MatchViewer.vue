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

      <!-- VS Bar -->
      <div class="viewer-vs">
        <div class="vp left">
          <div class="vp-name">{{ match.p1_name || shortId(match.player_1_id) }}</div>
          <div class="vp-label">Trắng ♔</div>
        </div>
        <span class="vs-center">VS</span>
        <div class="vp right">
          <div class="vp-name">{{ match.p2_name || shortId(match.player_2_id) }}</div>
          <div class="vp-label">Đen ♚</div>
        </div>
      </div>

      <!-- Connection Status -->
      <div class="stream-status" :class="streamStatus">
        <span v-if="streamStatus === 'connecting'">🔄 Đang kết nối SSE...</span>
        <span v-else-if="streamStatus === 'running'">🟢 Đang stream live</span>
        <span v-else-if="streamStatus === 'finished'">🏁 Trận đã kết thúc</span>
        <span v-else>🔴 Mất kết nối</span>
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
          <span class="move-text">{{ mv.move || mv.action || '—' }}</span>
          <span class="move-time" v-if="mv.time_spent">{{ mv.time_spent.toFixed(1) }}s</span>
        </div>
      </div>

      <!-- Result banner -->
      <div class="result-banner" v-if="result">
        <div class="result-icon">{{ result.icon }}</div>
        <div class="result-text">{{ result.text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { openMatchStream, fetchMatchDetail, shortId, gameIcon } from '../hub.js';

const props = defineProps({ match: Object });
const emit = defineEmits(['close']);

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
