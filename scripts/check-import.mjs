import { parseImportedRows } from "../src/runtime/importParser.js";
import { findProductKeyByName } from "../src/runtime/filterStrategy.js";
import { PRODUCTS } from "../src/runtime/productCatalog.js";

const findProduct = (value) => findProductKeyByName(value, PRODUCTS);

const cases = [
  {
    name: "CSV 标准字段",
    input: [
      "user,product,comment",
      "小鹿,轻薄防晒衣,身高168体重115选什么码？",
      "海盐,316 保温杯,杯盖漏水可以退换吗？",
    ].join("\n"),
    expect: [
      { text: "身高168体重115选什么码？", user: "小鹿", productKey: "suncoat" },
      { text: "杯盖漏水可以退换吗？", user: "海盐", productKey: "cup" },
    ],
  },
  {
    name: "中文平台导出字段",
    input: [
      "昵称,商品名称,评论内容,来源",
      "北北,百搭小白鞋,小白鞋多少钱？,历史直播",
    ].join("\n"),
    expect: [
      { text: "小白鞋多少钱？", user: "北北", source: "历史直播", productKey: "sneaker" },
    ],
  },
  {
    name: "TSV 消息字段",
    input: [
      "nickname\titem\tmsg",
      "晚风\t316 保温杯\t今天能发货吗？",
    ].join("\n"),
    expect: [
      { text: "今天能发货吗？", user: "晚风", productKey: "cup" },
    ],
  },
  {
    name: "JSON Lines",
    input: [
      JSON.stringify({ nickname: "晴天", productName: "轻薄防晒衣", content: "券后多少钱？", platform: "采集脚本" }),
      JSON.stringify({ user: "可可", item: "其他", message: "背景音乐叫什么？" }),
    ].join("\n"),
    expect: [
      { text: "券后多少钱？", user: "晴天", source: "采集脚本", productKey: "suncoat" },
      { text: "背景音乐叫什么？", user: "可可", productKey: "" },
    ],
  },
  {
    name: "一行一条",
    input: "小黄车第几个是这款？\n今天可以顺丰吗？",
    expect: [
      { text: "小黄车第几个是这款？" },
      { text: "今天可以顺丰吗？" },
    ],
  },
];

const failures = [];

for (const item of cases) {
  const actual = parseImportedRows(item.input, { findProductKeyByName: findProduct });
  if (!matchesExpected(actual, item.expect)) {
    failures.push({ name: item.name, actual, expected: item.expect });
  }
}

if (failures.length > 0) {
  console.error("Import parser check failed:");
  console.error(JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Import parser check passed: ${cases.length} scenarios`);
}

function matchesExpected(actual, expected) {
  if (actual.length !== expected.length) return false;
  return expected.every((expectedRow, index) =>
    Object.entries(expectedRow).every(([key, value]) => actual[index]?.[key] === value),
  );
}
