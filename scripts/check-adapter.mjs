import { normalizeLiveEvent, normalizeLiveEvents } from "../src/runtime/liveEventAdapter.js";
import { findProductKeyByName } from "../src/runtime/filterStrategy.js";
import { PRODUCTS } from "../src/runtime/productCatalog.js";

const findProduct = (value) => findProductKeyByName(value, PRODUCTS);

const cases = [
  {
    name: "TikTokLive 风格评论事件",
    input: {
      eventType: "tiktok_comment",
      comment: "券后多少钱？",
      user: { nickname: "晴天" },
      productName: "316 保温杯",
    },
    expect: { text: "券后多少钱？", user: "晴天", productKey: "cup", eventType: "tiktok_comment" },
  },
  {
    name: "B站弹幕风格事件",
    input: {
      cmd: "DANMU_MSG",
      info: { uname: "海盐" },
      danmu: "今天能发货吗？",
      itemName: "轻薄防晒衣",
    },
    expect: { text: "今天能发货吗？", user: "海盐", productKey: "suncoat", eventType: "DANMU_MSG" },
  },
  {
    name: "采集脚本嵌套用户字段",
    input: {
      type: "comment",
      message: "小白鞋第几个链接？",
      author: { name: "北北" },
      goods: "百搭小白鞋",
      source: "本地WebSocket",
    },
    expect: { text: "小白鞋第几个链接？", user: "北北", productKey: "sneaker", source: "本地WebSocket" },
  },
];

const failures = [];

for (const item of cases) {
  const actual = normalizeLiveEvent(item.input, { findProductKeyByName: findProduct });
  if (!matchesExpected(actual, item.expect)) {
    failures.push({ name: item.name, actual, expected: item.expect });
  }
}

const batch = normalizeLiveEvents(cases.map((item) => item.input), { findProductKeyByName: findProduct });
if (batch.length !== cases.length) {
  failures.push({ name: "批量事件规范化", actual: batch.length, expected: cases.length });
}

if (failures.length > 0) {
  console.error("Live event adapter check failed:");
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Live event adapter check passed: ${cases.length} scenarios`);
}

function matchesExpected(actual, expected) {
  if (!actual) return false;
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}
