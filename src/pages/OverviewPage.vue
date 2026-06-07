<template>
  <section class="workspace-grid overview-grid">
    <CommentFeed compact />
    <ReplyDesk compact />
    <IntentPanel />
    <SignalPanel />
  </section>
</template>

<script setup>
import CommentFeed from "../components/CommentFeed.vue";
import IntentPanel from "../components/IntentPanel.vue";
import ReplyDesk from "../components/ReplyDesk.vue";
import SignalPanel from "../components/SignalPanel.vue";
</script>
