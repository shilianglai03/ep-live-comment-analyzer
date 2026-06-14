<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="topbar-copy">
        <p class="eyebrow">EP Live Commerce Monitor</p>
        <h1>{{ pageTitle }}</h1>
        <div class="hero-signal-row" aria-label="本场关键状态">
          <span>讲解：{{ currentProduct.name }}</span>
          <span>购买意向 {{ buySignals }}</span>
          <span>待回复 {{ state.replies.length }}</span>
          <span>风险 {{ riskCount }}</span>
        </div>
      </div>
      <div class="live-visual-board" aria-label="实时分析状态">
        <div class="status-strip" aria-live="polite">
          <span class="live-dot" :class="{ active: state.running }"></span>
          <span>{{ state.running ? "直播分析中" : "已暂停" }}</span>
          <span class="divider"></span>
          <span>{{ state.clockText }}</span>
        </div>
        <div class="signal-stage" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="live-visual-stats">
          <span><strong>{{ relevantComments.length }}</strong>有效</span>
          <span><strong>{{ noiseComments.length }}</strong>隔离</span>
          <span><strong>{{ archiveCount }}</strong>归档</span>
        </div>
      </div>
    </header>

    <nav class="page-nav" aria-label="页面导航">
      <router-link v-for="item in navItems" :key="item.to" class="nav-link" :to="item.to">
        <span class="nav-icon" aria-hidden="true">{{ navIconFor(item.to) }}</span>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <section class="page-context-bar" aria-label="当前页面上下文">
      <div class="page-context-copy">
        <p class="eyebrow">Workspace Step</p>
        <h2>{{ currentNavItem.label }}</h2>
        <span>{{ currentPageMeta.description }}</span>
      </div>
      <div class="page-flow" aria-label="页面流程">
        <span
          v-for="(item, index) in navItems"
          :key="item.to"
          :class="{ active: item.to === currentNavItem.to, done: index < currentNavIndex }"
          :title="item.label"
        >
          {{ index + 1 }}
        </span>
      </div>
      <div class="page-jump-actions">
        <router-link class="page-jump" :to="previousNavItem.to">上一页 · {{ previousNavItem.short }}</router-link>
        <router-link class="page-jump strong" :to="nextNavItem.to">下一页 · {{ nextNavItem.short }}</router-link>
      </div>
    </section>

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
      <article class="metric-panel total">
        <span class="metric-icon" aria-hidden="true">Σ</span>
        <span>总评论</span>
        <strong>{{ state.comments.length }}</strong>
      </article>
      <article class="metric-panel good">
        <span class="metric-icon" aria-hidden="true">✓</span>
        <span>有效评论</span>
        <strong>{{ relevantComments.length }}</strong>
      </article>
      <article class="metric-panel muted-metric">
        <span class="metric-icon" aria-hidden="true">◇</span>
        <span>已隔离</span>
        <strong>{{ noiseComments.length }}</strong>
      </article>
      <article class="metric-panel good">
        <span class="metric-icon" aria-hidden="true">¥</span>
        <span>购买意向</span>
        <strong>{{ buySignals }}</strong>
      </article>
      <article class="metric-panel warn">
        <span class="metric-icon" aria-hidden="true">!</span>
        <span>待回复</span>
        <strong>{{ state.replies.length }}</strong>
      </article>
      <article class="metric-panel archive">
        <span class="metric-icon" aria-hidden="true">□</span>
        <span>已归档</span>
        <strong>{{ archiveCount }}</strong>
      </article>
      <article class="metric-panel danger">
        <span class="metric-icon" aria-hidden="true">△</span>
        <span>风险质疑</span>
        <strong>{{ riskCount }}</strong>
      </article>
    </section>

    <router-view v-slot="{ Component, route }">
      <Transition name="page-surface" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </router-view>
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
  currentProduct,
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
const pageMeta = {
  "/overview": { description: "监控实时评论、优先级、热词和回复压力，适合作为直播中的主控屏。" },
  "/import": { description: "导入历史评论或运营样本，把离线评论快速转换成可分析的直播信号。" },
  "/desk": { description: "集中处理高价值评论，查看回复建议、场控动作和归档状态。" },
  "/analysis": { description: "观察意图分布、风险提醒和商品事实，判断讲解节奏是否需要调整。" },
  "/script": { description: "根据当前评论信号生成下一段讲解重点和可口播短句。" },
  "/report": { description: "沉淀本场直播复盘，导出 Markdown 方便同步给团队。" },
  "/archive": { description: "检索已处理评论，复查回答效果和成交线索。" },
  "/settings": { description: "维护商品资料、价格优惠、履约售后和相关关键词。" },
};
const currentNavIndex = computed(() => {
  const index = navItems.findIndex((item) => item.to === route.path);
  return index >= 0 ? index : 0;
});
const currentNavItem = computed(() => navItems[currentNavIndex.value] || navItems[0]);
const previousNavItem = computed(() => navItems[(currentNavIndex.value - 1 + navItems.length) % navItems.length] || navItems[0]);
const nextNavItem = computed(() => navItems[(currentNavIndex.value + 1) % navItems.length] || navItems[0]);
const currentPageMeta = computed(() => pageMeta[currentNavItem.value.to] || pageMeta["/overview"]);
const navIconFor = (path) =>
  ({
    "/overview": "▦",
    "/import": "⇄",
    "/desk": "✦",
    "/analysis": "◈",
    "/script": "§",
    "/report": "◎",
    "/archive": "□",
    "/settings": "⚙",
  })[path] || "•";

onMounted(() => runtime.mount());
onBeforeUnmount(() => runtime.dispose());

const { handleAiToggle, resetStream, toggleStream, updateAiLimit, updateSpeed } = runtime;
</script>
