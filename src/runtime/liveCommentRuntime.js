import { computed, reactive, watch } from "vue";
import {
  evaluateProductRelevance as evaluateCatalogProductRelevance,
  findProductKeyByName as findCatalogProductKeyByName,
  getProductRelevanceKeywords as getCatalogProductRelevanceKeywords,
  inferProductKeyFromText as inferCatalogProductKeyFromText,
} from "./filterStrategy.js";
import { scoreReplyPriority } from "./commentPriority.js";

export function createLiveCommentRuntime() {

const PRODUCTS = {
  suncoat: {
    name: "轻薄防晒衣",
    price: "到手 79 元",
    coupon: "直播间领 20 元券",
    specs: "S 到 2XL，按平时外套尺码选",
    stock: "白色和浅灰现货充足，粉色库存偏少",
    shipping: "今晚 23 点前下单，48 小时内发货，偏远地区顺延",
    service: "支持 7 天无理由，吊牌完整不影响二次销售即可",
    quality: "UPF50+，轻薄透气，日常通勤和户外都适合",
    relevanceKeywords: ["轻薄防晒衣", "防晒衣", "防晒", "UPF", "外套", "面料", "透气", "遮阳", "户外", "尺码", "身高", "体重", "2XL", "XL", "大码", "小码", "穿"],
  },
  sneaker: {
    name: "百搭小白鞋",
    price: "到手 129 元",
    coupon: "第二双减 30 元",
    specs: "35 到 40 码，脚背高建议拍大一码",
    stock: "36 到 39 码现货足，35 码少量",
    shipping: "默认中通或圆通，拍下后 24 到 48 小时发货",
    service: "尺码不合适可换，保持鞋底干净即可",
    quality: "软底不磨脚，适合通勤、逛街和日常穿搭",
    relevanceKeywords: ["百搭小白鞋", "小白鞋", "鞋", "鞋底", "磨脚", "脚背", "鞋码", "36码", "37码", "38码", "39码", "40码", "通勤鞋", "穿"],
  },
  cup: {
    name: "316 保温杯",
    price: "到手 59 元",
    coupon: "拍两件自动再减 10 元",
    specs: "480ml 和 650ml 两种容量，通勤建议 480ml",
    stock: "奶白和雾蓝库存足，黑色快售罄",
    shipping: "仓库按付款顺序发货，一般 48 小时内出库",
    service: "杯盖密封问题可联系客服补发配件",
    quality: "316 不锈钢内胆，热水和冰饮都可以用",
    relevanceKeywords: ["316 保温杯", "保温杯", "杯", "杯盖", "漏水", "保温", "316", "容量", "480ml", "650ml", "毫升", "内胆", "热水", "冰饮", "密封"],
  },
};

const INTENT_META = {
  buy: { label: "购买意向", className: "buy", weight: 10 },
  price: { label: "价格优惠", className: "price", weight: 8 },
  size: { label: "规格尺码", className: "size", weight: 7 },
  stock: { label: "库存颜色", className: "stock", weight: 7 },
  logistics: { label: "物流发货", className: "logistics", weight: 6 },
  service: { label: "质量售后", className: "service", weight: 7 },
  negative: { label: "风险质疑", className: "negative", weight: 9 },
  interaction: { label: "普通互动", className: "interaction", weight: 2 },
};

const DECISION_TYPE_META = {
  price: { label: "价格决策", className: "price" },
  afterSale: { label: "售后决策", className: "service" },
  fulfillment: { label: "履约决策", className: "logistics" },
  fit: { label: "尺码决策", className: "size" },
  purchase: { label: "购买决策", className: "buy" },
  risk: { label: "风险决策", className: "negative" },
  interaction: { label: "普通互动", className: "interaction" },
};

const KEYWORD_RULES = [
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

const SAMPLE_COMMENTS = [
  "这个多少钱，领券后到手价是多少？",
  "主播 160 斤能穿 2XL 吗？",
  "白色还有现货吗，怕拍了没货",
  "已拍一件，什么时候能发货？",
  "这个质量怎么样，会不会掉色吗？",
  "怎么买，链接在哪里？",
  "太贵了，能不能再便宜一点",
  "粉色还有吗？我想拍粉色",
  "身高 168 体重 115 选什么码？",
  "能包邮吗，偏远地区怎么算？",
  "我已经加购了，再讲一下尺码",
  "这个材质夏天会闷吗？",
  "有没有售后保障，不合适能退吗？",
  "刚进来，这个是什么活动价？",
  "拍一件和拍两件哪个划算？",
  "之前买过挺好，今天再来一件",
  "黑色是不是快没了？",
  "这个适合送人吗？",
  "会不会起球缩水？",
  "链接上架了吗，我现在拍",
  "质量差不差，别翻车啊",
  "可以走顺丰吗？",
  "主播能不能试穿一个 L 码？",
  "有没有大码，给妈妈买",
  "现在下单今天能发吗？",
  "客服售后响应快吗？",
  "这个价保多久？",
  "我想买两件，有没有满减？",
  "小黄车第几个是这款？",
  "颜色怎么选，哪个更百搭？",
  "是不是正品，有没有检测？",
  "太划算了，已经付款",
  "这款适合户外用吗？",
  "能不能再补一下库存？",
  "拍错码了可以换吗？",
  "链接打不开，场控看一下",
  "这个保温多久？",
  "鞋底硬不硬，会磨脚吗？",
  "杯盖漏水可以退换吗？",
  "36 码还有没有现货？",
];

const NOISE_COMMENTS = [
  "主播今天口红色号好好看",
  "刚从隔壁直播间过来，耳机还有优惠吗？",
  "今晚几点下播呀？",
  "能不能抽奖送手机壳？",
  "刚才那款零食还卖吗？",
  "背景音乐叫什么名字？",
  "主播看一下私信",
  "这个不是我想看的产品，什么时候上包包？",
];

const USER_NAMES = ["晴天", "小秋", "阿圆", "林小白", "橘子", "正在拍", "可可", "晚风", "小鹿", "海盐", "一只桃", "北北"];
const STOP_WORDS = new Set(["这个", "一个", "可以", "有没有", "是不是", "怎么", "多少", "现在", "主播", "直播间", "看看", "一件", "什么", "哪个", "不会", "还有", "已经"]);

const DEFAULT_AI_LIMIT = 24;
const AI_LIMIT_STORAGE_KEY = "ep.ai.maxRequestsPerSession";
const WORKSPACE_STORAGE_KEY = "ep.workspace.v1";

const NAV_ITEMS = [
  { to: "/overview", label: "总览", short: "总览" },
  { to: "/import", label: "批量导入", short: "导入" },
  { to: "/desk", label: "回复工作台", short: "回复" },
  { to: "/analysis", label: "分析看板", short: "分析" },
  { to: "/script", label: "话术建议", short: "话术" },
  { to: "/report", label: "复盘报告", short: "复盘" },
  { to: "/archive", label: "归档记录", short: "归档" },
  { to: "/settings", label: "运行设置", short: "设置" },
];

const COMMENT_VIEW_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "related", label: "只看相关" },
  { value: "noise", label: "只看隔离" },
];

