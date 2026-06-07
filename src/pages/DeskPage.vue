<template>
  <section class="workspace-grid desk-grid">
    <ReplyDesk />
    <CommentFeed compact />
  </section>
</template>

<script setup>
import CommentFeed from "../components/CommentFeed.vue";
import ReplyDesk from "../components/ReplyDesk.vue";
</script>
