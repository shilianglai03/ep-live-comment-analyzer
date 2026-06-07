<template>
  <section class="report-grid">
    <section class="panel report-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Review Report</p>
          <h2>直播复盘报告</h2>
        </div>
        <button class="ghost-button export-button" type="button" @click="exportReviewMarkdown">导出 Markdown</button>
      </div>
      <div class="report-summary-grid">
        <div><span>当前商品</span><strong>{{ reviewReport.productName }}</strong></div>
        <div><span>有效 / 总评论</span><strong>{{ reviewReport.effectiveComments }} / {{ reviewReport.totalComments }}</strong></div>
        <div><span>已隔离</span><strong>{{ reviewReport.noiseComments }}（{{ reviewReport.noiseRatio }}%）</strong></div>
        <div><span>待回复 / 已归档</span><strong>{{ reviewReport.replyCount }} / {{ reviewReport.archiveCount }}</strong></div>
      </div>
      <div class="report-section">
        <h3>意图分布</h3>
        <div class="report-table">
          <div class="report-row header"><span>意图</span><span>数量</span></div>
          <div v-if="reviewReport.topIntentRows.length === 0" class="report-empty">暂无有效意图</div>
          <div v-for="row in reviewReport.topIntentRows" :key="row.intent" class="report-row">
            <span>{{ row.label }}</span><strong>{{ row.value }}</strong>
          </div>
        </div>
      </div>
      <div class="report-section">
        <h3>商品归属</h3>
        <div class="report-table">
          <div class="report-row header"><span>商品</span><span>归属</span><span>当前有效</span><span>待回复</span></div>
          <div v-for="row in reviewReport.productRows" :key="row.key" class="report-row four">
            <span>{{ row.name }}</span><strong>{{ row.total }}</strong><strong>{{ row.currentEffective }}</strong><strong>{{ row.replies }}</strong>
          </div>
        </div>
      </div>
    </section>
    <section class="panel report-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Actions</p>
          <h2>复盘建议</h2>
        </div>
      </div>
      <div class="report-section">
        <h3>高频热词</h3>
        <div class="tag-cloud">
          <div v-if="reviewReport.topHotWords.length === 0" class="empty-state compact">暂无热词</div>
          <span v-for="item in reviewReport.topHotWords" :key="item.word" class="word-tag">{{ item.word }} · {{ item.count }}</span>
        </div>
      </div>
      <div class="report-section">
        <h3>运营建议</h3>
        <div class="report-suggestions">
          <p v-for="item in reviewReport.suggestions" :key="item">{{ item }}</p>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup>
import { useLiveCommentRuntime } from "../runtime/liveCommentRuntime.js";

const { reviewReport, exportReviewMarkdown } = useLiveCommentRuntime().sharedBindings();
</script>
