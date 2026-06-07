<template>
  <section class="settings-grid">
    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Vue Workspace</p>
          <h2>多页面运行状态</h2>
        </div>
        <span class="health-pill">Vue SFC + Vite</span>
      </div>
      <div class="settings-list">
        <div><span>前端框架</span><strong>Vue 3 SFC + Vue Router + Vite</strong></div>
        <div><span>AI 状态</span><strong>{{ aiStatusText }}</strong></div>
        <div><span>AI 请求额度</span><strong>{{ aiUsageText }}</strong></div>
        <div><span>当前商品</span><strong>{{ currentProduct.name }}</strong></div>
        <div><span>待回复</span><strong>{{ state.replies.length }} 条</strong></div>
        <div><span>已归档</span><strong>{{ archiveCount }} 条</strong></div>
      </div>
    </section>
    <ProductPanel />
  </section>
</template>

<script setup>
import ProductPanel from "../components/ProductPanel.vue";
import { useLiveCommentRuntime } from "../runtime/liveCommentRuntime.js";

const { state, aiStatusText, aiUsageText, currentProduct, archiveCount } = useLiveCommentRuntime().sharedBindings();
</script>
