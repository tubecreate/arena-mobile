<template>
  <div
    class="viewer-overlay"
    @click.self="$emit('close')"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <div class="viewer-sheet replay-sheet">
      <div class="sheet-handle"></div>

      <!-- Header -->
      <div class="viewer-header">
        <div class="viewer-title">
          <span>♟️</span>
          <span>Replay</span>
          <span class="replay-badge">⏪ Xem lại</span>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="center-state" style="flex:1; min-height:160px">
        <div class="spinner"></div>
      </div>
      <div v-else-if="error" class="center-state" style="flex:1">
        <div class="empty-icon">⚠️</div>
        <p class="empty-text">{{ error }}</p>
      </div>

      <template v-else>
        <!-- Chess Board from FEN -->
        <div class="board-area" v-if="currentFen">
          <ChessBoard
            :fen="currentFen"
            :lastMove="currentLastMove"
            :turn="currentTurn"
            :p1Name="match.p1_name"
            :p2Name="match.p2_name"
            :winner="match.winner"
            :p1Id="match.player_1_id"
            :p2Id="match.player_2_id"
          />
        </div>
        <div v-else class="center-state" style="min-height:80px">
          <p class="empty-text">Không có dữ liệu bàn cờ</p>
        </div>

        <!-- Controls -->
        <div class="replay-controls">
          <button class="ctrl-btn" @click="stepTo(0)" :disabled="currentStep===0">
            <ChevronsLeft :size="18" />
          </button>
          <button class="ctrl-btn" @click="stepBack" :disabled="currentStep===0">
            <ChevronLeft :size="18" />
          </button>
          <button class="ctrl-btn play" @click="togglePlay">
            <Pause v-if="playing" :size="22" />
            <Play v-else :size="22" style="margin-left: 2px;" />
          </button>
          <button class="ctrl-btn" @click="stepForward" :disabled="currentStep>=moves.length">
            <ChevronRight :size="18" />
          </button>
          <button class="ctrl-btn" @click="stepTo(moves.length)" :disabled="currentStep>=moves.length">
            <ChevronsRight :size="18" />
          </button>
        </div>

        <!-- Speed selector -->
        <div class="speed-row">
          <span class="speed-label">Tốc độ:</span>
          <button
            v-for="s in speedOptions" :key="s.value"
            class="speed-btn"
            :class="{ active: !realSpeed && playSpeed === s.value }"
            @click="setSpeed(s.value)"
          >{{ s.label }}</button>
          <button
            class="speed-btn real"
            :class="{ active: realSpeed }"
            @click="toggleRealSpeed"
          >⏱ Thực</button>
        </div>

        <!-- Scrubber -->
        <div class="replay-scrubber">
          <input type="range" class="scrubber-input"
            :min="0" :max="moves.length" :value="currentStep"
            @input="stepTo(+$event.target.value)" />
          <div class="scrubber-label">Nước {{ currentStep }} / {{ moves.length }}</div>
        </div>

        <!-- Move list -->
        <div class="move-log" ref="logEl">
          <div v-if="!moves.length" class="log-empty">Không có nước đi</div>
          <!-- Initial position row -->
          <div
            class="move-row"
            :class="{ latest: currentStep === 0 }"
            @click="stepTo(0)"
          >
            <span class="move-num">0.</span>
            <span class="move-player">🏁</span>
            <span class="move-text">Vị trí ban đầu</span>
          </div>
          <div
            v-for="(mv, i) in moves"
            :key="i"
            class="move-row"
            :class="{
              even: i%2===0,
              latest: i+1 === currentStep,
              future: i+1 > currentStep
            }"
            @click="stepTo(i+1)"
          >
            <span class="move-num">{{ i+1 }}.</span>
            <span class="move-player">{{ i%2===0 ? '♔' : '♚' }}</span>
            <span class="move-text">{{ mv.notation }}</span>
            <span class="move-san" v-if="mv.san">{{ mv.san }}</span>
            <span class="move-time" v-if="mv.thinkMs">{{ (mv.thinkMs/1000).toFixed(1) }}s</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { fetchMatchDetail, gameIcon } from '../hub.js';
import { ChevronsLeft, ChevronLeft, Play, Pause, ChevronRight, ChevronsRight } from '@lucide/vue';
import ChessBoard from './ChessBoard.vue';

const props = defineProps({
  match:   Object,
  hasPrev: Boolean,
  hasNext: Boolean,
});
const emit = defineEmits(['close', 'prev', 'next']);

// Each entry: { notation, san, fen, lastMove, turn, thinkMs }
const moves = ref([]);
const initialFen = ref('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'); // standard start
const currentStep = ref(0);
const loading = ref(true);
const error = ref(null);
const playing = ref(false);
const logEl = ref(null);
let playTimer = null;

// FEN and last-move for the currently displayed step
const currentFen = computed(() => {
  if (currentStep.value === 0) return initialFen.value;
  return moves.value[currentStep.value - 1]?.fen || initialFen.value;
});
const currentLastMove = computed(() => {
  if (currentStep.value === 0) return null;
  return moves.value[currentStep.value - 1]?.lastMove || null;
});
const currentTurn = computed(() => {
  if (currentStep.value === 0) return 'white';
  return moves.value[currentStep.value - 1]?.turn || 'white';
});

