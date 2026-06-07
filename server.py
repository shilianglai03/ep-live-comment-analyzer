from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DIST_ROOT = ROOT / "dist"
DEFAULT_CONFIG_PATH = Path("..") / "api.json"
HOST = os.getenv("EP_HOST", "127.0.0.1")
PORT = int(os.getenv("EP_PORT", "8765"))
CONFIG = {}
CONFIG_SOURCE = ""
API_BASE = "https://api.openai.com/v1"
API_KEY = ""
MODEL = "gpt-4o-mini"
TIMEOUT = 30


def load_runtime_config() -> None:
    global API_BASE, API_KEY, MODEL, TIMEOUT, CONFIG, CONFIG_SOURCE

    config_path = resolve_config_path(os.getenv("EP_AI_CONFIG", str(DEFAULT_CONFIG_PATH)))
    if config_path.exists():
        CONFIG = read_config_file(config_path)
        CONFIG_SOURCE = str(config_path)

    API_BASE = first_text(
        os.getenv("EP_AI_API_BASE"),
        config_value(CONFIG, "apiBase", "api_base", "baseUrl", "base_url", "url", "endpoint"),
        "https://api.openai.com/v1",
    ).rstrip("/")
    API_KEY = first_text(
        os.getenv("EP_AI_API_KEY"),
        config_value(CONFIG, "apiKey", "api_key", "key", "token", "secret"),
        "",
    )
    MODEL = first_text(
        os.getenv("EP_AI_MODEL"),
        config_value(CONFIG, "model", "modelName", "model_name"),
        "gpt-4o-mini",
    )
    TIMEOUT = int(
        first_text(
            os.getenv("EP_AI_TIMEOUT"),
            config_value(CONFIG, "timeout", "timeoutSeconds", "timeout_seconds"),
            "30",
        )
    )


