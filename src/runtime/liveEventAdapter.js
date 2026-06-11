const TEXT_FIELDS = ["comment", "content", "text", "message", "msg", "danmu", "弹幕", "评论", "评论内容", "内容"];
const USER_FIELDS = ["nickname", "user", "username", "name", "displayName", "uniqueId", "uname", "观众", "用户", "昵称"];
const PRODUCT_FIELDS = ["product", "productName", "item", "itemName", "goods", "sku", "商品", "商品名称", "产品"];
const SOURCE_FIELDS = ["source", "platform", "room", "live", "来源", "平台", "直播间"];
const EVENT_TYPE_FIELDS = ["event", "eventType", "type", "cmd", "msgType"];

export function normalizeLiveEvent(input, options = {}) {
  if (!input || typeof input !== "object") return null;
  const findProductKeyByName = options.findProductKeyByName || (() => "");
  const text = pickValue(input, TEXT_FIELDS);
  if (!text) return null;

  const productName = pickValue(input, PRODUCT_FIELDS);
  const source = pickValue(input, SOURCE_FIELDS) || inferEventSource(input);
  return {
    text,
    user: pickValue(input, USER_FIELDS) || "观众",
    source,
    productKey: findProductKeyByName(productName),
    eventType: pickValue(input, EVENT_TYPE_FIELDS) || "comment",
  };
}

export function normalizeLiveEvents(input, options = {}) {
  const items = Array.isArray(input) ? input : [input];
  return items.map((item) => normalizeLiveEvent(item, options)).filter(Boolean);
}

function pickValue(input, names) {
  for (const name of names) {
    const direct = readField(input, name);
    if (direct) return direct;
  }
  for (const value of Object.values(input)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = pickValue(value, names);
      if (nested) return nested;
    }
  }
  return "";
}

function readField(input, name) {
  const normalizedName = normalizeKey(name);
  for (const [key, value] of Object.entries(input)) {
    if (normalizeKey(key) !== normalizedName) continue;
    if (value === undefined || value === null) return "";
    if (typeof value === "object") return "";
    return String(value).trim();
  }
  return "";
}

function inferEventSource(input) {
  const eventType = pickValue(input, EVENT_TYPE_FIELDS).toLowerCase();
  if (eventType.includes("danmu") || eventType.includes("bilibili")) return "B站弹幕事件";
  if (eventType.includes("tiktok")) return "TikTok Live事件";
  if (eventType.includes("douyin")) return "抖音直播事件";
  return "实时事件";
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}
