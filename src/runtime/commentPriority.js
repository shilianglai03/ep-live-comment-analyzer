const PRICE_DECISION_PATTERNS = [
  "多少钱", "多钱", "多少米", "几米", "啥价", "什么价", "什么价格", "价格", "价钱",
  "到手价", "活动价", "券后", "券后价", "优惠", "还有优惠", "券", "领券", "满减",
  "划算", "少点", "少一点", "能少", "能便宜", "便宜点", "便宜些", "还能便宜",
  "最低",
];
const FIT_DECISION_PATTERNS = [
  "尺码", "码数", "换码", "拍错码", "身高", "体重", "多大", "多高", "多重",
  "合适", "试穿", "大码", "小码", "穿得下", "宽松", "偏大", "偏小",
];
const AFTER_SALE_DECISION_PATTERNS = [
  "退换", "退货", "换货", "能退", "能换", "可以退", "可以换", "可退", "可换",
  "不合适", "拍错", "拍错了", "咋办", "咋弄", "怎么弄", "换码", "售后", "客服",
  "价保", "保修",
];
const FULFILLMENT_DECISION_PATTERNS = [
  "库存", "现货", "售罄", "缺货", "补货", "有货", "发货", "到货", "多久",
  "什么时候发", "今天发", "今天能发", "能发吗", "几天到", "快递", "顺丰",
  "运费", "包邮", "包邮吗", "包不包邮", "偏远",
];
const QUESTION_PATTERNS = [
  "?", "？", "吗", "嘛", "么", "呢", "怎么", "咋", "咋办", "咋弄", "怎么办",
  "怎么弄", "多少", "有没有", "能不能", "可不可以", "可以不", "能退不",
  "能换不", "第几个", "在哪里", "在哪", "哪一个", "哪个",
];
const COMMITMENT_PATTERNS = [
  "已拍", "付款", "加购", "下单", "想买", "拍哪个", "链接", "第几个链接",
  "哪个链接", "小黄车", "小黄车哪一个", "现在拍", "买两件", "买一件", "再来一件",
];
const RISK_PATTERNS = [
  "太贵", "贵了", "骗子", "假", "差评", "投诉", "翻车", "别买", "漏水",
  "掉色", "起球", "缩水", "磨脚", "质量差",
];
const WEAK_PRICE_REMARKS = ["好便宜", "真便宜", "价格不错", "有点便宜", "挺划算", "太划算"];

const BASE_PRIORITY = {
  negative: 8,
  buy: 7,
  price: 5,
  size: 6,
  stock: 6,
  service: 6,
  logistics: 5,
  interaction: 1,
};

const BUSINESS_SIGNALS = [
  { key: "priceDecision", label: "价格决策", decisionType: "price", patterns: PRICE_DECISION_PATTERNS },
  { key: "afterSaleDecision", label: "售后决策", decisionType: "afterSale", patterns: AFTER_SALE_DECISION_PATTERNS },
  { key: "fulfillmentDecision", label: "履约决策", decisionType: "fulfillment", patterns: FULFILLMENT_DECISION_PATTERNS },
  { key: "fitDecision", label: "尺码决策", decisionType: "fit", patterns: FIT_DECISION_PATTERNS },
  { key: "commitment", label: "购买动作", decisionType: "purchase", patterns: COMMITMENT_PATTERNS },
  { key: "risk", label: "信任风险", decisionType: "risk", patterns: RISK_PATTERNS },
];

