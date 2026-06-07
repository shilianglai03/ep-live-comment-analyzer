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
  </section>
</template>

<script setup>
import { useLiveCommentRuntime } from "../runtime/liveCommentRuntime.js";

const { currentProduct } = useLiveCommentRuntime().sharedBindings();
</script>
