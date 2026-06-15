<template>
  <section class="script-grid">
    <section class="panel script-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Live Script</p>
          <h2>下一分钟话术建议</h2>
        </div>
        <span class="health-pill">{{ scriptPlan.focus }}</span>
      </div>
      <div class="script-stage">
        <div>
          <span>当前焦点</span>
          <strong>{{ scriptPlan.focus }}</strong>
        </div>
        <div>
          <span>热词线索</span>
          <strong>{{ scriptPlan.hotWords }}</strong>
        </div>
        <div>
          <span>口播目标</span>
          <strong>短句 + 事实 + 节奏</strong>
        </div>
      </div>
      <div class="script-summary">
        <span>当前热词</span>
        <strong>{{ scriptPlan.hotWords }}</strong>
      </div>
      <div class="script-card primary-script">
        <span>开场方向</span>
        <p>{{ scriptPlan.opening }}</p>
      </div>
      <div class="script-card">
        <span>讲解要点</span>
        <ol class="script-list">
          <li v-for="item in scriptPlan.bullets" :key="item">{{ item }}</li>
        </ol>
      </div>
      <div class="script-card">
        <span>可直接念的短句</span>
        <div class="script-lines">
          <p v-for="line in scriptPlan.quickReplies" :key="line">{{ line }}</p>
        </div>
      </div>
      <div class="script-card closing-script">
        <span>场控提醒</span>
        <p>{{ scriptPlan.closing }}</p>
      </div>
    </section>
    <SignalPanel />
  </section>
</template>

<script setup>
import SignalPanel from "../components/SignalPanel.vue";
import { useLiveCommentRuntime } from "../runtime/liveCommentRuntime.js";

const { scriptPlan } = useLiveCommentRuntime().sharedBindings();
</script>