const resultInfo = computed(() => {
  const w = props.match.winner;
  if (!w) return { icon: '🏁', text: 'Trận kết thúc' };
  if (w === 'draw') return { icon: '🤝', text: 'Hòa!' };
  const p1 = props.match.p1_name;
  const p2 = props.match.p2_name;
  if (w === p1 || w === props.match.player_1_id) return { icon: '🏆', text: `${p1||'Trắng'} thắng!` };
  if (w === p2 || w === props.match.player_2_id) return { icon: '🏆', text: `${p2||'Đen'} thắng!` };
  return { icon: '🏆', text: `${String(w).slice(0,20)} thắng!` };
});

// ─── Parse history from API ──────────────────────
function extractMove(rawMove) {
  // rawMove can be: "e2e4" | { move:"e2e4", ... } | "{\"move\":\"e2e4\",...}" 
  if (!rawMove) return null;
  if (typeof rawMove === 'string') {
    const trimmed = rawMove.trim();
    if (trimmed.startsWith('{')) {
      try { rawMove = JSON.parse(trimmed); } catch { return rawMove.slice(0, 10); }
    } else { return rawMove; }
  }
  if (typeof rawMove === 'object') return rawMove.move || rawMove.san || rawMove.action || null;
  return null;
}

function parseHistory(rawHistory) {
  return rawHistory.map(item => {
    // history item format: { turn, player, move:{move,chat_message,...}, state:{board,current_turn,...}, thinking_time_ms }
    const notation = extractMove(item.move) || '?';
    // state.board = FEN, state.current_turn = "white"|"black"
    let state = item.state || {};
    if (typeof state === 'string') {
      try { state = JSON.parse(state); } catch { state = {}; }
    }
    const fenFull = state.board || null;
    const fen = fenFull ? fenFull.split(' ')[0] : null; // just piece placement part
    const turn = state.current_turn || (item.turn % 2 === 0 ? 'white' : 'black');
    // move_history from state contains SAN notation
    const moveHistory = state.move_history || [];
    const san = moveHistory[moveHistory.length - 1] || null;
    const thinkMs = item.thinking_time_ms || item.time_spent || null;
    return { notation, san, fen, lastMove: notation, turn, thinkMs };
  });
}

// ─── Speed settings ─────────────────────────────
const speedOptions = [
  { label: '0.5×', value: 1600 },
  { label: '1×',   value: 800  },
  { label: '2×',   value: 400  },
  { label: '4×',   value: 200  },
];
const playSpeed = ref(800);  // ms per step
const realSpeed = ref(true); // use actual think time

function setSpeed(ms) { realSpeed.value = false; playSpeed.value = ms; if (playing.value) restart(); }
function toggleRealSpeed() { realSpeed.value = !realSpeed.value; if (playing.value) restart(); }
function restart() { clearInterval(playTimer); playing.value = false; nextTick(togglePlay); }

// ─── Navigation ─────────────────────────────────
function stepTo(n) {
  currentStep.value = Math.max(0, Math.min(n, moves.value.length));
  nextTick(scrollLog);
}
function stepBack()    { stepTo(currentStep.value - 1); }
function stepForward() { stepTo(currentStep.value + 1); }

function scheduleNext() {
  if (currentStep.value >= moves.value.length) {
    playing.value = false; return;
  }
  let delay = playSpeed.value;
  if (realSpeed.value) {
    // delay = think time of the NEXT move to be shown
    const mv = moves.value[currentStep.value];
    delay = mv?.thinkMs ? Math.min(mv.thinkMs, 30000) : 2000;
    // scale so we don't wait too long
    delay = Math.max(300, delay * 0.5);
  }
  playTimer = setTimeout(() => {
    if (!playing.value) return;
    stepForward();
    scheduleNext();
  }, delay);
}

function togglePlay() {
  if (playing.value) { clearTimeout(playTimer); playing.value = false; return; }
  if (currentStep.value >= moves.value.length) stepTo(0);
  playing.value = true;
  scheduleNext();
}
function scrollLog() {
  if (!logEl.value) return;
  const rows = logEl.value.querySelectorAll('.move-row');
  const idx = currentStep.value;
  if (rows[idx]) rows[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Load ────────────────────────────────────────
onMounted(async () => {
  try {
    const detail = await fetchMatchDetail(props.match.match_id);
    let h = detail.history;
    if (typeof h === 'string') { try { h = JSON.parse(h); } catch { h = []; } }
    if (!Array.isArray(h)) h = [];
    moves.value = parseHistory(h);
    currentStep.value = moves.value.length; // start at final position
  } catch (e) {
    error.value = `Lỗi tải trận: ${e.message}`;
  } finally { loading.value = false; }
});

// ─── Swipe Touch Gestures (Up/Down/Left/Right) ─────────────────
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;

  const diffX = touchStartX - touchEndX; // positive if swiped left, negative if swiped right
  const diffY = touchStartY - touchEndY; // positive if swiped up, negative if swiped down

  if (Math.abs(diffX) > Math.abs(diffY)) {
    // Horizontal swipe - switch matches
    if (diffX > 70) {
      // Swipe Left -> Go to previous match
      if (props.hasPrev) emit('prev');
    } else if (diffX < -70) {
      // Swipe Right -> Go to next match
      if (props.hasNext) emit('next');
    }
  } else {
    // Vertical swipe
    if (diffY > 60) {
      // Swipe Up -> Show bottom nav bar
      document.body.classList.remove('nav-hidden');
    } else if (diffY < -80) {
      // Swipe Down -> Close sheet
      emit('close');
    }
  }
}

watch(playing, (val) => {
  if (val) {
    document.body.classList.add('nav-hidden');
  } else {
    document.body.classList.remove('nav-hidden');
  }
});

onUnmounted(() => {
  clearTimeout(playTimer);
  document.body.classList.remove('nav-hidden');
});
</script>
