<template>
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">EP Live Commerce Monitor</p>
        <h1>{{ pageTitle }}</h1>
      </div>
      <div class="status-strip" aria-live="polite">
        <span class="live-dot" :class="{ active: state.running }"></span>
        <span>{{ state.running ? "直播分析中" : "已暂停" }}</span>
        <span class="divider"></span>
        <span>{{ state.clockText }}</span>
      </div>
    </header>

    <nav class="page-nav" aria-label="页面导航">
      <router-link v-for="item in navItems" :key="item.to" class="nav-link" :to="item.to">
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <section class="control-band" aria-label="直播控制">
      <div class="control-group">
        <button class="primary-button" type="button" @click="toggleStream">
          <span class="button-icon" aria-hidden="true">{{ state.running ? "Ⅱ" : "▶" }}</span>
          <span>{{ state.running ? "暂停" : "开始" }}</span>
        </button>
        <button class="ghost-button" type="button" @click="resetStream">
          <span class="button-icon" aria-hidden="true">↻</span>
          <span>重置</span>
        </button>
      </div>

      <label class="field">
        <span>讲解商品</span>
        <select v-model="state.productKey" @change="handleProductChange">
          <option v-for="item in productOptions" :key="item.key" :value="item.key">
            {{ item.product.name }}
          </option>
        </select>
      </label>

      <label class="field range-field">
        <span>评论速度</span>
        <input :value="state.speed" type="range" min="700" max="3500" step="100" @input="updateSpeed($event.target.value)" />
      </label>

      <label class="ai-toggle">
        <input v-model="state.ai.enabled" type="checkbox" @change="handleAiToggle" />
        <span>
          <strong>AI增强回复</strong>
          <small>{{ aiStatusText }}</small>
        </span>
      </label>

      <label class="field ai-limit-field">
        <span>AI条数上限</span>
        <input :value="state.ai.maxRequestsPerSession" type="number" min="0" max="200" step="1" @input="updateAiLimit($event.target.value)" />
      </label>

      <form class="manual-form" @submit.prevent="submitManualComment">
        <label class="field manual-field">
          <span>手动评论</span>
          <input v-model="state.manualText" type="text" placeholder="例如：这款尺码怎么选？" autocomplete="off" />
        </label>
        <button class="ghost-button" type="submit">
          <span class="button-icon" aria-hidden="true">+</span>
          <span>分析</span>
        </button>
      </form>
    </section>

    <section class="kpi-grid" aria-label="实时指标">
      <article class="metric-panel">
        <span>总评论</span>
        <strong>{{ state.comments.length }}</strong>
      </article>
      <article class="metric-panel good">
        <span>有效评论</span>
        <strong>{{ relevantComments.length }}</strong>
      </article>
      <article class="metric-panel muted-metric">
        <span>已隔离</span>
        <strong>{{ noiseComments.length }}</strong>
      </article>
      <article class="metric-panel good">
        <span>购买意向</span>
        <strong>{{ buySignals }}</strong>
      </article>
      <article class="metric-panel warn">
        <span>待回复</span>
        <strong>{{ state.replies.length }}</strong>
      </article>
      <article class="metric-panel archive">
        <span>已归档</span>
        <strong>{{ archiveCount }}</strong>
      </article>
      <article class="metric-panel danger">
        <span>风险质疑</span>
        <strong>{{ riskCount }}</strong>
      </article>
    </section>

    <router-view />
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useRoute } from "vue-router";

import { useLiveCommentRuntime } from "./runtime/liveCommentRuntime.js";

const runtime = useLiveCommentRuntime();
const route = useRoute();
const {
  state,
  navItems,
  productOptions,
  relevantComments,
  noiseComments,
  buySignals,
  riskCount,
  archiveCount,
  aiStatusText,
  handleProductChange,
  submitManualComment,
} = runtime.sharedBindings();

const pageTitle = computed(() => route.meta.title || "实时总览");

onMounted(() => runtime.mount());
onBeforeUnmount(() => runtime.dispose());

const { handleAiToggle, resetStream, toggleStream, updateAiLimit, updateSpeed } = runtime;
</script>