const state = reactive({
  running: false,
  timer: null,
  clockTimer: null,
  clockText: "--:--:--",
  manualText: "",
  importText: "",
  importSource: "批量导入",
  importSummary: "",
  commentView: "all",
  archiveSearch: "",
  archiveIntent: "all",
  comments: [],
  replies: [],
  archivedReplies: [],
  selectedReplyIds: new Set(),
  alerts: [],
  keywordCounts: {},
  intentCounts: createIntentCounts(),
  speed: 1600,
  productKey: "suncoat",
  nextId: 1,
  ai: {
    enabled: true,
    available: false,
    checked: false,
    statusText: "检测中",
    requestedIds: new Set(),
    pendingIds: new Set(),
    maxRequestsPerSession: DEFAULT_AI_LIMIT,
  },
});

let stopWorkspacePersistence = null;

const currentProduct = computed(() => PRODUCTS[state.productKey]);
const productOptions = computed(() => Object.entries(PRODUCTS).map(([key, product]) => ({ key, product })));
const relevantComments = computed(() => state.comments.filter((comment) => comment.relevance?.related));
const noiseComments = computed(() => state.comments.filter((comment) => comment.relevance && !comment.relevance.related));
const buySignals = computed(() => state.intentCounts.buy || 0);
const riskCount = computed(() => state.intentCounts.negative || 0);
const selectedCount = computed(() => state.selectedReplyIds.size);
const archiveCount = computed(() => state.archivedReplies.length);
const archiveIntentOptions = computed(() => [
  { value: "all", label: "全部意图" },
  ...Object.entries(INTENT_META)
    .filter(([intent]) => intent !== "interaction")
    .map(([intent, meta]) => ({ value: intent, label: meta.label })),
]);
const filteredArchivedReplies = computed(() => {
  const query = normalize(state.archiveSearch);
  return state.archivedReplies.filter((reply) => {
    const matchesIntent = state.archiveIntent === "all" || reply.intent === state.archiveIntent;
    if (!matchesIntent) return false;
    if (!query) return true;
    const haystack = normalize(`${reply.user} ${reply.question} ${reply.replySuggestion} ${metaFor(reply.intent).label}`);
    return haystack.includes(query);
  });
});
const replyHealth = computed(() => {
  if (state.replies.length === 0) return "等待评论";
  const urgentCount = state.replies.filter((reply) => reply.priority >= 8).length;
  return urgentCount > 0 ? `${urgentCount} 条优先处理` : "队列正常";
});
const aiUsageText = computed(() => {
  const limit = state.ai.maxRequestsPerSession;
  if (limit <= 0) return "0/0";
  return `${state.ai.requestedIds.size}/${limit}`;
});
const aiStatusText = computed(() => (state.ai.enabled ? `${state.ai.statusText} · ${aiUsageText.value}` : "已关闭"));
const hotWords = computed(() =>
  Object.entries(state.keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({ word, count })),
);
const intentRows = computed(() => {
  const max = Math.max(...Object.values(state.intentCounts), 1);
  return Object.entries(INTENT_META).map(([intent, meta]) => {
    const value = state.intentCounts[intent] || 0;
    return {
      intent,
      label: meta.label,
      className: meta.className,
      value,
      width: Math.round((value / max) * 100),
    };
  });
});
const scriptPlan = computed(() => buildScriptPlan());
const reviewReport = computed(() => buildReviewReport());

function createIntentCounts() {
  return Object.fromEntries(Object.keys(INTENT_META).map((key) => [key, 0]));
}

function sharedBindings() {
  return {
    state,
    products: PRODUCTS,
    productOptions,
    intentMeta: INTENT_META,
    navItems: NAV_ITEMS,
    commentViewOptions: COMMENT_VIEW_OPTIONS,
    currentProduct,
    relevantComments,
    noiseComments,
    buySignals,
    riskCount,
    selectedCount,
    archiveCount,
    archiveIntentOptions,
    filteredArchivedReplies,
    aiUsageText,
    replyHealth,
    aiStatusText,
    hotWords,
    intentRows,
    scriptPlan,
    reviewReport,
    archiveReply,
    archiveSelectedReplies,
    exportArchivedCsv,
    exportReviewMarkdown,
    formatTime,
    confidenceClass,
    decisionMetaFor,
    getReplySourceClass,
    getReplySourceLabel,
    handleProductChange,
    importBatchComments,
    isReplySelected,
    loadImportExample,
    metaFor,
    priorityClass,
    productNameForComment,
    requestReplyRevision,
    revisionButtonText,
    submitManualComment,
    toggleReplySelection,
  };
}

function toggleStream() {
  if (state.running) {
    stopStream();
  } else {
    startStream();
  }
}

function startStream() {
  if (state.running) return;
  state.running = true;
  ingestRandomComment();
  state.timer = window.setInterval(ingestRandomComment, state.speed);
}

function stopStream() {
  state.running = false;
  if (state.timer) {
    window.clearInterval(state.timer);
    state.timer = null;
  }
}

function resetStream() {
  stopStream();
  state.manualText = "";
  state.importText = "";
  state.importSummary = "";
  state.comments = [];
  state.replies = [];
  state.archivedReplies = [];
  state.selectedReplyIds = new Set();
  state.alerts = [];
  state.keywordCounts = {};
  state.intentCounts = createIntentCounts();
  state.ai.requestedIds = new Set();
  state.ai.pendingIds = new Set();
  state.nextId = 1;
  clearWorkspaceState();
}

function updateSpeed(value) {
  state.speed = Number(value);
  if (!state.running) return;
  stopStream();
  startStream();
}

function handleProductChange() {
  rebuildAnalysisForCurrentProduct();
  saveWorkspaceState();
}

function rebuildAnalysisForCurrentProduct() {
  state.selectedReplyIds = new Set();
  state.replies = [];
  state.alerts = [];
  state.keywordCounts = {};
  state.intentCounts = createIntentCounts();
  state.ai.requestedIds = new Set();
  state.ai.pendingIds = new Set();
  state.commentView = "all";

  for (const comment of [...state.comments].reverse()) {
    const relevance = evaluateProductRelevance(comment.text, state.productKey, comment.productKey);
    const analysis = relevance.related ? analyzeComment(comment) : createNoiseAnalysis(relevance);
    comment.relevance = relevance;
    comment.analysis = analysis;

    if (!relevance.related) continue;
    state.intentCounts[analysis.intent] = (state.intentCounts[analysis.intent] || 0) + 1;
    collectKeywords(analysis.keywords);
    if (analysis.needsReply) {
      state.replies.unshift(buildReply(comment, analysis));
    }
    updateAlerts(comment, analysis);
  }

  state.replies = rankReplies(state.replies).slice(0, 12);
}

