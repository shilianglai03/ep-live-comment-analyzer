const TEXT_HEADERS = ["comment", "text", "content", "message", "msg", "danmu", "弹幕", "评论", "评论内容", "内容", "消息"];
const USER_HEADERS = ["user", "nickname", "name", "username", "displayname", "观众", "用户", "昵称", "粉丝"];
const PRODUCT_HEADERS = ["product", "productname", "item", "itemname", "sku", "goods", "商品", "商品名称", "产品", "货品"];
const SOURCE_HEADERS = ["source", "platform", "room", "live", "来源", "平台", "直播间"];

export function parseImportedRows(rawText, options = {}) {
  const findProductKeyByName = options.findProductKeyByName || (() => "");
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  if (looksLikeJsonLines(lines)) {
    return parseJsonLines(lines, findProductKeyByName);
  }

  const delimiter = detectImportDelimiter(lines);
  if (!delimiter) {
    return lines.map((line) => ({ text: line })).filter((row) => row.text.length > 0);
  }

  const rows = lines.map((line) => parseDelimitedLine(line, delimiter));
  const header = rows[0].map((cell) => normalizeHeader(cell));
  const hasHeader = header.some((cell) => TEXT_HEADERS.includes(cell));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const indexes = hasHeader ? getImportHeaderIndexes(header) : { text: rows[0].length - 1, user: 0, product: 1, source: -1 };

  return dataRows.map((cells) => rowFromCells(cells, indexes, findProductKeyByName)).filter(Boolean);
}

export function detectImportDelimiter(lines) {
  const sample = lines.slice(0, 3).join("\n");
  if (sample.includes("\t")) return "\t";
  if (sample.includes(",")) return ",";
  return "";
}

export function parseDelimitedLine(line, delimiter) {
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

function parseJsonLines(lines, findProductKeyByName) {
  return lines
    .map((line) => {
      try {
        const item = JSON.parse(line);
        if (!item || typeof item !== "object") return null;
        const text = firstField(item, TEXT_HEADERS);
        if (!text) return null;
        const productName = firstField(item, PRODUCT_HEADERS);
        return {
          text,
          user: firstField(item, USER_HEADERS),
          source: firstField(item, SOURCE_HEADERS),
          productKey: findProductKeyByName(productName),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function looksLikeJsonLines(lines) {
  return lines.length > 0 && lines.every((line) => line.startsWith("{") && line.endsWith("}"));
}

function rowFromCells(cells, indexes, findProductKeyByName) {
  const text = String(cells[indexes.text] || cells[cells.length - 1] || "").trim();
  if (!text) return null;
  const user = indexes.user >= 0 ? String(cells[indexes.user] || "").trim() : "";
  const productName = indexes.product >= 0 ? String(cells[indexes.product] || "").trim() : "";
  const source = indexes.source >= 0 ? String(cells[indexes.source] || "").trim() : "";
  return {
    text,
    user,
    source,
    productKey: findProductKeyByName(productName),
  };
}

function getImportHeaderIndexes(header) {
  return {
    text: findHeaderIndex(header, TEXT_HEADERS),
    user: findHeaderIndex(header, USER_HEADERS),
    product: findHeaderIndex(header, PRODUCT_HEADERS),
    source: findHeaderIndex(header, SOURCE_HEADERS),
  };
}

function findHeaderIndex(header, names) {
  return header.findIndex((cell) => names.includes(cell));
}

function firstField(item, names) {
  const lowered = Object.fromEntries(Object.entries(item).map(([key, value]) => [normalizeHeader(key), value]));
  for (const name of names) {
    const value = lowered[normalizeHeader(name)];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
}
