<template>
  <section class="panel insight-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Signals</p>
        <h2>热词与风险</h2>
      </div>
    </div>
    <div class="split-stack">
      <div class="signal-meter" :class="responseLoad.level">
        <span>回复压力</span>
        <strong>{{ responseLoad.text }}</strong>
      </div>
      <div>
        <h3>高频热词</h3>
        <div class="tag-cloud">
          <div v-if="hotWords.length === 0" class="empty-state compact">暂无热词</div>
          <span v-for="item in hotWords" :key="item.word" class="word-tag">{{ item.word }} · {{ item.count }}</span>
        </div>
      </div>
      <div>
        <h3>待回复决策</h3>
        <div class="decision-list">
          <div class="response-load" :class="responseLoad.level">{{ responseLoad.text }}</div>
          <div v-if="decisionRows.length === 0" class="empty-state compact">暂无决策压力</div>
          <div v-for="row in decisionRows" :key="row.decisionType" class="decision-row">
            <span class="intent-pill" :class="row.className">{{ row.label }}</span>
            <strong>{{ row.count }} 条</strong>
            <span>{{ row.actionLabel }} · 高优先级 {{ row.urgent }} · 置信 {{ row.avgConfidence }}%</span>
          </div>
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

const { state, hotWords, decisionRows, responseLoad } = useLiveCommentRuntime().sharedBindings();
</script>
