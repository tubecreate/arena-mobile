<template>
  <div class="cb-wrap">
    <!-- Player top (Black ♚) -->
    <div class="cb-side top" :class="{ 'active-turn': turn === 'black' }">
      <span class="cb-side-dot black"></span>
      <span class="cb-side-name">{{ p2Name || 'Đen' }}</span>
      <span class="cb-side-color">♚ Đen</span>
    </div>

    <!-- Board 8×8 -->
    <div class="chess-board">
      <div
        v-for="(cell, idx) in cells"
        :key="idx"
        class="chess-cell"
        :class="[
          cell.light ? 'light' : 'dark',
          cell.isLastFrom ? 'last-from' : '',
          cell.isLastTo   ? 'last-to'   : '',
        ]"
      >
        <span v-if="cell.file === 0" class="chess-rank-label">{{ cell.rank }}</span>
        <span v-if="cell.rank === 1" class="chess-file-label">{{ 'abcdefgh'[cell.file] }}</span>
        <span
          v-if="cell.piece"
          class="piece"
          :class="[cell.pieceColor, cell.isLastTo ? 'just-moved' : '']"
        >{{ GLYPHS[cell.piece.toUpperCase()] }}</span>
      </div>
    </div>

    <!-- Player bottom (White ♔) -->
    <div class="cb-side bottom" :class="{ 'active-turn': turn === 'white' }">
      <span class="cb-side-dot white"></span>
      <span class="cb-side-name">{{ p1Name || 'Trắng' }}</span>
      <span class="cb-side-color">♔ Trắng</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  fen:     String,   // FEN board string e.g. "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR"
  lastMove: String,  // "e2e4" format
  turn:    String,   // "white" | "black"
  p1Name:  String,
  p2Name:  String,
});

// Same glyphs as arena.html — lowercase = black piece (upper = white)
const GLYPHS = { P:'♟', N:'♞', B:'♝', R:'♜', Q:'♛', K:'♚' };

function parseFen(fen) {
  if (!fen) return [];
  const rows = fen.split('/');
  const grid = []; // 64 cells, rank 8 at index 0
  for (const row of rows) {
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < +ch; i++) grid.push(null);
      } else {
        grid.push(ch); // uppercase=white, lowercase=black
      }
    }
  }
  return grid;
}

function squareIndex(sq) {
  // sq = "e4" → row from top = 8-4=4, file = e=4 → idx = 4*8+4 = 36
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]);
  return (8 - rank) * 8 + file;
}

const cells = computed(() => {
  const grid = parseFen(props.fen);
  const fromIdx = props.lastMove ? squareIndex(props.lastMove.slice(0,2)) : -1;
  const toIdx   = props.lastMove ? squareIndex(props.lastMove.slice(2,4)) : -1;

  return grid.map((piece, i) => {
    const r = Math.floor(i / 8); // 0 = rank 8 (top)
    const f = i % 8;
    const light = (r + f) % 2 === 0;
    const rank = 8 - r;
    const isUpper = piece && piece === piece.toUpperCase();
    return {
      piece,
      pieceColor: piece ? (isUpper ? 'white' : 'black') : '',
      light,
      rank,
      file: f,
      isLastFrom: i === fromIdx,
      isLastTo:   i === toIdx,
    };
  });
});
</script>
