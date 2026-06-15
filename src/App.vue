<template>
  <main class="app-shell" :class="pageShellClass" :style="pageAccentStyle">
    <header class="topbar">
      <div class="topbar-copy">
        <p class="eyebrow">EP Live Commerce Monitor</p>
        <h1>{{ pageTitle }}</h1>
        <p class="topbar-subtitle">{{ currentPageMeta.hero }}</p>
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
        <div class="live-visual-caption">
          <Activity aria-hidden="true" />
          <span>{{ currentPageMeta.signal }}</span>
        </div>
      </div>
    </header>

    <nav class="page-nav" aria-label="页面导航">
      <router-link v-for="item in navItems" :key="item.to" class="nav-link" :to="item.to">
        <component :is="navIconFor(item.to)" class="nav-icon" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <section class="page-context-bar" aria-label="当前页面上下文">
      <div class="page-context-identity">
        <span class="page-context-icon" aria-hidden="true">
          <component :is="navIconFor(currentNavItem.to)" />
        </span>
        <div class="page-context-copy">
          <p class="eyebrow">Workspace Step</p>
          <h2>{{ currentNavItem.label }}</h2>
          <span>{{ currentPageMeta.description }}</span>
        </div>
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
          <Pause v-if="state.running" class="button-icon" aria-hidden="true" />
          <Play v-else class="button-icon" aria-hidden="true" />
          <span>{{ state.running ? "暂停" : "开始" }}</span>
        </button>
        <button class="ghost-button" type="button" @click="resetStream">
          <RotateCcw class="button-icon" aria-hidden="true" />
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
          <Plus class="button-icon" aria-hidden="true" />
          <span>分析</span>
        </button>
      </form>
    </section>

    <section class="kpi-grid" aria-label="实时指标">
      <article v-for="metric in metrics" :key="metric.label" class="metric-panel" :class="metric.className">
        <component :is="metric.icon" class="metric-icon" aria-hidden="true" />
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
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
import {
  Activity,
  Archive,
  ArrowLeftRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FilterX,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ScrollText,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
} from "lucide-vue-next";

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

const pageMeta = {
  "/overview": {
    description: "监控实时评论、优先级、热词和回复压力，适合作为直播中的主控屏。",
    hero: "把直播间评论流压缩成场控可以立刻行动的信号。",
    signal: "主控屏 · 实时队列",
    accent: "#14b8a6",
    accentSoft: "rgba(20, 184, 166, 0.16)",
    shellClass: "page-overview",
  },
  "/import": {
    description: "导入历史评论或运营样本，把离线评论快速转换成可分析的直播信号。",
    hero: "把历史样本和运营粘贴内容变成可复盘、可模拟的评论池。",
    signal: "数据接入 · 样本清洗",
    accent: "#0ea5e9",
    accentSoft: "rgba(14, 165, 233, 0.14)",
    shellClass: "page-import",
  },
  "/desk": {
    description: "集中处理高价值评论，查看回复建议、场控动作和归档状态。",
    hero: "优先挑出最该回复的问题，给主播一条能直接说出口的参考。",
    signal: "回复队列 · 决策优先",
    accent: "#f59e0b",
    accentSoft: "rgba(245, 158, 11, 0.16)",
    shellClass: "page-desk",
  },
  "/analysis": {
    description: "观察意图分布、风险提醒和商品事实，判断讲解节奏是否需要调整。",
    hero: "用意图、热词和风险压力判断下一段讲解该往哪里走。",
    signal: "分析看板 · 风险雷达",
    accent: "#6366f1",
    accentSoft: "rgba(99, 102, 241, 0.15)",
    shellClass: "page-analysis",
  },
  "/script": {
    description: "根据当前评论信号生成下一段讲解重点和可口播短句。",
    hero: "把分散问题整理成下一分钟口播节奏和场控提醒。",
    signal: "话术生成 · 口播卡片",
    accent: "#a855f7",
    accentSoft: "rgba(168, 85, 247, 0.14)",
    shellClass: "page-script",
  },
  "/report": {
    description: "沉淀本场直播复盘，导出 Markdown 方便同步给团队。",
    hero: "把评论结构、回复结果和运营建议沉淀成可分享的复盘报告。",
    signal: "复盘报告 · 经营结论",
    accent: "#2563eb",
    accentSoft: "rgba(37, 99, 235, 0.14)",
    shellClass: "page-report",
  },
  "/archive": {
    description: "检索已处理评论，复查回答效果和成交线索。",
    hero: "回看已经处理的评论和回复结果，沉淀可复用话术资产。",
    signal: "归档记录 · 话术资产",
    accent: "#64748b",
    accentSoft: "rgba(100, 116, 139, 0.14)",
    shellClass: "page-archive",
  },
  "/settings": {
    description: "维护商品资料、价格优惠、履约售后和相关关键词。",
    hero: "把商品事实、优惠和售后边界维护清楚，让回复更稳。",
    signal: "运行设置 · 商品事实",
    accent: "#0f766e",
    accentSoft: "rgba(15, 118, 110, 0.15)",
    shellClass: "page-settings",
  },
};

const currentNavIndex = computed(() => {
  const index = navItems.findIndex((item) => item.to === route.path);
  return index >= 0 ? index : 0;
});
const currentNavItem = computed(() => navItems[currentNavIndex.value] || navItems[0]);
const previousNavItem = computed(() => navItems[(currentNavIndex.value - 1 + navItems.length) % navItems.length] || navItems[0]);
const nextNavItem = computed(() => navItems[(currentNavIndex.value + 1) % navItems.length] || navItems[0]);
const currentPageMeta = computed(() => pageMeta[currentNavItem.value.to] || pageMeta["/overview"]);
const pageTitle = computed(() => route.meta.title || "实时总览");
const pageShellClass = computed(() => currentPageMeta.value.shellClass);
const pageAccentStyle = computed(() => ({
  "--page-accent": currentPageMeta.value.accent,
  "--page-accent-soft": currentPageMeta.value.accentSoft,
}));

const navIcons = {
  "/overview": LayoutDashboard,
  "/import": ArrowLeftRight,
  "/desk": Sparkles,
  "/analysis": BarChart3,
  "/script": ScrollText,
  "/report": ClipboardCheck,
  "/archive": Archive,
  "/settings": Settings,
};
const navIconFor = (path) => navIcons[path] || LayoutDashboard;

const metrics = computed(() => [
  { label: "总评论", value: state.comments.length, className: "total", icon: MessageSquare },
  { label: "有效评论", value: relevantComments.value.length, className: "good", icon: CheckCircle2 },
  { label: "已隔离", value: noiseComments.value.length, className: "muted-metric", icon: FilterX },
  { label: "购买意向", value: buySignals.value, className: "good", icon: ShoppingBag },
  { label: "待回复", value: state.replies.length, className: "warn", icon: Inbox },
  { label: "已归档", value: archiveCount.value, className: "archive", icon: Archive },
  { label: "风险质疑", value: riskCount.value, className: "danger", icon: ShieldAlert },
]);

onMounted(() => runtime.mount());
onBeforeUnmount(() => runtime.dispose());

const { handleAiToggle, resetStream, toggleStream, updateAiLimit, updateSpeed } = runtime;
</script>