function updateAiLimit(value) {
  state.ai.maxRequestsPerSession = normalizeAiLimit(value);
  saveAiLimit(state.ai.maxRequestsPerSession);
  if (state.ai.enabled && state.ai.available) {
    hydratePendingAiReplies();
  }
}

function handleAiToggle() {
  if (state.ai.enabled && state.ai.available) {
    hydratePendingAiReplies();
  }
}

function submitManualComment() {
  const text = state.manualText.trim();
  if (!text) return;
  ingestComment(text, "手动输入");
  state.manualText = "";
}

function loadImportExample() {
  state.importText = [
    "user,product,comment",
    "小鹿,轻薄防晒衣,身高168体重115选什么码？今天拍什么时候发货？",
    "北北,轻薄防晒衣,白色还有现货吗，领券后到手多少钱？",
    "海盐,316 保温杯,杯盖漏水可以退换吗？",
    "晚风,其他,主播今天背景音乐叫什么名字？",
  ].join("\n");
  state.importSummary = "已载入示例，可直接导入测试。";
}

function importBatchComments() {
  const rows = parseImportedRows(state.importText);
  if (rows.length === 0) {
    state.importSummary = "没有识别到可导入的评论。";
    return;
  }

  const beforeTotal = state.comments.length;
  const beforeRelated = relevantComments.value.length;
  const beforeNoise = noiseComments.value.length;
  for (const row of rows) {
    ingestComment(row.text, row.source || state.importSource || "批量导入", {
      user: row.user,
      productKey: row.productKey,
    });
  }

  state.importText = "";
  state.importSummary = `已导入 ${rows.length} 条；新增有效 ${relevantComments.value.length - beforeRelated} 条，新增隔离 ${noiseComments.value.length - beforeNoise} 条。当前总评论 ${state.comments.length} 条。`;
  if (state.comments.length === beforeTotal) {
    state.importSummary = "导入完成，但没有新增评论。";
  }
}

function parseImportedRows(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = detectImportDelimiter(lines);
  if (!delimiter) {
    return lines.map((line) => ({ text: line })).filter((row) => row.text.length > 0);
  }

  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const header = rows[0].map((cell) => normalizeHeader(cell));
  const hasHeader = header.some((cell) => ["comment", "text", "content", "评论", "内容"].includes(cell));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const indexes = hasHeader ? getImportHeaderIndexes(header) : { text: rows[0].length - 1, user: 0, product: 1 };

  return dataRows
    .map((cells) => {
      const text = String(cells[indexes.text] || cells[cells.length - 1] || "").trim();
      if (!text) return null;
      const user = indexes.user >= 0 ? String(cells[indexes.user] || "").trim() : "";
      const productName = indexes.product >= 0 ? String(cells[indexes.product] || "").trim() : "";
      return {
        text,
        user,
        productKey: findProductKeyByName(productName),
      };
    })
    .filter(Boolean);
}

function detectImportDelimiter(lines) {
  const sample = lines.slice(0, 3).join("\n");
  if (sample.includes("\t")) return "\t";
  if (sample.includes(",")) return ",";
  return "";
}

function parseDelimitedLine(line, delimiter) {
  if (delimiter === "\t") return line.split("\t").map((cell) => cell.trim());
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase();
}

function getImportHeaderIndexes(header) {
  return {
    text: findHeaderIndex(header, ["comment", "text", "content", "评论", "内容"]),
    user: findHeaderIndex(header, ["user", "nickname", "name", "用户", "昵称"]),
    product: findHeaderIndex(header, ["product", "item", "商品", "产品"]),
  };
}

function findHeaderIndex(header, names) {
  return header.findIndex((cell) => names.includes(cell));
}

function findProductKeyByName(value) {
  return findCatalogProductKeyByName(value, PRODUCTS);
}

function ingestRandomComment() {
  const sourcePool = Math.random() < 0.18 ? NOISE_COMMENTS : SAMPLE_COMMENTS;
  const base = sourcePool[Math.floor(Math.random() * sourcePool.length)];
  const productName = currentProduct.value.name;
  const shouldMentionProduct = sourcePool === SAMPLE_COMMENTS && Math.random() > 0.58;
  const text = shouldMentionProduct && !base.includes(productName) ? `${productName} ${base}` : base;
  ingestComment(text, "模拟直播");
}

function ingestComment(text, source, options = {}) {
  const assignedProductKey = options.productKey || inferProductKeyFromText(text);
  const comment = {
    id: state.nextId,
    user: options.user || USER_NAMES[(state.nextId + text.length) % USER_NAMES.length],
    text,
    source,
    productKey: assignedProductKey,
    timestamp: new Date(),
  };
  state.nextId += 1;

  const relevance = evaluateProductRelevance(comment.text, state.productKey, comment.productKey);
  comment.relevance = relevance;
  const analysis = relevance.related ? analyzeComment(comment) : createNoiseAnalysis(relevance);
  comment.analysis = analysis;

  state.comments.unshift(comment);
  state.comments = state.comments.slice(0, 100);
  if (!relevance.related) return;

  state.intentCounts[analysis.intent] = (state.intentCounts[analysis.intent] || 0) + 1;
  collectKeywords(analysis.keywords);

  if (analysis.needsReply) {
    const reply = buildReply(comment, analysis);
    state.replies.unshift(reply);
    state.replies = rankReplies(state.replies).slice(0, 12);
    syncSelectedReplyIds();
    maybeRequestAiReply(reply, comment, analysis);
  }

  updateAlerts(comment, analysis);
}

function evaluateProductRelevance(text, productKey, assignedProductKey = "") {
  return evaluateCatalogProductRelevance({ text, productKey, assignedProductKey, products: PRODUCTS });
}

function getProductRelevanceKeywords(productKey) {
  return getCatalogProductRelevanceKeywords(productKey, PRODUCTS);
}

function inferProductKeyFromText(text) {
  return inferCatalogProductKeyFromText(text, PRODUCTS);
}

function createNoiseAnalysis(relevance) {
  return {
    intent: "interaction",
    sentiment: "neutral",
    priority: 0,
    replyScore: 0,
    decisionType: "interaction",
    confidence: 0,
    matchedSignals: [],
    keywords: relevance.matchedKeywords || [],
    needsReply: false,
    urgencyLabel: "观察即可",
    reason: `已隔离：${relevance.reason}`,
  };
}

