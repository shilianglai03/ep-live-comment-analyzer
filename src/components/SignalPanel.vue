<template>
  <section class="panel insight-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Signals</p>
        <h2>热词与风险</h2>
      </div>
    </div>
    <div class="split-stack">
      <div>
        <h3>高频热词</h3>
        <div class="tag-cloud">
          <div v-if="hotWords.length === 0" class="empty-state compact">暂无热词</div>
          <span v-for="item in hotWords" :key="item.word" class="word-tag">{{ item.word }} · {{ item.count }}</span>
        </div>
      </div>
      <div>
        <h3>场控提醒</h3>
        <div class="alert-list">
          <div v-if="state.alerts.length === 0" class="empty-state compact">暂无风险提醒</div>
          <div v-for="alert in state.alerts" :key="alert.text" class="alert-item" :class="alert.type">{{ alert.text }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useLiveCommentRuntime } from "../runtime/liveCommentRuntime.js";

const { state, hotWords } = useLiveCommentRuntime().sharedBindings();
</script>
