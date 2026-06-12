<template>
  <div class="tab-container">
    <div class="tab-header">
      <h2 class="tab-title"><ClockIcon class="title-icon" :size="20" /> Lịch Sử Trận</h2>
      <button class="refresh-btn" @click="load"><RefreshCw :size="15" :class="{ spinning: loading }" /></button>
    </div>

    <div v-if="loading && !rows.length" class="center-state">
      <div class="spinner"></div>
    </div>
    <div v-else-if="!rows.length" class="center-state">
      <div class="empty-icon">📋</div>
      <p class="empty-text">Chưa có lịch sử</p>
    </div>

    <div v-else class="history-list">
      <div
        v-for="row in rows"
        :key="row.match_id || row.id"
        class="history-card"
        @click="openReplay(row)"
      >
        <div class="hcard-top">
          <span class="game-chip">{{ gameIcon(row.game_id) }} {{ row.game_id }}</span>
          <span class="hcard-result" :class="resultClass(row)">
            {{ resultLabel(row) }}
          </span>
        </div>
        <div class="hcard-players">
          <span class="hname" :class="{ winner: isWinner(row, 1) }">
            {{ row.player_1 || row.p1_name || shortId(row.player_1_id) }}
          </span>
          <span class="hvs">vs</span>
          <span class="hname right" :class="{ winner: isWinner(row, 2) }">
            {{ row.player_2 || row.p2_name || shortId(row.player_2_id) }}
          </span>
        </div>
        <div class="hcard-footer">
          <span class="hid">{{ shortId(row.match_id) }}</span>
          <span class="hdur" v-if="row.duration">⏱ {{ formatDuration(row.duration) }}</span>
          <span class="replay-hint">▶ Xem lại</span>
          <span class="hdate">{{ formatDate(row.timestamp) }}</span>
        </div>
      </div>
    </div>

    <!-- Replay Viewer -->
    <Teleport to="#app">
      <ReplayViewer
        v-if="replayMatch"
        :key="replayMatch.match_id"
        :match="replayMatch"
        :hasPrev="hasPrevMatch"
        :hasNext="hasNextMatch"
        @prev="goToPrevMatch"
        @next="goToNextMatch"
        @close="replayMatch = null"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchHistory, shortId, formatDuration, gameIcon } from '../hub.js';
import { Clock as ClockIcon, RefreshCw } from '@lucide/vue';
import ReplayViewer from './ReplayViewer.vue';

const rows = ref([]);
const loading = ref(false);
const replayMatch = ref(null);

const currentMatchIndex = computed(() => {
  if (!replayMatch.value) return -1;
  return rows.value.findIndex(r => r.match_id === replayMatch.value.match_id);
});

const hasPrevMatch = computed(() => {
  const idx = currentMatchIndex.value;
  return idx > 0;
});

const hasNextMatch = computed(() => {
  const idx = currentMatchIndex.value;
  return idx >= 0 && idx < rows.value.length - 1;
});

function goToPrevMatch() {
  const idx = currentMatchIndex.value;
  if (idx > 0) {
    openReplay(rows.value[idx - 1]);
  }
}

function goToNextMatch() {
  const idx = currentMatchIndex.value;
  if (idx >= 0 && idx < rows.value.length - 1) {
    openReplay(rows.value[idx + 1]);
  }
}

async function load() {
  loading.value = true;
  try {
    const all = await fetchHistory();
    // Lọc bỏ trận lỗi 0 nước đi (error ngay từ đầu, chưa đánh)
    rows.value = all.filter(r => {
      if (r.move_count != null) return r.move_count > 0;
      if (r.error && r.duration != null && r.duration < 10) return false;
      return true;
    });
  }
  catch (e) { console.error(e); }
  finally { loading.value = false; }
}

function openReplay(row) {
  // Normalize into the shape ReplayViewer expects
  replayMatch.value = {
    match_id:    row.match_id,
    game_id:     row.game_id,
    player_1_id: row.player_1_id || row.player_1 || '—',
    player_2_id: row.player_2_id || row.player_2 || '—',
    p1_name:     row.player_1 || row.p1_name || '',
    p2_name:     row.player_2 || row.p2_name || '',
    winner:      row.winner,
  };
}

function resultClass(row) {
  const w = row.winner;
  if (!w) return '';
  if (w === 'draw') return 'draw';
  return 'win';
}

function resultLabel(row) {
  const w = row.winner;
  const p1 = row.player_1 || row.p1_name;
  const p2 = row.player_2 || row.p2_name;
  if (!w) return '—';
  if (w === 'draw') return '🤝 Hòa';
  if (w === p1) return `🏆 ${p1}`;
  if (w === p2) return `🏆 ${p2}`;
  return `🏆 ${String(w).slice(0, 12)}`;
}

function isWinner(row, playerNum) {
  const w = row.winner;
  if (!w || w === 'draw') return false;
  const p = playerNum === 1 ? (row.player_1 || row.p1_name) : (row.player_2 || row.p2_name);
  return w === p;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

onMounted(load);
</script>