function analyzeComment(comment) {
  const text = normalize(comment.text);
  const matches = [];

  for (const rule of KEYWORD_RULES) {
    const hitWords = rule.keywords.filter((word) => text.includes(normalize(word)));
    if (hitWords.length > 0) {
      matches.push({
        intent: rule.intent,
        sentiment: rule.sentiment,
        hitWords,
        score: hitWords.length * INTENT_META[rule.intent].weight,
      });
    }
  }

  if (matches.length === 0) {
    return {
      intent: "interaction",
      sentiment: "neutral",
      priority: 1,
      replyScore: 1,
      decisionType: "interaction",
      confidence: 20,
      matchedSignals: [],
      keywords: extractKeywords(comment.text),
      needsReply: false,
      urgencyLabel: "观察即可",
      reason: "普通互动评论",
    };
  }

  matches.sort((a, b) => b.score - a.score);
  const best = matches[0];
  const matchedKeywords = [...new Set(matches.flatMap((item) => item.hitWords))];
  const allKeywords = [...new Set(matchedKeywords.concat(extractKeywords(comment.text)))];
  const repeatedBoost = getRepeatedBoost(allKeywords);
  const replyDecision = scoreReplyPriority({
    text: comment.text,
    intent: best.intent,
    sentiment: best.sentiment,
    hitWords: matchedKeywords,
    relevanceScore: comment.relevance?.score || 0,
    repeatedBoost,
    matchedIntentCount: matches.length,
  });

  return {
    intent: best.intent,
    sentiment: best.sentiment,
    priority: replyDecision.priority,
    replyScore: replyDecision.score,
    decisionType: replyDecision.decisionType,
    confidence: replyDecision.confidence,
    matchedSignals: replyDecision.matchedSignals,
    keywords: allKeywords.slice(0, 8),
    needsReply: replyDecision.needsReply,
    urgencyLabel: replyDecision.urgencyLabel,
    reason: makeReason(best.intent, replyDecision.priority, replyDecision),
  };
}

function buildReply(comment, analysis) {
  const replySuggestion = createReplySuggestion(analysis.intent, currentProduct.value, comment.text);

  return {
    id: comment.id,
    question: comment.text,
    user: comment.user,
    intent: analysis.intent,
    priority: analysis.priority,
    replyScore: analysis.replyScore ?? analysis.priority,
    decisionType: analysis.decisionType || "interaction",
    confidence: Number(analysis.confidence) || 0,
    matchedSignals: Array.isArray(analysis.matchedSignals) ? analysis.matchedSignals : [],
    urgencyLabel: analysis.urgencyLabel || urgencyLabelForPriority(analysis.priority),
    reason: analysis.reason,
    replySuggestion,
    templateSuggestion: replySuggestion,
    source: "template",
    aiStatus: "idle",
    aiError: "",
    revisionDraft: "",
    revisionStatus: "idle",
    revisionError: "",
    revisionHistory: [],
    timestamp: comment.timestamp,
    answered: false,
    archivedAt: null,
  };
}

