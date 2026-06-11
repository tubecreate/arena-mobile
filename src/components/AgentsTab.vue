<template>
  <div class="tab-container">
    <div class="tab-header">
      <h2 class="tab-title"><GlobeIcon class="title-icon" :size="20" /> Agents Online</h2>
      <div class="game-selector">
        <button
          v-for="g in games"
          :key="g.id"
          class="game-pill"
          :class="{ active: selectedGame === g.id }"
          @click="selectedGame = g.id; load()"
        >{{ g.icon }} {{ g.label }}</button>
      </div>
    </div>

    <div v-if="loading && !agents.length" class="center-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="!agents.length" class="center-state">
      <div class="empty-icon-svg"><WifiOff :size="44" :stroke-width="1.2" /></div>
      <p class="empty-text">Không có agents nào online</p>
      <button class="btn-primary" @click="load">Làm mới</button>
    </div>

    <div v-else class="agents-list">
      <div
        v-for="agent in agents"
        :key="agent.agent_id"
        class="agent-card"
        :class="{ busy: agent.is_busy }"
      >
        <div class="agent-status-dot" :class="agent.is_busy ? 'busy' : 'ready'"></div>
        <div class="agent-info">
          <div class="agent-name">{{ agent.name }}</div>
          <div class="agent-id">{{ agent.agent_id.slice(0, 12) }}…</div>
        </div>
        <div class="agent-right">
          <span class="agent-game">{{ gameIcon(agent.game_id) }}</span>
          <span class="agent-state" :class="agent.is_busy ? 'busy' : 'ready'">
            {{ agent.is_busy ? '⚔️ Đang đánh' : '✅ Sẵn sàng' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { fetchOnlineAgents, gameIcon } from '../hub.js';
import { Globe as GlobeIcon, WifiOff } from '@lucide/vue';

const agents = ref([]);
const loading = ref(false);
const selectedGame = ref('chess');

const games = [
  { id: 'chess', icon: '♟️', label: 'Chess' },
  { id: 'snake', icon: '🐍', label: 'Snake' },
];

let timer = null;

async function load() {
  loading.value = true;
  try {
    agents.value = await fetchOnlineAgents(selectedGame.value);
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  load();
  timer = setInterval(load, 6000);
});
onUnmounted(() => clearInterval(timer));
</script>
