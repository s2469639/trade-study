"""환율 가져오기 (ExchangeRate-API v6).

- 키(EXCHANGE_API_KEY)는 .env 에만 두고, 이 파일(서버)에서만 사용해요. 화면(브라우저)에는 절대 안 보내요.
- 무료 요금제는 호출 횟수가 한정돼 있어서 결과를 data/cache/ 에 저장해 두고 6시간 동안 재사용해요.
- 인터넷이 안 되거나 한도가 끝나면 마지막으로 저장된 값을 '오래된 데이터'로 보여줘요.
"""
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

CACHE_DIR = Path(__file__).parent / "data" / "cache"
TTL = 6 * 3600

# 화면에 보여줄 주요 통화 (무역에서 자주 쓰는 것 위주)
CURRENCIES = [
    ("USD", "미국 달러"), ("EUR", "유로"), ("JPY", "일본 엔"), ("CNY", "중국 위안"), ("VND", "베트남 동"),
    ("INR", "인도 루피"), ("IDR", "인도네시아 루피아"), ("THB", "태국 바트"), ("SGD", "싱가포르 달러"),
    ("GBP", "영국 파운드"), ("AUD", "호주 달러"), ("CAD", "캐나다 달러"), ("HKD", "홍콩 달러"),
    ("TWD", "대만 달러"), ("MYR", "말레이시아 링깃"), ("AED", "UAE 디르함"), ("SAR", "사우디 리얄"),
    ("MXN", "멕시코 페소"), ("BRL", "브라질 헤알"), ("TRY", "튀르키예 리라"), ("KRW", "한국 원"),
]

ERRORS = {
    "invalid-key": "환율 API 키가 올바르지 않아요. .env 의 EXCHANGE_API_KEY 를 확인해 주세요.",
    "inactive-account": "환율 API 계정 이메일 인증이 아직 안 된 것 같아요.",
    "quota-reached": "이번 달 환율 API 호출 한도를 다 썼어요.",
}


def load_env(path=None):
    """.env 파일의 KEY=값 을 환경변수로 읽어요. (python-dotenv 없이 동작하는 아주 작은 버전)"""
    path = Path(path or Path(__file__).parent / ".env")
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def _cache_path():
    return CACHE_DIR / "rates_USD.json"


def _read_cache():
    try:
        return json.loads(_cache_path().read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _fetch(key):
    url = f"https://v6.exchangerate-api.com/v6/{key}/latest/USD"
    with urllib.request.urlopen(url, timeout=8) as res:     # 오류 메시지에 키가 섞이지 않게 아래에서 직접 처리
        return json.loads(res.read().decode("utf-8"))


def get_rates():
    """{ok, rates, updated, stale, error, currencies} 를 돌려줘요. rates 는 USD 기준 (1달러 = ? 통화)."""
    cached = _read_cache()
    names = [{"code": c, "name": n} for c, n in CURRENCIES]

    if cached and time.time() - cached["fetched"] < TTL:
        return {"ok": True, "rates": cached["rates"], "updated": cached["updated"], "stale": False, "currencies": names}

    key = os.environ.get("EXCHANGE_API_KEY", "").strip()
    error = None
    if not key:
        error = "환율 API 키가 없어요. .env 파일에 EXCHANGE_API_KEY=내키 를 넣어 주세요."
    else:
        try:
            data = _fetch(key)
            if data.get("result") == "success":
                wanted = {c for c, _ in CURRENCIES}
                rates = {k: v for k, v in data["conversion_rates"].items() if k in wanted}
                payload = {"fetched": time.time(), "rates": rates, "updated": data.get("time_last_update_utc", "")}
                CACHE_DIR.mkdir(parents=True, exist_ok=True)
                _cache_path().write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
                return {"ok": True, "rates": rates, "updated": payload["updated"], "stale": False, "currencies": names}
            error = ERRORS.get(data.get("error-type"), "환율 API가 오류를 돌려줬어요.")
        except urllib.error.HTTPError as e:
            error = "환율 API 요청에 실패했어요 (HTTP %s)." % e.code
        except Exception:
            error = "환율 API에 연결하지 못했어요. 인터넷 연결을 확인해 주세요."

    if cached:   # 새로 못 가져오면 마지막 값이라도 보여주기
        return {"ok": True, "rates": cached["rates"], "updated": cached["updated"], "stale": True,
                "error": error, "currencies": names}
    return {"ok": False, "error": error, "currencies": names}