async function checkAiStatus() {
  if (!["http:", "https:"].includes(window.location.protocol)) {
    state.ai.available = false;
    state.ai.checked = true;
    state.ai.statusText = "需启动 server.py";
    return;
  }

  try {
    const response = await fetch("/api/status", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.ai.available = Boolean(data.configured);
    state.ai.checked = true;
    state.ai.statusText = state.ai.available ? `已连接 ${data.model}` : "未配置 API key";
    if (state.ai.available && state.ai.enabled) {
      hydratePendingAiReplies();
    }
  } catch {
    state.ai.available = false;
    state.ai.checked = true;
    state.ai.statusText = "模板模式";
  }
}

function maybeRequestAiReply(reply, comment, analysis) {
  if (!state.ai.enabled || !state.ai.available) return;
  if (state.ai.maxRequestsPerSession <= 0) {
    state.ai.statusText = "AI上限为0，模板模式";
    return;
  }
  if (reply.priority < 6) return;
  if (state.ai.requestedIds.size >= state.ai.maxRequestsPerSession) {
    state.ai.statusText = "本轮额度已满";
    return;
  }
  if (state.ai.requestedIds.has(reply.id) || state.ai.pendingIds.has(reply.id)) return;
  requestAiReply(reply, comment, analysis);
}

function hydratePendingAiReplies() {
  for (const reply of state.replies) {
    if (reply.source === "ai" || reply.aiStatus === "loading" || reply.priority < 6) continue;
    const comment = state.comments.find((item) => item.id === reply.id);
    if (!comment) continue;
    maybeRequestAiReply(reply, comment, comment.analysis);
  }
}

async function requestAiReply(reply, comment, analysis) {
  state.ai.requestedIds.add(reply.id);
  state.ai.pendingIds.add(reply.id);
  reply.aiStatus = "loading";
  reply.aiError = "";

  try {
    const response = await fetch("/api/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: comment.text,
        intent: analysis.intent,
        intentLabel: INTENT_META[analysis.intent].label,
        priority: analysis.priority,
        replyScore: analysis.replyScore,
        decisionType: analysis.decisionType,
        confidence: analysis.confidence,
        matchedSignals: analysis.matchedSignals,
        urgencyLabel: analysis.urgencyLabel,
        keywords: analysis.keywords,
        product: currentProduct.value,
        recentComments: state.comments.slice(0, 8).map((item) => item.text),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    const aiReply = String(data.reply || "").trim();
    if (!aiReply) throw new Error("AI 返回空回复");
    reply.replySuggestion = aiReply;
    reply.source = "ai";
    reply.aiStatus = "done";
    reply.aiError = "";
    addRevisionHistory(reply, "AI初稿", aiReply);
    state.ai.statusText = "AI已增强";
  } catch (error) {
    reply.replySuggestion = reply.templateSuggestion;
    reply.source = "template";
    reply.aiStatus = "failed";
    reply.aiError = error.message || "AI 生成失败";
    state.ai.statusText = "AI失败，模板兜底";
  } finally {
    state.ai.pendingIds.delete(reply.id);
  }
}

async function requestReplyRevision(reply) {
  if (!state.ai.available) {
    reply.revisionStatus = "failed";
    reply.revisionError = "请先通过 python server.py 启动 AI 服务";
    return;
  }

  const instruction = (reply.revisionDraft || "").trim() || "在保持事实准确的前提下，让回复更自然、更口语化。";
  const comment = state.comments.find((item) => item.id === reply.id);
  reply.revisionStatus = "loading";
  reply.revisionError = "";

  try {
    const response = await fetch("/api/revise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: comment?.text || reply.question,
        currentReply: reply.replySuggestion,
        revisionInstruction: instruction,
        intent: reply.intent,
        intentLabel: metaFor(reply.intent).label,
        decisionType: reply.decisionType,
        confidence: reply.confidence,
        matchedSignals: reply.matchedSignals,
        product: currentProduct.value,
        revisionHistory: reply.revisionHistory.slice(-5),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }
    const revisedReply = String(data.reply || "").trim();
    if (!revisedReply) throw new Error("AI 返回空回复");
    reply.replySuggestion = revisedReply;
    reply.source = "ai";
    reply.aiStatus = "done";
    reply.revisionStatus = "done";
    reply.revisionError = "";
    reply.revisionDraft = "";
    addRevisionHistory(reply, instruction, revisedReply);
  } catch (error) {
    reply.revisionStatus = "failed";
    reply.revisionError = error.message || "修改失败";
  }
}

function addRevisionHistory(reply, instruction, text) {
  reply.revisionHistory.push({
    round: reply.revisionHistory.length + 1,
    instruction,
    text,
    timestamp: new Date(),
  });
  reply.revisionHistory = reply.revisionHistory.slice(-8);
}

function archiveReply(id) {
  archiveReplyIds([id]);
}

function archiveSelectedReplies() {
  archiveReplyIds([...state.selectedReplyIds]);
}

function archiveReplyIds(ids) {
  const idSet = new Set(ids.map((id) => String(id)));
  if (idSet.size === 0) return;

  const archivedAt = new Date();
  const archived = [];
  state.replies = state.replies.filter((reply) => {
    if (!idSet.has(String(reply.id))) return true;
    reply.answered = true;
    reply.archivedAt = archivedAt;
    reply.revisionDraft = "";
    archived.push(reply);
    state.selectedReplyIds.delete(String(reply.id));
    return false;
  });

  if (archived.length === 0) {
    syncSelectedReplyIds();
    return;
  }
  state.archivedReplies = [...archived, ...state.archivedReplies].slice(0, 80);
}

function exportArchivedCsv() {
  const rows = filteredArchivedReplies.value;
  if (rows.length === 0) return;
  const csv = buildArchiveCsv(rows);
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `EP-archive-${formatDateForFile(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

function buildArchiveCsv(rows) {
  const header = ["归档时间", "用户", "意图", "问题", "回答", "来源", "修改次数"];
  const body = rows.map((reply) => [
    reply.archivedAt ? new Date(reply.archivedAt).toLocaleString("zh-CN", { hour12: false }) : "",
    reply.user,
    metaFor(reply.intent).label,
    reply.question,
    reply.replySuggestion,
    getReplySourceLabel(reply),
    reply.revisionHistory?.length || 0,
  ]);
  return [header, ...body].map((row) => row.map(csvCell).join(",")).join("\n");
}

function csvCell(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDateForFile(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function toggleReplySelection(id, checked) {
  const key = String(id);
  if (checked) {
    state.selectedReplyIds.add(key);
  } else {
    state.selectedReplyIds.delete(key);
  }
}

function isReplySelected(id) {
  return state.selectedReplyIds.has(String(id));
}

function syncSelectedReplyIds() {
  const liveReplyIds = new Set(state.replies.map((reply) => String(reply.id)));
  for (const id of state.selectedReplyIds) {
    if (!liveReplyIds.has(id)) {
      state.selectedReplyIds.delete(id);
    }
  }
}

function rankReplies(replies) {
  return [...replies].sort((a, b) =>
    b.priority - a.priority ||
    (Number(b.replyScore) || 0) - (Number(a.replyScore) || 0) ||
    b.timestamp - a.timestamp,
  );
}

function updateAlerts(comment, analysis) {
  const recent = state.comments.slice(0, 12);
  const negativeCount = recent.filter((item) => item.analysis?.intent === "negative").length;
  const topIntent = getTopIntent();
  const alerts = [];

  if (analysis.intent === "negative") {
    alerts.push({
      type: "danger",
      text: `风险评论需要及时处理：${comment.text}`,
    });
  }
  if (negativeCount >= 3) {
    alerts.push({
      type: "danger",
      text: `最近 12 条里有 ${negativeCount} 条风险质疑，建议主播先补充质量和售后说明。`,
    });
  }
  if (topIntent && state.comments.length % 8 === 0) {
    alerts.push({
      type: "warn",
      text: `${metaFor(topIntent).label}正在集中出现，建议连续讲 20 秒核心信息。`,
    });
  }

  state.alerts = dedupeAlerts([...alerts, ...state.alerts]).slice(0, 8);
}

function dedupeAlerts(alerts) {
  const seen = new Set();
  return alerts.filter((alert) => {
    if (seen.has(alert.text)) return false;
    seen.add(alert.text);
    return true;
  });
}

function getTopIntent() {
  const entries = Object.entries(state.intentCounts).filter(([intent, count]) => intent !== "interaction" && count > 0);
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] || null;
}

function buildScriptPlan() {
  const product = currentProduct.value;
  const intent = getTopIntent() || "interaction";
  const meta = metaFor(intent);
  const hotWordText = hotWords.value.length > 0
    ? hotWords.value.slice(0, 5).map((item) => item.word).join("、")
    : "价格、尺码、发货";

  const focusMap = {
    buy: `这一分钟重点把小黄车路径和下单利益点说清楚，减少想买用户的犹豫。`,
    price: `这一分钟重点讲价格组成：${product.price}，${product.coupon}，让观众知道现在拍为什么划算。`,
    size: `这一分钟重点讲尺码判断：${product.specs}，把身高体重问题集中回答掉。`,
    stock: `这一分钟重点讲库存和颜色：${product.stock}，提醒喜欢的颜色先锁单。`,
    logistics: `这一分钟重点讲发货节奏：${product.shipping}，补足下单确定感。`,
    service: `这一分钟重点讲售后和质量：${product.service}，再补一句${product.quality}。`,
    negative: `这一分钟先接住质疑，再讲事实：${product.quality}，售后是${product.service}。`,
    interaction: `这一分钟先做轻互动，再把${product.name}的价格、尺码和发货重新串起来。`,
  };

  const quickReplies = {
    buy: [`想拍的朋友直接看小黄车里的「${product.name}」，先领券再拍。`, `已经加购的朋友可以现在锁一下库存，颜色按付款顺序来。`],
    price: [`这款现在${product.price}，${product.coupon}，到手价我再给大家重复一遍。`, `不是单看标价，要先领券，领完再拍会更合适。`],
    size: [`尺码按平时穿的外套码选就行，想宽松就大一码。`, `身高体重拿不准的朋友可以直接报一下，我按场景帮你判断。`],
    stock: [`库存这边实时变动，${product.stock}。`, `喜欢的颜色建议先拍，付款后会按顺序锁库存。`],
    logistics: [`发货是${product.shipping}，拍完可以在订单里看物流。`, `偏远地区会顺延一点，正常地区按仓库节奏发。`],
    service: [`售后这块放心，${product.service}。`, `质量点给大家再说一下：${product.quality}。`],
    negative: [`这个担心可以理解，我们直接说事实：${product.quality}。`, `如果收到不合适，按规则走售后，${product.service}。`],
    interaction: [`刚进来的朋友，这款是${product.name}，${product.price}。`, `大家想问尺码、颜色、发货都可以打在公屏，我按顺序回复。`],
  };

  return {
    focus: meta.label,
    hotWords: hotWordText,
    opening: focusMap[intent] || focusMap.interaction,
    bullets: [
      `商品：${product.name}`,
      `价格：${product.price}；优惠：${product.coupon}`,
      `规格：${product.specs}`,
      `发货：${product.shipping}`,
      state.alerts.length > 0 ? `风险提醒：${state.alerts[0].text}` : `信任补充：${product.service}`,
    ],
    quickReplies: quickReplies[intent] || quickReplies.interaction,
    closing: `场控可以提醒主播接下来优先看“${hotWordText}”这些问题，回答完再回到${product.name}的核心卖点。`,
  };
}

function buildReviewReport() {
  const productRows = Object.entries(PRODUCTS).map(([key, product]) => {
    const attributedComments = state.comments.filter((comment) => getCommentProductKey(comment) === key);
    const relatedForCurrent = state.productKey === key ? attributedComments.filter((comment) => comment.relevance?.related).length : 0;
    return {
      key,
      name: product.name,
      total: attributedComments.length,
      currentEffective: relatedForCurrent,
      replies: state.replies.filter((reply) => {
        const comment = state.comments.find((item) => item.id === reply.id);
        return getCommentProductKey(comment) === key;
      }).length,
    };
  });

  const topIntentRows = intentRows.value
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const topHotWords = hotWords.value.slice(0, 8);
  const noiseRatio = state.comments.length === 0 ? 0 : Math.round((noiseComments.value.length / state.comments.length) * 100);

  return {
    generatedAt: new Date(),
    productName: currentProduct.value.name,
    totalComments: state.comments.length,
    effectiveComments: relevantComments.value.length,
    noiseComments: noiseComments.value.length,
    noiseRatio,
    replyCount: state.replies.length,
    archiveCount: state.archivedReplies.length,
    riskCount: riskCount.value,
    topIntentRows,
    topHotWords,
    productRows,
    suggestions: buildReviewSuggestions(topIntentRows, noiseRatio),
  };
}

function getCommentProductKey(comment) {
  if (!comment) return "";
  if (comment.productKey && PRODUCTS[comment.productKey]) return comment.productKey;
  if (comment.relevance?.productKey && PRODUCTS[comment.relevance.productKey]) return comment.relevance.productKey;
  return inferProductKeyFromText(comment.text || "");
}

function buildReviewSuggestions(topIntentRows, noiseRatio) {
  const suggestions = [];
  const topIntent = topIntentRows[0]?.intent;
  if (topIntent) {
    suggestions.push(`下一场优先补强“${metaFor(topIntent).label}”话术，因为它是当前最集中的有效问题。`);
  }
  if (noiseRatio >= 30) {
    suggestions.push(`无关评论占比约 ${noiseRatio}%，建议直播中更明确当前讲解商品，并提示观众围绕本品提问。`);
  }
  if (state.replies.length > 0) {
    suggestions.push(`仍有 ${state.replies.length} 条待回复，建议场控先处理高优先级评论再进入下一品。`);
  }
  if (riskCount.value > 0) {
    suggestions.push(`风险质疑出现 ${riskCount.value} 条，复盘时要检查质量、售后和价格解释是否足够清晰。`);
  }
  if (suggestions.length === 0) {
    suggestions.push("当前评论结构比较健康，可以继续保持商品讲解、价格说明和互动节奏。");
  }
  return suggestions;
}

function exportReviewMarkdown() {
  const markdown = buildReviewMarkdown(reviewReport.value);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `EP-review-${formatDateForFile(new Date())}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 800);
}

function buildReviewMarkdown(report) {
  const lines = [
    `# EP 直播评论复盘报告`,
    "",
    `- 生成时间：${new Date(report.generatedAt).toLocaleString("zh-CN", { hour12: false })}`,
    `- 当前商品：${report.productName}`,
    `- 总评论：${report.totalComments}`,
    `- 有效评论：${report.effectiveComments}`,
    `- 已隔离：${report.noiseComments}（${report.noiseRatio}%）`,
    `- 待回复：${report.replyCount}`,
    `- 已归档：${report.archiveCount}`,
    `- 风险质疑：${report.riskCount}`,
    "",
    "## 意图分布",
    ...formatMarkdownRows(report.topIntentRows.map((row) => [row.label, row.value]), ["意图", "数量"]),
    "",
    "## 高频热词",
    report.topHotWords.length ? report.topHotWords.map((item) => `- ${item.word}：${item.count}`).join("\n") : "- 暂无",
    "",
    "## 商品归属",
    ...formatMarkdownRows(report.productRows.map((row) => [row.name, row.total, row.currentEffective, row.replies]), ["商品", "归属评论", "当前有效", "待回复"]),
    "",
    "## 运营建议",
    ...report.suggestions.map((item) => `- ${item}`),
    "",
  ];
  return lines.join("\n");
}

function formatMarkdownRows(rows, header) {
  if (rows.length === 0) return ["暂无数据"];
  const divider = header.map(() => "---");
  return [
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ];
}

function collectKeywords(keywords) {
  for (const keyword of keywords) {
    if (!keyword) continue;
    state.keywordCounts[keyword] = (state.keywordCounts[keyword] || 0) + 1;
  }
}

function getRepeatedBoost(keywords) {
  const repeated = keywords.some((keyword) => (state.keywordCounts[keyword] || 0) >= 2);
  return repeated ? 1 : 0;
}

function extractKeywords(text) {
  const tokens = String(text).match(/[A-Za-z]+|\d+|[\u4e00-\u9fa5]{2,}/g) || [];
  return [...new Set(tokens.map((token) => token.trim()).filter((token) => token.length > 1 && !STOP_WORDS.has(token)))]
    .slice(0, 6);
}

function makeReason(intent, priority, replyDecision = {}) {
  const tags = Array.isArray(replyDecision.reasonTags) ? replyDecision.reasonTags.slice(0, 4) : [];
  const confidenceText = Number.isFinite(Number(replyDecision.confidence)) ? `，置信度 ${replyDecision.confidence}%` : "";
  const priorityText = priority >= 8 ? "高优先级" : priority >= 6 ? "中高优先级" : "普通优先级";
  if (intent === "price" && tags.includes("仅价格感叹")) {
    return `${priorityText}，价格感叹不构成明确咨询，观察即可${confidenceText}；依据：${tags.join("、")}`;
  }
  const base = {
    buy: "购买动作明确，适合立即引导下单",
    price: "价格和到手价是成交决策点，需要优先回应",
    size: "尺码咨询会影响决策，建议快速给判断",
    stock: "库存颜色问题容易造成流失，需要及时回应",
    logistics: "发货问题影响下单信心",
    service: "质量和售后问题需要补足信任",
    negative: "负面质疑需要优先接住情绪",
    interaction: "普通互动，可按节奏选择性回应",
  }[intent] || "需要回应";
  return tags.length > 0 ? `${priorityText}，${base}${confidenceText}；依据：${tags.join("、")}` : `${priorityText}，${base}${confidenceText}`;
}

function createReplySuggestion(intent, product, text) {
  const templates = {
    buy: `可以直接拍小黄车里的「${product.name}」，当前${product.price}，先领券再下单更划算。`,
    price: `这款${product.name}${product.price}，${product.coupon}，现在拍是本场比较合适的价格。`,
    size: `${product.name}的尺码建议：${product.specs}。如果在两个尺码之间，建议按使用场景选更舒服的一码。`,
    stock: `库存这边帮你看一下：${product.stock}。喜欢的颜色建议先拍，库存会按付款顺序锁定。`,
    logistics: `发货说明：${product.shipping}。下单后可以在订单里看物流更新。`,
    service: `售后可以放心，${product.service}。关于质量，${product.quality}。`,
    negative: `这个问题要正面回应：${product.quality}，同时${product.service}。不建议回避，可以请对方说明具体担心点。`,
    interaction: `可以感谢这位朋友，并顺手把${product.name}的核心卖点再重复一遍。`,
  };
  if (intent === "size" && /168|115|身高|体重/.test(text)) {
    return `168、115斤可以先按平时外套尺码选，想宽松拍大一码；${product.shipping}。`;
  }
  return templates[intent] || templates.interaction;
}

function loadAiLimit() {
  try {
    const stored = window.localStorage?.getItem(AI_LIMIT_STORAGE_KEY);
    return normalizeAiLimit(stored ?? DEFAULT_AI_LIMIT);
  } catch {
    return DEFAULT_AI_LIMIT;
  }
}

function saveAiLimit(value) {
  try {
    window.localStorage?.setItem(AI_LIMIT_STORAGE_KEY, String(value));
  } catch {
    // localStorage may be unavailable in restricted browser contexts.
  }
}

function startWorkspacePersistence() {
  if (stopWorkspacePersistence) return;
  stopWorkspacePersistence = watch(
    () => serializeWorkspaceState(),
    (snapshot) => {
      saveWorkspaceState(snapshot);
    },
    { deep: true },
  );
}

function serializeWorkspaceState() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    productKey: state.productKey,
    speed: state.speed,
    nextId: state.nextId,
    aiEnabled: state.ai.enabled,
    aiLimit: state.ai.maxRequestsPerSession,
    comments: state.comments.map(serializeComment),
    replies: state.replies.map(serializeReply),
    archivedReplies: state.archivedReplies.map(serializeReply),
    alerts: state.alerts.map((alert) => ({ type: alert.type, text: alert.text })),
    keywordCounts: { ...state.keywordCounts },
    intentCounts: { ...state.intentCounts },
  };
}

