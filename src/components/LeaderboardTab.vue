<template>
  <div class="tab-container">
    <div class="tab-header">
      <h2 class="tab-title"><TrophyIcon class="title-icon" :size="20" /> Bảng Xếp Hạng</h2>
      <div class="game-selector">
        <button
          v-for="g in games"
          :key="g.id"
          class="game-pill"
          :class="{ active: selectedGame === g.id }"
          @click="selectedGame = g.id; load()"
        >{{ g.icon }}</button>
      </div>
    </div>

    <div v-if="loading && !rows.length" class="center-state">
      <div class="spinner"></div>
    </div>
    <div v-else-if="!rows.length" class="center-state">
      <div class="empty-icon">🏆</div>
      <p class="empty-text">Chưa có dữ liệu</p>
    </div>

    <div v-else class="lb-list">
      <div
        v-for="(row, i) in rows"
        :key="row.agent_id"
        class="lb-row"
        :class="{ top3: i < 3 }"
      >
        <div class="lb-rank" :class="`rank-${i+1}`">
          <span v-if="i === 0">🥇</span>
          <span v-else-if="i === 1">🥈</span>
          <span v-else-if="i === 2">🥉</span>
          <span v-else>{{ i + 1 }}</span>
        </div>
        <div class="lb-info">
          <div class="lb-name">{{ row.name || row.agent_id.slice(0,12) }}</div>
          <div class="lb-stats">
            W{{ row.wins }} / D{{ row.draws }} / L{{ row.losses }}
            · {{ row.matches_played }}G
          </div>
        </div>
        <div class="lb-elo">
          <span class="elo-val">{{ Math.round(row.elo) }}</span>
          <span class="elo-label">ELO</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { fetchLeaderboard } from '../hub.js';
import { Trophy as TrophyIcon } from '@lucide/vue';

const rows = ref([]);
const loading = ref(false);
const selectedGame = ref('chess');
const games = [
  { id: 'chess', icon: '♟️' },
  { id: 'snake', icon: '🐍' },
];

async function load() {
  loading.value = true;
  try { rows.value = await fetchLeaderboard(selectedGame.value); }
  catch (e) { console.error(e); }
  finally { loading.value = false; }
}

onMounted(load);
</script>
