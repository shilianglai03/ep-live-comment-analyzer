<template>
  <section class="panel analysis-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Intent Mix</p>
        <h2>评论意图分布</h2>
      </div>
    </div>
    <div class="intent-bars">
      <div v-for="row in intentRows" :key="row.intent" class="bar-row">
        <span class="bar-label">{{ row.label }}</span>
        <span class="bar-track"><span class="bar-fill" :class="row.className" :style="{ width: `${row.width}%` }"></span></span>
        <span class="bar-value">{{ row.value }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useLiveCommentRuntime } from "../runtime/liveCommentRuntime.js";

const { intentRows } = useLiveCommentRuntime().sharedBindings();
</script>
