<template>
  <div id="app">
    <!-- Custom 3D Parallax Splash Screen -->
    <Transition name="fade">
      <div v-if="showSplash" class="custom-splash" @mousemove="handleMouseMove" @mouseleave="resetParallax" @touchmove="handleTouchMove" @touchend="resetParallax">
        <div class="splash-container">
          <div class="parallax-container" :style="parallaxStyle">
            <img src="/background_rings.png" class="splash-layer layer-bg" alt="Background Rings" />
            <img src="/knight_transparent.png" class="splash-layer layer-knight" alt="Chess Knight" />
          </div>
          <div class="splash-title">
            <span class="title-ai">AI</span> <span class="title-arena">Arena</span>
          </div>
          <div class="splash-loader">
            <div class="loader-bar"></div>
          </div>
        </div>
      </div>
    </Transition>

    <div class="status-bar-spacer"></div>

    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <div class="header-logo">
          <div class="logo-badge">AI</div>
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
import { ref, computed, onMounted } from 'vue';
import { Radio, Globe, Trophy, Clock } from '@lucide/vue';
import LiveTab from './components/LiveTab.vue';
import AgentsTab from './components/AgentsTab.vue';
import LeaderboardTab from './components/LeaderboardTab.vue';
import HistoryTab from './components/HistoryTab.vue';

const currentTab = ref('live');
const liveCount = ref(0);
const showSplash = ref(true);

const tiltX = ref(0);
const tiltY = ref(0);

const parallaxStyle = computed(() => {
  return {
    transform: `rotateX(${tiltY.value}deg) rotateY(${tiltX.value}deg)`
  };
});

function handleMouseMove(e) {
  const { clientX, clientY } = e;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dx = (clientX / w) - 0.5;
  const dy = (clientY / h) - 0.5;
  
  // Parallax angles (max 20 degrees)
  tiltX.value = dx * 40;
  tiltY.value = -dy * 40;
}

function handleTouchMove(e) {
  if (e.touches && e.touches[0]) {
    const { clientX, clientY } = e.touches[0];
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dx = (clientX / w) - 0.5;
    const dy = (clientY / h) - 0.5;
    
    tiltX.value = dx * 40;
    tiltY.value = -dy * 40;
  }
}

function resetParallax() {
  tiltX.value = 0;
  tiltY.value = 0;
}

const tabs = [
  { id: 'live',        icon: Radio,   label: 'Live' },
  { id: 'agents',      icon: Globe,   label: 'Online' },
  { id: 'leaderboard', icon: Trophy,  label: 'BXH' },
  { id: 'history',     icon: Clock,   label: 'Lịch sử' },
];

function switchTab(id) { currentTab.value = id; }

onMounted(() => {
  // Turn off custom splash screen after loader completes
  setTimeout(() => {
    showSplash.value = false;
  }, 2500);
});
</script>

<style scoped>
.custom-splash {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #000000;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  perspective: 1000px;
}

.splash-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 450px;
  padding: 20px;
}

.parallax-container {
  position: relative;
  width: 280px;
  height: 280px;
  transform-style: preserve-3d;
  transition: transform 0.1s ease-out;
  display: flex;
  justify-content: center;
  align-items: center;
}

.splash-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.layer-bg {
  transform: translateZ(-50px) scale(0.9);
  animation: rotateBg 25s linear infinite;
  opacity: 0.85;
}

.layer-knight {
  transform: translateZ(50px);
  animation: floatKnight 3s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 20px rgba(124, 92, 246, 0.4));
}

@keyframes rotateBg {
  from { transform: translateZ(-50px) scale(0.9) rotate(0deg); }
  to { transform: translateZ(-50px) scale(0.9) rotate(360deg); }
}

@keyframes floatKnight {
  from { transform: translateZ(50px) translateY(6px); }
  to { transform: translateZ(50px) translateY(-6px); }
}

.splash-title {
  margin-top: 30px;
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(79, 142, 247, 0.3);
  animation: pulseText 2s ease-in-out infinite alternate;
}

.title-ai {
  color: #4f8ef7;
}

.title-arena {
  color: #7c5cf6;
}

.splash-loader {
  width: 150px;
  height: 3px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-top: 25px;
  overflow: hidden;
}

.loader-bar {
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, #4f8ef7, #7c5cf6);
  animation: loadingBar 2.2s cubic-bezier(0.1, 0.8, 0.25, 1) forwards;
}

@keyframes loadingBar {
  0% { width: 0%; }
  100% { width: 100%; }
}

@keyframes pulseText {
  from { opacity: 0.8; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1.02); }
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
