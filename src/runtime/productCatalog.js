export const DEFAULT_PRODUCTS = {
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

export const PRODUCTS = cloneProductMap(DEFAULT_PRODUCTS);

export const PRODUCT_FILTER_PROFILES = {
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

export function getProductByKey(productKey) {
  return PRODUCTS[productKey] || null;
}

export function getProductEntries() {
  return Object.entries(PRODUCTS);
}

export function cloneProduct(product) {
  return {
    ...product,
    relevanceKeywords: Array.isArray(product?.relevanceKeywords) ? [...product.relevanceKeywords] : [],
  };
}

export function cloneProductMap(products) {
  return Object.fromEntries(Object.entries(products).map(([key, product]) => [key, cloneProduct(product)]));
}
