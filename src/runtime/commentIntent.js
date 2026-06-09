const DEFAULT_INTENT_WEIGHTS = {
  buy: 10,
  price: 8,
  size: 7,
  stock: 7,
  logistics: 6,
  service: 7,
  negative: 9,
  interaction: 2,
};

export const COMMENT_INTENT_RULES = [
  {
    intent: "negative",
    sentiment: "negative",
    keywords: ["太贵", "贵了", "骗子", "假", "差评", "不值", "别买", "翻车", "投诉", "退货", "掉色吗", "会坏", "质量差"],
  },
  {
    intent: "buy",
    sentiment: "positive",
    keywords: ["怎么买", "链接", "第几个链接", "哪个链接", "小黄车", "小黄车哪一个", "下单", "拍哪个", "想买", "加购", "已拍", "付款", "成交", "买一件", "买两件", "再来一件", "现在拍"],
  },
  {
    intent: "price",
    sentiment: "neutral",
    keywords: ["多少钱", "多钱", "多少米", "几米", "啥价", "什么价", "什么价格", "价格", "价钱", "到手价", "活动价", "券后", "券后价", "优惠", "还有优惠", "券", "领券", "便宜", "便宜点", "便宜些", "少点", "少一点", "能少", "能便宜", "满减", "划算", "最低", "活动", "到手"],
  },
  {
    intent: "size",
    sentiment: "neutral",
    keywords: ["尺码", "码数", "换码", "拍错码", "大码", "小码", "身高", "体重", "多大", "多高", "多重", "合适", "试穿", "XL", "xxl"],
  },
  {
    intent: "stock",
    sentiment: "neutral",
    keywords: ["还有", "有货", "库存", "现货", "补货", "缺货", "颜色", "白色", "黑色", "粉色", "蓝色", "几号", "售罄"],
  },
  {
    intent: "logistics",
    sentiment: "neutral",
    keywords: ["发货", "什么时候发", "今天发", "今天能发", "能发吗", "多久", "几天到", "快递", "顺丰", "到货", "运费", "偏远", "新疆", "西藏", "包邮", "包邮吗", "包不包邮"],
  },
  {
    intent: "service",
    sentiment: "neutral",
    keywords: ["质量", "售后", "客服", "退换", "退货", "换货", "可以退", "可以换", "能退", "能换", "能退不", "能换不", "不合适", "拍错", "拍错了", "咋办", "咋弄", "怎么弄", "价保", "保修", "正品", "材质", "面料", "起球", "缩水", "保温", "漏水", "磨脚"],
  },
];

export function matchCommentIntents(text, intentWeights = DEFAULT_INTENT_WEIGHTS) {
  const normalized = normalizeIntentText(text);
  const matches = [];

  for (const rule of COMMENT_INTENT_RULES) {
    const hitWords = rule.keywords.filter((word) => normalized.includes(normalizeIntentText(word)));
    if (hitWords.length > 0) {
      matches.push({
        intent: rule.intent,
        sentiment: rule.sentiment,
        hitWords,
        score: hitWords.length * (intentWeights[rule.intent] || DEFAULT_INTENT_WEIGHTS[rule.intent] || 1),
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return {
    matches,
    best: matches[0] || null,
    matchedKeywords: [...new Set(matches.flatMap((item) => item.hitWords))],
  };
}

function normalizeIntentText(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, "");
}