def read_config_file(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError(f"{path} 必须是 JSON 对象。")
    return data


def resolve_config_path(value: str) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return (ROOT / path).resolve()


def config_value(config: dict[str, Any], *names: str) -> str:
    lowered = {key.lower(): value for key, value in config.items()}
    for name in names:
        value = config.get(name)
        if value is None:
            value = lowered.get(name.lower())
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def first_text(*values: str | None) -> str:
    for value in values:
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


class EPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        static_root = DIST_ROOT if (DIST_ROOT / "index.html").exists() else ROOT
        super().__init__(*args, directory=str(static_root), **kwargs)

    def guess_type(self, path: str) -> str:
        suffix = Path(path).suffix.lower()
        if suffix in {".js", ".mjs"}:
            return "application/javascript; charset=utf-8"
        if suffix == ".css":
            return "text/css; charset=utf-8"
        if suffix == ".html":
            return "text/html; charset=utf-8"
        return super().guess_type(path)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        if self.path == "/api/status":
            self._send_json(
                {
                    "configured": bool(API_KEY),
                    "model": MODEL,
                    "apiBase": describe_api_base(API_BASE),
                    "configSource": mask_config_source(CONFIG_SOURCE),
                }
            )
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path not in {"/api/reply", "/api/revise"}:
            self.send_error(404, "Not found")
            return

        if not API_KEY:
            self._send_json(
                {
                    "error": "missing_api_key",
                    "message": "请先设置 EP_AI_API_KEY 环境变量，再启动 server.py。",
                },
                status=400,
            )
            return

        try:
            payload = self._read_json()
            if self.path == "/api/revise":
                reply = revise_ai_reply(payload)
            else:
                reply = request_ai_reply(payload)
        except ValueError as exc:
            self._send_json({"error": "bad_request", "message": str(exc)}, status=400)
            return
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            self._send_json(
                {
                    "error": "provider_http_error",
                    "message": f"AI API 返回 HTTP {exc.code}",
                    "detail": detail[:800],
                },
                status=502,
            )
            return
        except urllib.error.URLError as exc:
            self._send_json(
                {"error": "provider_network_error", "message": str(exc.reason)},
                status=502,
            )
            return
        except Exception as exc:  # Keep the browser from seeing a Python traceback.
            self._send_json({"error": "server_error", "message": str(exc)}, status=500)
            return

        self._send_json({"reply": reply, "source": "ai", "model": MODEL})

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 12000:
            raise ValueError("请求体为空或过大。")
        raw = self.rfile.read(length).decode("utf-8")
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise ValueError("请求体必须是 JSON 对象。")
        return data

    def _send_json(self, payload: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[EP] {self.address_string()} - {format % args}")


def request_ai_reply(payload: dict[str, Any]) -> str:
    comment = require_text(payload, "comment", max_len=500)
    intent = require_text(payload, "intentLabel", max_len=60)
    product = payload.get("product") or {}
    product_name = str(product.get("name") or "当前商品")[:80]
    product_facts = compact_product_facts(product)
    recent_comments = payload.get("recentComments") or []
    recent_text = "\n".join(f"- {str(item)[:120]}" for item in recent_comments[:8])

    system_prompt = (
        "你是直播带货场控助手。你的任务是给主播一条自然、短促、可信的回复参考。"
        "回复必须适合直播间口播，不能承诺未提供的信息，不能夸大功效，不能攻击用户。"
        "如果是负面质疑，要先接住情绪，再给事实和售后兜底。"
        "输出只给主播可说的话术本身，不要解释。"
    )
    user_prompt = f"""
当前商品：{product_name}
商品信息：
{product_facts}

评论意图：{intent}
观众评论：{comment}

近期评论摘要：
{recent_text or "- 暂无"}

请生成 1 条直播间回复参考，要求：
1. 口语化，像主播或场控现场说的话；
2. 35 到 90 个中文字符；
3. 优先解决观众的真实疑问；
4. 可以适度引导下单，但不要硬广和机械模板。
""".strip()

    return call_chat_completion(system_prompt, user_prompt, temperature=0.75, max_tokens=180)


def revise_ai_reply(payload: dict[str, Any]) -> str:
    comment = require_text(payload, "comment", max_len=500)
    current_reply = require_text(payload, "currentReply", max_len=500)
    instruction = require_text(payload, "revisionInstruction", max_len=300)
    intent = str(payload.get("intentLabel") or "待回复评论")[:60]
    product = payload.get("product") or {}
    product_name = str(product.get("name") or "当前商品")[:80]
    product_facts = compact_product_facts(product)
    revision_history = payload.get("revisionHistory") or []
    history_text = "\n".join(
        f"- 第{index + 1}版：{str(item.get('text') if isinstance(item, dict) else item)[:140]}"
        for index, item in enumerate(revision_history[:5])
    )

    system_prompt = (
        "你是直播带货场控话术编辑。你的任务是在不改变商品事实的前提下，"
        "根据用户的修改要求，重写当前回复。输出只能是主播可直接说的话术。"
        "不要解释修改过程，不要输出列表，不要承诺未提供的信息。"
    )
    user_prompt = f"""
当前商品：{product_name}
商品信息：
{product_facts}

评论意图：{intent}
观众原始问题：{comment}
当前回复：{current_reply}
历史版本：
{history_text or "- 暂无"}

本轮修改要求：{instruction}

请给出修改后的直播间回复，要求：
1. 口语化，适合主播或场控现场直接说；
2. 35 到 90 个中文字符；
3. 保留必要事实，不添加未提供的承诺；
4. 根据修改要求调整语气、长度、重点或促单强度。
""".strip()

    return call_chat_completion(system_prompt, user_prompt, temperature=0.7, max_tokens=180)


def call_chat_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> str:
    api_payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    request = urllib.request.Request(
        f"{API_BASE}/chat/completions",
        data=json.dumps(api_payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        raw = response.read().decode("utf-8")
    data = json.loads(raw)
    text = extract_reply_text(data)
    return clean_reply(text)


def compact_product_facts(product: dict[str, Any]) -> str:
    labels = {
        "price": "价格",
        "coupon": "优惠",
        "specs": "规格",
        "stock": "库存",
        "shipping": "发货",
        "service": "售后",
        "quality": "卖点",
    }
    lines = []
    for key, label in labels.items():
        value = str(product.get(key) or "").strip()
        if value:
            lines.append(f"- {label}：{value[:160]}")
    return "\n".join(lines) or "- 暂无商品信息"


def extract_reply_text(data: dict[str, Any]) -> str:
    choices = data.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ValueError("AI API 响应缺少 choices。")
    first = choices[0]
    if not isinstance(first, dict):
        raise ValueError("AI API 响应格式不正确。")
    message = first.get("message")
    if isinstance(message, dict) and message.get("content"):
        return str(message["content"])
    if first.get("text"):
        return str(first["text"])
    raise ValueError("AI API 响应缺少回复文本。")


def clean_reply(text: str) -> str:
    reply = " ".join(text.strip().split())
    if reply.startswith(("主播可以说：", "回复：", "话术：")):
        reply = reply.split("：", 1)[1].strip()
    return reply.strip("\"'“”")[:220]


def require_text(payload: dict[str, Any], key: str, max_len: int) -> str:
    value = str(payload.get(key) or "").strip()
    if not value:
        raise ValueError(f"缺少字段：{key}")
    return value[:max_len]


def mask_api_base(api_base: str) -> str:
    parsed = urlparse(api_base)
    if not parsed.netloc:
        return "custom"
    return f"{parsed.scheme}://{parsed.netloc}"


def describe_api_base(api_base: str) -> str:
    parsed = urlparse(api_base)
    host = parsed.netloc.lower()
    if host in {"api.openai.com", "openai.com"}:
        return "OpenAI 官方接口"
    if host:
        return "国内中转站"
    return "自定义兼容接口"


def mask_config_source(source: str) -> str:
    if not source:
        return "environment/defaults"
    path = Path(source)
    return str(path.name)


def main() -> None:
    load_runtime_config()
    server = ThreadingHTTPServer((HOST, PORT), EPHandler)
    print(f"EP server running: http://{HOST}:{PORT}")
    if API_KEY:
        print(f"AI status: configured from {mask_config_source(CONFIG_SOURCE)}")
    else:
        print(f"AI status: template fallback, no key found in {DEFAULT_CONFIG_PATH.as_posix()}")
    server.serve_forever()


if __name__ == "__main__":
    main()
