<template>
  <section class="panel reply-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Response Desk</p>
        <h2>智能回复参考</h2>
      </div>
      <div class="reply-heading-actions">
        <span class="health-pill">{{ replyHealth }}</span>
        <span v-if="!compact" class="selection-pill">{{ selectedCount }} 已选</span>
        <button v-if="!compact" class="archive-button" type="button" :disabled="selectedCount === 0" @click="archiveSelectedReplies">归档已勾选</button>
      </div>
    </div>
    <div class="reply-list" :class="{ compact }">
      <div v-if="visibleReplies.length === 0" class="empty-state">高价值评论会自动进入回复队列</div>
      <article v-for="reply in visibleReplies" :key="reply.id" class="reply-item" :class="{ selected: isReplySelected(reply.id) }">
        <div class="reply-topline">
          <span>{{ reply.user }}</span>
          <span class="intent-row">
            <span class="source-pill" :class="getReplySourceClass(reply)">{{ getReplySourceLabel(reply) }}</span>
            <span class="intent-pill" :class="metaFor(reply.intent).className">{{ metaFor(reply.intent).label }}</span>
            <span class="intent-pill" :class="decisionMetaFor(reply.decisionType).className">{{ decisionMetaFor(reply.decisionType).label }}</span>
            <span class="intent-pill" :class="priorityClass(reply.priority)">优先级 {{ reply.priority }}</span>
            <span class="intent-pill" :class="confidenceClass(reply.confidence)">置信 {{ reply.confidence || 0 }}%</span>
            <span class="intent-pill timely">{{ reply.urgencyLabel || "及时回复" }}</span>
          </span>
        </div>
        <div v-if="!compact" class="reply-action-row">
          <label class="reply-check">
            <input type="checkbox" :checked="isReplySelected(reply.id)" @change="toggleReplySelection(reply.id, $event.target.checked)" />
            <span>已回答</span>
          </label>
          <button class="mini-archive-button" type="button" @click="archiveReply(reply.id)">归档</button>
        </div>
        <div class="qa-block">
          <span class="qa-label">问题</span>
          <p class="reply-question">{{ reply.question }}</p>
        </div>
        <div v-if="reply.matchedSignals?.length && !compact" class="intent-row">
          <span v-for="signal in reply.matchedSignals.slice(0, 4)" :key="signal" class="intent-pill signal">{{ signal }}</span>
        </div>
        <div class="qa-block">
          <span class="qa-label">当前回答</span>
          <div class="reply-copy" :class="{ ai: reply.source === 'ai', loading: reply.aiStatus === 'loading' }">{{ reply.replySuggestion }}</div>
        </div>
        <details v-if="reply.revisionHistory.length > 0 && !compact" class="revision-history">
          <summary>查看修改记录（{{ reply.revisionHistory.length }}）</summary>
          <ol>
            <li v-for="item in reply.revisionHistory" :key="item.round">
              <span>第 {{ item.round }} 版 · {{ item.instruction }}</span>
              <p>{{ item.text }}</p>
            </li>
          </ol>
        </details>
        <div v-if="!compact" class="revision-box">
          <label class="revision-label" :for="'revision-' + reply.id">本轮修改要求</label>
          <textarea
            :id="'revision-' + reply.id"
            v-model="reply.revisionDraft"
            class="revision-input"
            placeholder="例如：更短一点、语气更亲切、强调今晚发货、弱化促单感"
            :disabled="reply.revisionStatus === 'loading'"
          ></textarea>
          <button class="revision-button" type="button" :disabled="reply.revisionStatus === 'loading'" @click="requestReplyRevision(reply)">
            {{ revisionButtonText(reply) }}
          </button>
          <p v-if="reply.revisionStatus === 'failed' && reply.revisionError" class="revision-error">{{ reply.revisionError }}</p>
        </div>
        <p class="reply-reason">{{ reply.aiStatus === "failed" && reply.aiError ? `${reply.reason}；AI暂不可用，已保留模板回复` : reply.reason }}</p>
      </article>
    </div>
    <router-link v-if="compact && state.replies.length > 0" class="panel-link" to="/desk">打开回复工作台</router-link>
  </section>
</template>

<script setup>
import { computed } from "vue";

import { useLiveCommentRuntime } from "../runtime/liveCommentRuntime.js";

const props = defineProps({
  compact: Boolean,
});

const runtime = useLiveCommentRuntime();
const {
  state,
  replyHealth,
  selectedCount,
  archiveSelectedReplies,
  confidenceClass,
  decisionMetaFor,
  isReplySelected,
  toggleReplySelection,
  archiveReply,
  getReplySourceClass,
  getReplySourceLabel,
  metaFor,
  priorityClass,
  requestReplyRevision,
  revisionButtonText,
} = runtime.sharedBindings();

const visibleReplies = computed(() => (props.compact ? state.replies.slice(0, 4) : state.replies));
</script>