export function scoreReplyPriority({
  text,
  intent,
  sentiment,
  hitWords = [],
  relevanceScore = 0,
  repeatedBoost = 0,
  matchedIntentCount = 1,
}) {
  const normalized = normalizePriorityText(text);
  const signals = detectPrioritySignals(normalized);
  const reasonTags = [];
  const weakPriceOnly = intent === "price" && signals.weakPriceRemark && !signals.directQuestion && !signals.commitment;
  let score = BASE_PRIORITY[intent] || 1;

  if (relevanceScore >= 85) {
    score += 1;
    reasonTags.push("强相关当前商品");
  } else if (relevanceScore >= 60) {
    score += 1;
    reasonTags.push("当前讲品场景问题");
  }

  if (signals.priceDecision) {
    score += intent === "price" ? 2 : 1;
    reasonTags.push("价格决策点");
  }

  if (signals.directQuestion) {
    score += 1;
    reasonTags.push("明确提问");
  }

  if (signals.fitDecision && intent === "size") {
    score += 1;
    reasonTags.push("尺码决策点");
  }

  if (signals.afterSaleDecision && ["service", "size", "negative"].includes(intent)) {
    score += 1;
    reasonTags.push("售后决策点");
  }

  if (signals.fulfillmentDecision && ["stock", "logistics"].includes(intent)) {
    score += 1;
    reasonTags.push("履约决策点");
  }

  if (signals.commitment) {
    score += 1;
    reasonTags.push("接近下单");
  }

  if (signals.risk || sentiment === "negative") {
    score += 1;
    reasonTags.push("信任风险");
  }

  if (matchedIntentCount >= 2) {
    score += 1;
    reasonTags.push("多意图阻断");
  }

  if (hitWords.length >= 2) {
    score += 1;
    reasonTags.push("命中多个关键信号");
  }

  if (repeatedBoost > 0) {
    score += 1;
    reasonTags.push("近期重复出现");
  }

  if (weakPriceOnly) {
    score = Math.min(score, 4);
    reasonTags.push("仅价格感叹");
  }

  if (intent === "interaction" && signals.businessSignalCount === 0 && !signals.directQuestion) {
    score = Math.min(score, 2);
  }

  const priority = clampPriority(score);
  const decisionType = inferDecisionType(intent, signals);
  const needsReply = !weakPriceOnly && (
    priority >= 6 ||
    (decisionType === "price" && signals.priceDecision) ||
    decisionType === "afterSale" ||
    decisionType === "fulfillment" ||
    (decisionType === "fit" && signals.fitDecision) ||
    decisionType === "purchase" ||
    decisionType === "risk"
  );
  const confidence = calculateConfidence({
    signals,
    priority,
    relevanceScore,
    repeatedBoost,
    matchedIntentCount,
    hitWords,
    weakPriceOnly,
    needsReply,
  });

  return {
    priority,
    score,
    needsReply,
    urgencyLabel: priority >= 8 ? "及时回复" : priority >= 6 ? "建议回复" : "观察即可",
    reasonTags,
    decisionType,
    confidence,
    matchedSignals: signals.matchedSignals,
  };
}

export function detectPrioritySignals(normalizedText) {
  const result = {
    priceDecision: false,
    fitDecision: false,
    afterSaleDecision: false,
    fulfillmentDecision: false,
    directQuestion: false,
    commitment: false,
    risk: false,
    weakPriceRemark: false,
    matchedSignals: [],
    businessSignalCount: 0,
  };

  for (const signal of BUSINESS_SIGNALS) {
    const hits = collectHits(normalizedText, signal.patterns);
    result[signal.key] = hits.length > 0;
    if (hits.length > 0) {
      result.businessSignalCount += 1;
      result.matchedSignals.push(`${signal.label}:${hits.slice(0, 3).join("、")}`);
    }
  }

  const questionHits = collectHits(normalizedText, QUESTION_PATTERNS);
  result.directQuestion = questionHits.length > 0;
  if (questionHits.length > 0) {
    result.matchedSignals.push(`明确提问:${questionHits.slice(0, 2).join("、")}`);
  }

  result.weakPriceRemark = collectHits(normalizedText, WEAK_PRICE_REMARKS).length > 0;
  return result;
}

function inferDecisionType(intent, signals) {
  if (intent === "negative" || signals.risk) return "risk";
  if (signals.priceDecision || intent === "price") return "price";
  if (signals.afterSaleDecision || intent === "service") return "afterSale";
  if (signals.fulfillmentDecision || ["stock", "logistics"].includes(intent)) return "fulfillment";
  if (signals.fitDecision || intent === "size") return "fit";
  if (signals.commitment || intent === "buy") return "purchase";
  return "interaction";
}

function calculateConfidence({
  signals,
  priority,
  relevanceScore,
  repeatedBoost,
  matchedIntentCount,
  hitWords,
  weakPriceOnly,
  needsReply,
}) {
  let confidence = 25;
  if (relevanceScore >= 85) confidence += 30;
  else if (relevanceScore >= 60) confidence += 20;
  else if (relevanceScore >= 30) confidence += 8;

  confidence += Math.min(35, signals.businessSignalCount * 12);
  if (signals.directQuestion) confidence += 8;
  if (signals.commitment) confidence += 8;
  if (signals.risk) confidence += 8;
  if (matchedIntentCount >= 2) confidence += 5;
  if (hitWords.length >= 2) confidence += 5;
  if (repeatedBoost > 0) confidence += 4;
  if (priority >= 8) confidence += 5;
  if (weakPriceOnly) confidence -= 30;
  if (!needsReply && signals.businessSignalCount === 0) confidence = Math.min(confidence, 45);
  return clampPercent(confidence);
}

function collectHits(normalizedText, patterns) {
  return uniquePatterns(patterns.filter((pattern) => normalizedText.includes(normalizePriorityText(pattern))));
}

function uniquePatterns(patterns) {
  return [...new Set((patterns || []).filter(Boolean))];
}

function clampPriority(value) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizePriorityText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}
