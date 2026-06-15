<template>
  <section class="import-grid">
    <section class="panel import-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Batch Import</p>
          <h2>批量导入评论</h2>
        </div>
        <span class="health-pill">{{ currentProduct.name }}</span>
      </div>
      <div class="import-help">
        <p>支持一行一条评论、CSV / TSV 或 JSON Lines。结构化数据可包含 <strong>user</strong>、<strong>product</strong>、<strong>comment</strong> / <strong>content</strong> 等列。</p>
      </div>
      <div class="import-flow" aria-label="导入处理流程">
        <div>
          <span>01</span>
          <strong>粘贴样本</strong>
          <small>评论、CSV 或 JSON Lines</small>
        </div>
        <div>
          <span>02</span>
          <strong>识别字段</strong>
          <small>用户、商品、评论内容</small>
        </div>
        <div>
          <span>03</span>
          <strong>进入分析</strong>
          <small>生成意图和回复队列</small>
        </div>
      </div>
      <label class="field">
        <span>导入来源</span>
        <input v-model="state.importSource" type="text" placeholder="例如：CSV 导入 / 历史直播 / 运营粘贴" />
      </label>
      <label class="field import-text-field">
        <span>评论内容</span>
        <textarea v-model="state.importText" class="import-textarea" placeholder="一行一条评论，或粘贴 CSV / TSV / JSON Lines"></textarea>
      </label>
      <div class="import-actions">
        <button class="ghost-button" type="button" @click="loadImportExample">载入示例</button>
        <button class="primary-button" type="button" @click="importBatchComments">导入评论</button>
      </div>
      <p v-if="state.importSummary" class="import-summary">{{ state.importSummary }}</p>
    </section>
    <CommentFeed compact />
  </section>
</template>

<script setup>
import CommentFeed from "../components/CommentFeed.vue";
import { useLiveCommentRuntime } from "../runtime/liveCommentRuntime.js";

const { state, currentProduct, loadImportExample, importBatchComments } = useLiveCommentRuntime().sharedBindings();
</script>
