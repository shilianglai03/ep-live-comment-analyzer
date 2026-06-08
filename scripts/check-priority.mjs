import { evaluateProductRelevance } from "../src/runtime/filterStrategy.js";
import { scoreReplyPriority } from "../src/runtime/commentPriority.js";

const PRODUCTS = {
  suncoat: { name: "轻薄防晒衣" },
  sneaker: { name: "百搭小白鞋" },
  cup: { name: "316 保温杯" },
};

const scenarios = [
  {
    name: "短价格问句进入高优先级",
    text: "这个多少钱，领券后到手价是多少？",
    productKey: "cup",
    intent: "price",
    hitWords: ["多少钱", "券", "到手价"],
    expect: ({ relevance, priority }) =>
      isReplyDecision(relevance, priority, "price") &&
      priority.priority >= 8 &&
      priority.confidence >= 80 &&
      hasSignal(priority, "价格决策"),
  },
  {
    name: "口语价格问句进入高优先级",
    text: "这个啥价，券后几米？",
    productKey: "cup",
    intent: "price",
    hitWords: ["啥价", "券后", "几米"],
    expect: ({ relevance, priority }) =>
      isReplyDecision(relevance, priority, "price") &&
      priority.priority >= 8 &&
      hasSignal(priority, "价格决策"),
  },
  {
    name: "能少点不属于价格决策",
    text: "现在拍能少点不",
    productKey: "suncoat",
    intent: "price",
    hitWords: ["现在拍", "少点"],
    expect: ({ relevance, priority }) =>
      isReplyDecision(relevance, priority, "price") &&
      priority.priority >= 8 &&
      priority.needsReply,
  },
  {
    name: "当前商品价格问句强相关",
    text: "轻薄防晒衣 到手价多少？",
    productKey: "suncoat",
    intent: "price",
    hitWords: ["到手价"],
    expect: ({ relevance, priority }) =>
      relevance.related &&
      relevance.score >= 85 &&
      isReplyDecision(relevance, priority, "price") &&
      priority.priority >= 8,
  },
  {
    name: "价格感叹不进入及时回复",
    text: "316 保温杯好便宜",
    productKey: "cup",
    intent: "price",
    hitWords: ["便宜"],
    expect: ({ relevance, priority }) =>
      relevance.related &&
      !priority.needsReply &&
      priority.priority <= 5 &&
      priority.decisionType === "price" &&
      priority.reasonTags.includes("仅价格感叹"),
  },
  {
    name: "价格不错不进入回复队列",
    text: "这个价格不错",
    productKey: "cup",
    intent: "price",
    hitWords: ["价格"],
    expect: ({ relevance, priority }) =>
      relevance.related &&
      !priority.needsReply &&
      priority.priority <= 5,
  },
  {
    name: "拍错码换货问题及时回复",
    text: "拍错码了可以换吗？",
    productKey: "suncoat",
    intent: "service",
    hitWords: ["拍错", "可以换"],
    expect: ({ relevance, priority }) =>
      isReplyDecision(relevance, priority, "afterSale") &&
      priority.priority >= 8 &&
      hasSignal(priority, "售后决策"),
  },
  {
    name: "不合适咋弄属于售后决策",
    text: "不合适咋弄，能退不",
    productKey: "sneaker",
    intent: "service",
    hitWords: ["不合适", "能退"],
    expect: ({ relevance, priority }) =>
      isReplyDecision(relevance, priority, "afterSale") &&
      priority.priority >= 8 &&
      priority.confidence >= 80,
  },
  {
    name: "身高体重问题属于尺码决策",
    text: "身高168体重115穿哪个码？",
    productKey: "suncoat",
    intent: "size",
    hitWords: ["身高", "体重", "哪个"],
    expect: ({ relevance, priority }) =>
      isReplyDecision(relevance, priority, "fit") &&
      priority.priority >= 8 &&
      hasSignal(priority, "尺码决策"),
  },
  {
    name: "包邮和偏远地区属于履约决策",
    text: "能包邮吗，偏远地区怎么算？",
    productKey: "cup",
    intent: "logistics",
    hitWords: ["包邮吗", "偏远"],
    expect: ({ relevance, priority }) =>
      isReplyDecision(relevance, priority, "fulfillment") &&
      priority.priority >= 8 &&
      hasSignal(priority, "履约决策"),
  },
  {
    name: "今天能发吗属于履约决策",
    text: "今天能发吗，几天到？",
    productKey: "cup",
    intent: "logistics",
    hitWords: ["今天能发", "几天到"],
    expect: ({ relevance, priority }) =>
      isReplyDecision(relevance, priority, "fulfillment") &&
      priority.priority >= 8,
  },
  {
    name: "链接位置属于购买决策",
    text: "小黄车哪一个，第几个链接？",
    productKey: "suncoat",
    intent: "buy",
    hitWords: ["小黄车", "链接"],
    expect: ({ relevance, priority }) =>
      isReplyDecision(relevance, priority, "purchase") &&
      priority.priority >= 8 &&
      hasSignal(priority, "购买动作"),
  },
  {
    name: "负面质疑属于风险决策",
    text: "质量差不差，别翻车啊",
    productKey: "cup",
    intent: "negative",
    hitWords: ["质量差", "翻车"],
    expect: ({ relevance, priority }) =>
      isReplyDecision(relevance, priority, "risk") &&
      priority.priority >= 8 &&
      hasSignal(priority, "信任风险"),
  },
  {
    name: "普通称赞不进入回复队列",
    text: "主播衣服好看",
    productKey: "cup",
    intent: "interaction",
    hitWords: [],
    expect: ({ relevance, priority }) => !relevance.related && priority === null,
  },
  {
    name: "离题价格问句仍然隔离",
    text: "背景音乐多少钱能买到？",
    productKey: "cup",
    intent: "price",
    hitWords: ["多少钱"],
    expect: ({ relevance, priority }) => !relevance.related && priority === null,
  },
  {
    name: "隔壁耳机优惠仍然隔离",
    text: "隔壁耳机还有优惠吗？",
    productKey: "cup",
    intent: "price",
    hitWords: ["优惠"],
    expect: ({ relevance, priority }) => !relevance.related && priority === null,
  },
  {
    name: "当前讲杯子时小白鞋问题归属其他商品",
    text: "小白鞋多少钱？",
    productKey: "cup",
    intent: "price",
    hitWords: ["多少钱"],
    expect: ({ relevance, priority }) =>
      !relevance.related &&
      relevance.productKey === "sneaker" &&
      priority === null,
  },
];

