<template>
  <div class="tab-container">
    <div class="tab-header">
      <h2 class="tab-title">
        <RadioIcon class="title-icon" :size="20" />
        Trận Đang Live
      </h2>
      <button class="refresh-btn" @click="load" :disabled="loading">
        <RefreshCw class="refresh-icon" :size="15" :class="{ spinning: loading }" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading && !matches.length" class="center-state">
      <div class="spinner"></div>
      <p>Đang tải...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!matches.length" class="center-state">
      <div class="empty-icon-svg"><Swords :size="48" :stroke-width="1.2" /></div>
      <p class="empty-text">Không có trận nào đang chạy</p>
      <button class="btn-primary" @click="load">Làm mới</button>
    </div>

    <!-- Match Cards -->
    <div v-else class="cards-list">
      <div
        v-for="match in matches"
        :key="match.match_id"
        class="match-card"
        @click="openMatch(match)"
      >
        <div class="card-top">
          <span class="game-chip">{{ gameIcon(match.game_id) }} {{ match.game_id }}</span>
          <span class="live-badge" v-if="match.status === 'running'">
            <span class="live-dot-sm"></span> LIVE
          </span>
          <span class="pending-badge" v-else>⏳ Starting</span>
        </div>
        <div class="vs-row">
          <div class="player-name">{{ match.p1_name || shortId(match.player_1_id) }}</div>
          <span class="vs-text">VS</span>
          <div class="player-name right">{{ match.p2_name || shortId(match.player_2_id) }}</div>
        </div>
        <div class="card-footer">
          <span class="match-id">{{ shortId(match.match_id) }}</span>
          <span class="duration">⏱ {{ formatDuration(now / 1000 - match.created_at) }}</span>
          <span class="watch-btn">👁 Xem</span>
        </div>
      </div>
    </div>

    <!-- Match Viewer Modal -->
    <MatchViewer
      v-if="viewingMatch"
      :match="viewingMatch"
      @close="viewingMatch = null"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { fetchActiveMatches, shortId, formatDuration, gameIcon } from '../hub.js';
import { Radio as RadioIcon, RefreshCw, Swords } from '@lucide/vue';
import MatchViewer from './MatchViewer.vue';

const emit = defineEmits(['count']);

const matches = ref([]);
const loading = ref(false);
const viewingMatch = ref(null);
const now = ref(Date.now());

let refreshTimer = null;
let clockTimer = null;

async function load() {
  loading.value = true;
  try {
    matches.value = await fetchActiveMatches();
    emit('count', matches.value.length);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function openMatch(match) {
  viewingMatch.value = match;
}

onMounted(() => {
  load();
  refreshTimer = setInterval(load, 8000);
  clockTimer = setInterval(() => { now.value = Date.now(); }, 1000);
});

onUnmounted(() => {
  clearInterval(refreshTimer);
  clearInterval(clockTimer);
});
</script>
