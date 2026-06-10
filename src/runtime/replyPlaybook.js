const RESPONSE_PLAYBOOKS = {
  price: {
    actionLabel: "先报到手价",
    hostHint: "先说到手价和领券路径，再补一句当前活动为什么划算。",
    replyGoal: "降低价格犹豫",
    slaSeconds: 15,
    requiredFacts: ["price", "coupon"],
  },
  afterSale: {
    actionLabel: "先给售后兜底",
    hostHint: "先确认可处理，再说退换/客服规则，避免只催下单。",
    replyGoal: "补足信任",
    slaSeconds: 20,
    requiredFacts: ["service", "quality"],
  },
  fulfillment: {
    actionLabel: "先讲履约确定性",
    hostHint: "优先回答发货、包邮、到货和库存，不要只重复卖点。",
    replyGoal: "减少下单不确定性",
    slaSeconds: 20,
    requiredFacts: ["shipping", "stock"],
  },
  fit: {
    actionLabel: "先给选择建议",
    hostHint: "根据尺码、容量或规格给明确建议，必要时提示保守选择。",
    replyGoal: "消除选择阻断",
    slaSeconds: 20,
    requiredFacts: ["specs", "service"],
  },
  purchase: {
    actionLabel: "先指购买入口",
    hostHint: "先说小黄车/链接位置，再补领券和锁库存动作。",
    replyGoal: "承接购买动作",
    slaSeconds: 15,
    requiredFacts: ["name", "price", "coupon"],
  },
  risk: {
    actionLabel: "先接住质疑",
    hostHint: "先承认担心，再给质量事实和售后兜底，不要回避。",
    replyGoal: "降低信任风险",
    slaSeconds: 10,
    requiredFacts: ["quality", "service"],
  },
  interaction: {
    actionLabel: "顺手互动",
    hostHint: "轻互动即可，顺带把商品核心利益点带回直播节奏。",
    replyGoal: "维持氛围",
    slaSeconds: 45,
    requiredFacts: ["name", "price"],
  },
};

export function getResponsePlaybook(decisionType, product) {
  const playbook = RESPONSE_PLAYBOOKS[decisionType] || RESPONSE_PLAYBOOKS.interaction;
  return {
    decisionType: RESPONSE_PLAYBOOKS[decisionType] ? decisionType : "interaction",
    actionLabel: playbook.actionLabel,
    hostHint: playbook.hostHint,
    replyGoal: playbook.replyGoal,
    slaSeconds: playbook.slaSeconds,
    requiredFacts: playbook.requiredFacts.map((field) => ({
      field,
      label: factLabel(field),
      value: product?.[field] || "",
    })).filter((item) => item.value),
  };
}

export function createPlaybookReplySuggestion({ intent, decisionType, product, text }) {
  const playbook = getResponsePlaybook(decisionType, product);
  const templates = {
    price: `这款${product.name}${product.price}，${product.coupon}，现在拍是本场比较合适的价格。`,
    afterSale: `售后这块可以放心，${product.service}。关于质量，${product.quality}。`,
    fulfillment: `发货和库存先说明一下：${product.shipping}；库存是${product.stock}。`,
    fit: `${product.name}的选择建议：${product.specs}。如果拿不准，可以按更常用的场景选。`,
    purchase: `想拍的朋友直接看小黄车里的「${product.name}」，当前${product.price}，先领券再下单更划算。`,
    risk: `这个担心可以理解，我们直接说事实：${product.quality}。如果收到不合适，售后是${product.service}。`,
    interaction: `可以感谢这位朋友，并顺手把${product.name}的核心卖点再重复一遍。`,
  };

  if (intent === "size" && /168|115|身高|体重/.test(text)) {
    return `168、115斤可以先按平时外套尺码选，想宽松拍大一码；${product.shipping}。`;
  }

  const reply = templates[playbook.decisionType] || templates.interaction;
  return `${reply} 场控提示：${playbook.actionLabel}。`;
}

export function compactPlaybookForPrompt(playbook) {
  if (!playbook) return "";
  const facts = (playbook.requiredFacts || [])
    .map((item) => `${item.label}:${item.value}`)
    .join("；");
  return [
    `回复动作:${playbook.actionLabel}`,
    `回复目标:${playbook.replyGoal}`,
    `建议时效:${playbook.slaSeconds}秒内`,
    playbook.hostHint ? `场控提示:${playbook.hostHint}` : "",
    facts ? `必须参考事实:${facts}` : "",
  ].filter(Boolean).join("；");
}

function factLabel(field) {
  return {
    name: "商品",
    price: "价格",
    coupon: "优惠",
    specs: "规格",
    stock: "库存",
    shipping: "发货",
    service: "售后",
    quality: "品质",
  }[field] || field;
}