const failures = [];

for (const scenario of scenarios) {
  const relevance = evaluateProductRelevance({
    text: scenario.text,
    productKey: scenario.productKey,
    products: PRODUCTS,
  });
  const priority = relevance.related
    ? scoreReplyPriority({
        text: scenario.text,
        intent: scenario.intent,
        sentiment: scenario.intent === "negative" ? "negative" : "neutral",
        hitWords: scenario.hitWords,
        relevanceScore: relevance.score,
        matchedIntentCount: scenario.hitWords.length > 1 ? 2 : 1,
      })
    : null;

  const passed = scenario.expect({ relevance, priority });
  if (!passed) {
    failures.push({
      name: scenario.name,
      text: scenario.text,
      relevance,
      priority,
    });
  }
}

if (failures.length > 0) {
  console.error("Priority check failed:");
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Priority check passed: ${scenarios.length} scenarios`);
}

function isReplyDecision(relevance, priority, decisionType) {
  return Boolean(
    relevance.related &&
    priority &&
    priority.needsReply &&
    priority.decisionType === decisionType &&
    Number.isFinite(priority.confidence) &&
    priority.confidence >= 60 &&
    Array.isArray(priority.matchedSignals),
  );
}

function hasSignal(priority, signalLabel) {
  return priority.matchedSignals.some((signal) => signal.startsWith(signalLabel));
}
