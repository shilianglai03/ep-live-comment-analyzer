<template>
  <section class="workspace-grid analysis-grid">
    <IntentPanel />
    <SignalPanel />
    <ProductPanel />
  </section>
</template>

<script setup>
import IntentPanel from "../components/IntentPanel.vue";
import ProductPanel from "../components/ProductPanel.vue";
import SignalPanel from "../components/SignalPanel.vue";
</script>
