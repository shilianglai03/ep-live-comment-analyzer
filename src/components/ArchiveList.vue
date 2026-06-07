<template>
  <section class="panel archive-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Answered Archive</p>
        <h2>已回答归档</h2>
      </div>
      <span class="health-pill">{{ filteredArchivedReplies.length }} / {{ archiveCount }} 条</span>
    </div>
    <div class="archive-toolbar">
      <label class="field archive-search-field">
        <span>搜索归档</span>
        <input v-model="state.archiveSearch" type="search" placeholder="按问题、回答、用户或意图搜索" />
      </label>
      <label class="field archive-filter-field">
        <span>意图筛选</span>
        <select v-model="state.archiveIntent">
          <option v-for="option in archiveIntentOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <button class="ghost-button export-button" type="button" :disabled="filteredArchivedReplies.length === 0" @click="exportArchivedCsv">导出 CSV</button>
    </div>
    <div class="archive-list">
      <div v-if="archiveCount === 0" class="empty-state">暂无已回答记录</div>
      <div v-else-if="filteredArchivedReplies.length === 0" class="empty-state">没有匹配的归档记录</div>
      <article v-for="reply in filteredArchivedReplies" :key="reply.id" class="archive-item">
        <div class="archive-topline">
          <span>{{ reply.user }} · {{ formatTime(reply.archivedAt || reply.timestamp) }}</span>
          <span class="intent-row">
            <span class="source-pill" :class="getReplySourceClass(reply)">{{ getReplySourceLabel(reply) }}</span>
            <span class="intent-pill" :class="metaFor(reply.intent).className">{{ metaFor(reply.intent).label }}</span>
            <span v-if="reply.revisionHistory.length" class="archive-meta-pill">修改 {{ reply.revisionHistory.length }} 次</span>
          </span>
        </div>
        <p class="archive-question">问：{{ reply.question }}</p>
        <p class="archive-answer">答：{{ reply.replySuggestion }}</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { useLiveCommentRuntime } from "../runtime/liveCommentRuntime.js";

const {
  state,
  archiveCount,
  archiveIntentOptions,
  filteredArchivedReplies,
  exportArchivedCsv,
  formatTime,
  getReplySourceClass,
  getReplySourceLabel,
  metaFor,
} = useLiveCommentRuntime().sharedBindings();
</script>
