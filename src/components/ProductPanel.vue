<template>
  <section class="panel product-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Product Facts</p>
        <h2>当前讲解商品</h2>
      </div>
      <span class="product-pill">{{ currentProduct.name }}</span>
    </div>
    <div class="fact-grid">
      <div class="fact-item"><span>价格</span><strong>{{ currentProduct.price }}</strong></div>
      <div class="fact-item"><span>优惠</span><strong>{{ currentProduct.coupon }}</strong></div>
      <div class="fact-item"><span>规格</span><strong>{{ currentProduct.specs }}</strong></div>
      <div class="fact-item"><span>库存</span><strong>{{ currentProduct.stock }}</strong></div>
      <div class="fact-item"><span>发货</span><strong>{{ currentProduct.shipping }}</strong></div>
      <div class="fact-item"><span>售后</span><strong>{{ currentProduct.service }}</strong></div>
    </div>
    <form v-if="editable" class="product-editor" @submit.prevent="saveProductDraft">
      <div class="product-editor-grid">
        <label v-for="field in productEditorFields" :key="field.key" class="field" :class="{ wide: field.multiline }">
          <span>{{ field.label }}</span>
          <textarea
            v-if="field.multiline"
            v-model="state.productEditor.draft[field.key]"
            rows="2"
          ></textarea>
          <input v-else v-model="state.productEditor.draft[field.key]" type="text" />
        </label>
      </div>
      <div class="product-editor-actions">
        <button class="primary-button" type="submit">保存商品资料</button>
        <button class="ghost-button" type="button" @click="resetProductDraft">恢复默认</button>
        <span class="settings-hint">{{ state.productEditor.statusText }}</span>
      </div>
    </form>
  </section>
</template>

<script setup>
import { useLiveCommentRuntime } from "../runtime/liveCommentRuntime.js";

defineProps({
  editable: Boolean,
});

const {
  state,
  currentProduct,
  productEditorFields,
  resetProductDraft,
  saveProductDraft,
} = useLiveCommentRuntime().sharedBindings();
</script>