function serializeComment(comment) {
  return {
    ...comment,
    timestamp: serializeDate(comment.timestamp),
  };
}

function serializeReply(reply) {
  return {
    ...reply,
    timestamp: serializeDate(reply.timestamp),
    archivedAt: reply.archivedAt ? serializeDate(reply.archivedAt) : null,
    revisionHistory: (reply.revisionHistory || []).map((item) => ({
      ...item,
      timestamp: serializeDate(item.timestamp),
    })),
  };
}

function saveWorkspaceState(snapshot = serializeWorkspaceState()) {
  try {
    window.localStorage?.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage can be full or disabled; the live dashboard should keep working.
  }
}

function restoreWorkspaceState() {
  let parsed = null;
  try {
    const raw = window.localStorage?.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return;
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  if (!parsed || parsed.version !== 1) return;

  state.productKey = PRODUCTS[parsed.productKey] ? parsed.productKey : state.productKey;
  const comments = Array.isArray(parsed.comments) ? parsed.comments.map(reviveComment) : [];
  const replies = Array.isArray(parsed.replies) ? parsed.replies.map(reviveReply) : [];
  const archivedReplies = Array.isArray(parsed.archivedReplies) ? parsed.archivedReplies.map(reviveReply) : [];

  state.comments = comments;
  state.replies = replies;
  state.archivedReplies = archivedReplies;
  state.alerts = Array.isArray(parsed.alerts)
    ? parsed.alerts.map((alert) => ({ type: String(alert.type || "warn"), text: String(alert.text || "") })).filter((alert) => alert.text)
    : [];
  state.keywordCounts = parsed.keywordCounts && typeof parsed.keywordCounts === "object" ? { ...parsed.keywordCounts } : {};
  state.intentCounts = { ...createIntentCounts(), ...(parsed.intentCounts || {}) };
  state.speed = normalizeSpeed(parsed.speed);
  state.ai.enabled = typeof parsed.aiEnabled === "boolean" ? parsed.aiEnabled : state.ai.enabled;
  state.ai.maxRequestsPerSession = normalizeAiLimit(parsed.aiLimit ?? state.ai.maxRequestsPerSession);
  state.manualText = "";
  state.selectedReplyIds = new Set();
  state.ai.pendingIds = new Set();
  state.ai.requestedIds = new Set();

  const maxId = Math.max(0, ...state.comments.map((item) => Number(item.id) || 0), ...state.replies.map((item) => Number(item.id) || 0), ...state.archivedReplies.map((item) => Number(item.id) || 0));
  state.nextId = Math.max(normalizePositiveInteger(parsed.nextId, 1), maxId + 1);
  syncSelectedReplyIds();
}

function clearWorkspaceState() {
  try {
    window.localStorage?.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

function reviveComment(comment) {
  const productKey = PRODUCTS[comment.productKey] ? comment.productKey : inferProductKeyFromText(comment.text || "");
  const relevance = comment.relevance && typeof comment.relevance === "object"
    ? reviveRelevance(comment.relevance)
    : evaluateProductRelevance(comment.text || "", state.productKey, productKey);
  return {
    id: comment.id,
    user: String(comment.user || "观众"),
    text: String(comment.text || ""),
    source: String(comment.source || "历史记录"),
    productKey,
    timestamp: reviveDate(comment.timestamp),
    relevance,
    analysis: reviveAnalysis(comment.analysis),
  };
}

function reviveRelevance(relevance) {
  return {
    related: Boolean(relevance.related),
    score: Number(relevance.score) || 0,
    reason: String(relevance.reason || ""),
    matchedKeywords: Array.isArray(relevance.matchedKeywords) ? relevance.matchedKeywords.map(String).slice(0, 5) : [],
  };
}

function reviveAnalysis(analysis) {
  const intent = analysis?.intent && INTENT_META[analysis.intent] ? analysis.intent : "interaction";
  const priority = Math.max(1, Math.min(10, Number(analysis?.priority) || 1));
  const decisionType = analysis?.decisionType && DECISION_TYPE_META[analysis.decisionType] ? analysis.decisionType : inferDecisionTypeFromIntent(intent);
  const confidence = Math.max(0, Math.min(100, Number(analysis?.confidence) || confidenceForPriority(priority)));
  return {
    intent,
    sentiment: String(analysis?.sentiment || "neutral"),
    priority,
    replyScore: Math.max(priority, Number(analysis?.replyScore) || priority),
    decisionType,
    confidence,
    matchedSignals: Array.isArray(analysis?.matchedSignals) ? analysis.matchedSignals.map(String).slice(0, 6) : [],
    keywords: Array.isArray(analysis?.keywords) ? analysis.keywords.map(String).slice(0, 8) : [],
    needsReply: Boolean(analysis?.needsReply),
    urgencyLabel: String(analysis?.urgencyLabel || urgencyLabelForPriority(priority)),
    reason: String(analysis?.reason || "历史记录恢复"),
  };
}

function reviveReply(reply) {
  const priority = Math.max(1, Math.min(10, Number(reply.priority) || 1));
  const intent = reply.intent && INTENT_META[reply.intent] ? reply.intent : "interaction";
  const decisionType = reply.decisionType && DECISION_TYPE_META[reply.decisionType] ? reply.decisionType : inferDecisionTypeFromIntent(intent);
  const confidence = Math.max(0, Math.min(100, Number(reply.confidence) || confidenceForPriority(priority)));
  return {
    id: reply.id,
    question: String(reply.question || ""),
    user: String(reply.user || "观众"),
    intent,
    priority,
    replyScore: Math.max(priority, Number(reply.replyScore) || priority),
    decisionType,
    confidence,
    matchedSignals: Array.isArray(reply.matchedSignals) ? reply.matchedSignals.map(String).slice(0, 6) : [],
    urgencyLabel: String(reply.urgencyLabel || urgencyLabelForPriority(priority)),
    reason: String(reply.reason || "历史记录恢复"),
    replySuggestion: String(reply.replySuggestion || ""),
    templateSuggestion: String(reply.templateSuggestion || reply.replySuggestion || ""),
    source: reply.source === "ai" ? "ai" : "template",
    aiStatus: reply.aiStatus === "loading" ? "idle" : String(reply.aiStatus || "idle"),
    aiError: "",
    revisionDraft: "",
    revisionStatus: reply.revisionStatus === "loading" ? "idle" : String(reply.revisionStatus || "idle"),
    revisionError: "",
    revisionHistory: Array.isArray(reply.revisionHistory) ? reply.revisionHistory.map(reviveRevisionHistoryItem) : [],
    timestamp: reviveDate(reply.timestamp),
    answered: Boolean(reply.answered),
    archivedAt: reply.archivedAt ? reviveDate(reply.archivedAt) : null,
  };
}

function reviveRevisionHistoryItem(item, index) {
  return {
    round: Number(item.round) || index + 1,
    instruction: String(item.instruction || "历史修改"),
    text: String(item.text || ""),
    timestamp: reviveDate(item.timestamp),
  };
}

function serializeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function reviveDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeSpeed(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return 1600;
  return Math.max(700, Math.min(3500, number));
}

function normalizePositiveInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return number;
}

function normalizeAiLimit(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return DEFAULT_AI_LIMIT;
  return Math.max(0, Math.min(200, number));
}

function normalize(text) {
  return String(text).toLowerCase().replace(/\s+/g, "");
}

function updateClock() {
  state.clockText = formatTime(new Date());
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function metaFor(intent) {
  return INTENT_META[intent] || INTENT_META.interaction;
}

function decisionMetaFor(decisionType) {
  return DECISION_TYPE_META[decisionType] || DECISION_TYPE_META.interaction;
}

function productNameForComment(comment) {
  if (comment.productKey && PRODUCTS[comment.productKey]) return PRODUCTS[comment.productKey].name;
  if (comment.relevance?.productKey && PRODUCTS[comment.relevance.productKey]) return PRODUCTS[comment.relevance.productKey].name;
  return "当前场景";
}

function priorityClass(priority) {
  if (priority >= 8) return "danger";
  if (priority >= 6) return "warn";
  return "";
}

function confidenceClass(confidence) {
  if (confidence >= 85) return "danger";
  if (confidence >= 65) return "warn";
  return "";
}

function urgencyLabelForPriority(priority) {
  if (priority >= 8) return "及时回复";
  if (priority >= 6) return "建议回复";
  return "观察即可";
}

function confidenceForPriority(priority) {
  if (priority >= 8) return 85;
  if (priority >= 6) return 70;
  if (priority >= 1) return 35;
  return 0;
}

function inferDecisionTypeFromIntent(intent) {
  if (intent === "price") return "price";
  if (intent === "service") return "afterSale";
  if (["stock", "logistics"].includes(intent)) return "fulfillment";
  if (intent === "size") return "fit";
  if (intent === "buy") return "purchase";
  if (intent === "negative") return "risk";
  return "interaction";
}

function revisionButtonText(reply) {
  return reply.revisionStatus === "loading" ? "修改中" : "修改话术";
}

function getReplySourceLabel(reply) {
  if (reply.aiStatus === "loading") return "AI生成中";
  if (reply.source === "ai") return "AI增强";
  if (reply.aiStatus === "failed") return "模板兜底";
  return "模板";
}

function getReplySourceClass(reply) {
  if (reply.source === "ai") return "ai";
  if (reply.aiStatus === "failed") return "failed";
  return "";
}


  function mount() {
    state.ai.maxRequestsPerSession = loadAiLimit();
    restoreWorkspaceState();
    startWorkspacePersistence();
    updateClock();
    state.clockTimer = window.setInterval(updateClock, 1000);
    checkAiStatus();
  }

  function dispose() {
    stopStream();
    if (state.clockTimer) {
      window.clearInterval(state.clockTimer);
      state.clockTimer = null;
    }
    if (stopWorkspacePersistence) {
      stopWorkspacePersistence();
      stopWorkspacePersistence = null;
    }
  }

  return {
    sharedBindings,
    mount,
    dispose,
    handleAiToggle,
    resetStream,
    toggleStream,
    updateAiLimit,
    updateSpeed,
  };
}

const liveCommentRuntime = createLiveCommentRuntime();

export function useLiveCommentRuntime() {
  return liveCommentRuntime;
}
