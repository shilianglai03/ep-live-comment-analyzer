const GENERAL_PRODUCT_CONTEXT_KEYWORDS = ["多少钱", "价格", "优惠", "券", "下单", "链接", "小黄车", "发货", "快递", "包邮", "库存", "现货", "售后", "质量", "退换", "正品", "活动", "到手", "拍", "加购", "付款"];
const OFF_TOPIC_KEYWORDS = ["隔壁直播间", "耳机", "手机壳", "零食", "包包", "口红", "色号", "背景音乐", "音乐", "私信", "下播", "抽奖"];

const PRODUCT_FILTER_PROFILES = {
  suncoat: {
    aliases: ["轻薄防晒衣", "防晒衣", "防晒", "UPF", "外套", "遮阳"],
    signals: ["身高", "体重", "2XL", "XL", "大码", "小码", "试穿", "面料", "透气", "户外", "掉色", "起球", "缩水", "夏天会闷"],
    sharedSignals: ["尺码", "码数", "穿", "合适", "颜色", "白色", "粉色", "黑色", "材质"],
  },
  sneaker: {
    aliases: ["百搭小白鞋", "小白鞋", "鞋", "通勤鞋"],
    signals: ["鞋底", "磨脚", "脚背", "鞋码", "36码", "37码", "38码", "39码", "40码", "大一码", "小一码"],
    sharedSignals: ["尺码", "码数", "穿", "合适", "颜色", "白色", "黑色", "材质"],
  },
  cup: {
    aliases: ["316 保温杯", "316保温杯", "保温杯", "杯子", "杯"],
    signals: ["杯盖", "漏水", "保温", "316", "容量", "480ml", "650ml", "毫升", "内胆", "热水", "冰饮", "密封", "不锈钢"],
    sharedSignals: ["颜色", "白色", "黑色", "蓝色", "材质"],
  },
};

export function findProductKeyByName(value, products) {
  const text = normalizeFilterText(value);
  if (!text || text === "其他") return "";
  return Object.entries(products).find(([key, product]) => {
    const names = [product.name, ...getProductAttributionKeywords(key)];
    return names.some((name) => text.includes(normalizeFilterText(name)) || normalizeFilterText(name).includes(text));
  })?.[0] || "";
}

export function evaluateProductRelevance({ text, productKey, assignedProductKey = "", products }) {
  const product = products[productKey];
  if (!product) {
    return {
      related: false,
      score: 0,
      reason: "当前商品不存在",
      matchedKeywords: [],
      productKey: "",
    };
  }

  if (assignedProductKey && products[assignedProductKey]) {
    if (assignedProductKey === productKey) {
      return {
        related: true,
        score: 100,
        reason: `归属当前商品：${products[assignedProductKey].name}`,
        matchedKeywords: [products[assignedProductKey].name],
        productKey: assignedProductKey,
      };
    }
    return {
      related: false,
      score: 12,
      reason: `归属其他商品：${products[assignedProductKey].name}`,
      matchedKeywords: [products[assignedProductKey].name],
      productKey: assignedProductKey,
    };
  }

  const normalized = normalizeFilterText(text);
  const ownMatch = matchProductForText(normalized, productKey, { includeSharedSignals: true });
  const otherMatch = findStrongestProductMatch(normalized, products, productKey);
  const offTopicHits = collectKeywordHits(normalized, OFF_TOPIC_KEYWORDS);
  const generalHits = collectKeywordHits(normalized, GENERAL_PRODUCT_CONTEXT_KEYWORDS);

  if (ownMatch.score > 0) {
    const ownHits = ownMatch.hits.slice(0, 5);
    return {
      related: true,
      score: ownMatch.aliasHits.length > 0 ? 98 : 86,
      reason: `命中当前商品：${ownHits.slice(0, 3).join("、")}`,
      matchedKeywords: ownHits,
      productKey,
    };
  }

  if (isStrongProductMatch(otherMatch)) {
    const otherHits = otherMatch.hits.slice(0, 5);
    return {
      related: false,
      score: 18,
      reason: `疑似其他商品：${products[otherMatch.key].name}（${otherHits.slice(0, 3).join("、")}）`,
      matchedKeywords: otherHits,
      productKey: otherMatch.key,
    };
  }

  if (offTopicHits.length > 0) {
    return {
      related: false,
      score: 10,
      reason: `疑似非当前商品或直播闲聊：${offTopicHits.slice(0, 3).join("、")}`,
      matchedKeywords: offTopicHits.slice(0, 5),
      productKey: "",
    };
  }

  if (generalHits.length > 0) {
    return {
      related: true,
      score: 68,
      reason: `直播商品通用问题：${generalHits.slice(0, 3).join("、")}`,
      matchedKeywords: generalHits.slice(0, 5),
      productKey: "",
    };
  }

  return {
    related: false,
    score: 8,
    reason: `未命中${product.name}相关信息`,
    matchedKeywords: [],
    productKey: "",
  };
}

export function getProductRelevanceKeywords(productKey, products) {
  const product = products[productKey];
  return [product?.name, ...getProductAttributionKeywords(productKey), ...getProductSharedSignalKeywords(productKey), ...(product?.relevanceKeywords || [])].filter(Boolean);
}

export function inferProductKeyFromText(text, products) {
  const normalized = normalizeFilterText(text);
  if (!normalized) return "";
  const match = findStrongestProductMatch(normalized, products);
  return isStrongProductMatch(match) ? match.key : "";
}

function getProductProfile(productKey) {
  return PRODUCT_FILTER_PROFILES[productKey] || { aliases: [], signals: [], sharedSignals: [] };
}

function getProductAttributionKeywords(productKey) {
  const profile = getProductProfile(productKey);
  return uniqueKeywords([...(profile.aliases || []), ...(profile.signals || [])]);
}

function getProductSharedSignalKeywords(productKey) {
  return uniqueKeywords(getProductProfile(productKey).sharedSignals || []);
}

function matchProductForText(normalizedText, productKey, options = {}) {
  const profile = getProductProfile(productKey);
  const aliasHits = collectKeywordHits(normalizedText, profile.aliases || []);
  const signalHits = collectKeywordHits(normalizedText, profile.signals || []);
  const sharedHits = options.includeSharedSignals ? collectKeywordHits(normalizedText, profile.sharedSignals || []) : [];
  const hits = uniqueKeywords([...aliasHits, ...signalHits, ...sharedHits]);
  return {
    key: productKey,
    aliasHits,
    signalHits,
    sharedHits,
    hits,
    score: aliasHits.length * 5 + signalHits.length * 3 + sharedHits.length,
  };
}

function findStrongestProductMatch(normalizedText, products, excludedProductKey = "") {
  return Object.keys(products)
    .filter((key) => key !== excludedProductKey)
    .map((key) => matchProductForText(normalizedText, key))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || b.aliasHits.length - a.aliasHits.length || b.signalHits.length - a.signalHits.length)[0] || null;
}

function isStrongProductMatch(match) {
  return Boolean(match && (match.aliasHits.length > 0 || match.signalHits.length > 0));
}

function collectKeywordHits(normalizedText, keywords) {
  return uniqueKeywords((keywords || []).filter((keyword) => normalizedText.includes(normalizeFilterText(keyword))));
}

function uniqueKeywords(keywords) {
  return [...new Set((keywords || []).filter(Boolean))];
}

function normalizeFilterText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}
