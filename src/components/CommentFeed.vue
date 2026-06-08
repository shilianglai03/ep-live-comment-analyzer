<template>
  <section class="panel feed-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Live Feed</p>
        <h2>实时评论流</h2>
      </div>
      <div class="feed-heading-actions">
        <span class="product-pill">{{ currentProduct.name }}</span>
        <div class="segmented-control" aria-label="评论筛选">
          <button
            v-for="option in commentViewOptions"
            :key="option.value"
            type="button"
            :class="{ active: state.commentView === option.value }"
            @click="state.commentView = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>
    <div class="comment-feed" :class="{ compact }" aria-live="polite">
      <div v-if="visibleComments.length === 0" class="empty-state">启动后实时评论会出现在这里</div>
      <article v-for="comment in visibleComments" :key="comment.id" class="comment-item" :class="{ muted: !comment.relevance?.related }">
        <div class="comment-topline">
          <span>{{ comment.user }} · {{ comment.source }}</span>
          <span>{{ formatTime(comment.timestamp) }}</span>
        </div>
        <p class="comment-text">{{ comment.text }}</p>
        <div class="intent-row">
          <span class="intent-pill" :class="metaFor(comment.analysis.intent).className">{{ metaFor(comment.analysis.intent).label }}</span>
          <span class="intent-pill" :class="decisionMetaFor(comment.analysis.decisionType).className">{{ decisionMetaFor(comment.analysis.decisionType).label }}</span>
          <span class="intent-pill" :class="priorityClass(comment.analysis.priority)">优先级 {{ comment.analysis.priority }}</span>
          <span class="intent-pill" :class="confidenceClass(comment.analysis.confidence)">置信 {{ comment.analysis.confidence || 0 }}%</span>
          <span v-if="comment.analysis.needsReply" class="intent-pill timely">{{ comment.analysis.urgencyLabel || "及时回复" }}</span>
          <span class="intent-pill" :class="comment.relevance?.related ? 'related' : 'noise'">
            {{ comment.relevance?.related ? "纳入分析" : "已隔离" }}
          </span>
          <span class="intent-pill product-attribution">归属：{{ productNameForComment(comment) }}</span>
          <span v-for="signal in comment.analysis.matchedSignals?.slice(0, 2) || []" :key="signal" class="intent-pill signal">{{ signal }}</span>
          <span v-for="keyword in comment.analysis.keywords.slice(0, comment.analysis.matchedSignals?.length ? 1 : 3)" :key="keyword" class="intent-pill">{{ keyword }}</span>
        </div>
        <p v-if="!comment.relevance?.related" class="comment-noise-reason">{{ comment.relevance?.reason }}</p>
        <p v-else-if="comment.analysis.reason" class="comment-noise-reason">{{ comment.analysis.reason }}</p>
      </article>
    </div>
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
  commentViewOptions,
  currentProduct,
  relevantComments,
  noiseComments,
  formatTime,
  confidenceClass,
  decisionMetaFor,
  metaFor,
  priorityClass,
  productNameForComment,
} = runtime.sharedBindings();

const visibleComments = computed(() => {
  const filteredComments =
    state.commentView === "related" ? relevantComments.value : state.commentView === "noise" ? noiseComments.value : state.comments;
  return props.compact ? filteredComments.slice(0, 8) : filteredComments;
});
</script>
