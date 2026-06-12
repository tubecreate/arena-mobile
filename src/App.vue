<template>
  <div id="app">
    <div class="status-bar-spacer"></div>

    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <div class="header-logo">
          <img src="/arena_logo.png" alt="AI Arena" style="width: 28px; height: 28px; object-fit: contain; border-radius: 6px;" />
          <span class="logo-text">Arena</span>
        </div>
        <div class="header-live" v-if="liveCount > 0">
          <span class="live-dot"></span>
          <span>{{ liveCount }} LIVE</span>
        </div>
      </div>
    </header>

    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="nav-item"
        :class="{ active: currentTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        <component :is="tab.icon" class="nav-svg" :stroke-width="currentTab === tab.id ? 2.2 : 1.6" />
        <span class="nav-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Main Content -->
    <main class="main-content">
      <LiveTab v-if="currentTab === 'live'" @count="liveCount = $event" />
      <AgentsTab v-else-if="currentTab === 'agents'" />
      <LeaderboardTab v-else-if="currentTab === 'leaderboard'" />
      <HistoryTab v-else-if="currentTab === 'history'" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { Radio, Globe, Trophy, Clock } from '@lucide/vue';
import LiveTab from './components/LiveTab.vue';
import AgentsTab from './components/AgentsTab.vue';
import LeaderboardTab from './components/LeaderboardTab.vue';
import HistoryTab from './components/HistoryTab.vue';

const currentTab = ref('live');
const liveCount = ref(0);

const tabs = [
  { id: 'live',        icon: Radio,   label: 'Live' },
  { id: 'agents',      icon: Globe,   label: 'Online' },
  { id: 'leaderboard', icon: Trophy,  label: 'BXH' },
  { id: 'history',     icon: Clock,   label: 'Lịch sử' },
];

function switchTab(id) { currentTab.value = id; }
</script>
