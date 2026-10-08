# 🚢 무역공부노트 (trade_study)

해외영업 취업 준비를 위한 **나 혼자 쓰는** 공부 웹페이지. Flask + 순수 HTML/CSS/JS, 로그인·DB 없음.

## 실행

```bash
cd trade_study
pip install -r requirements.txt
python app.py        # → http://127.0.0.1:5000
```

## 메뉴

| 메뉴 | 내용 |
|---|---|
| 🏠 홈 | 오늘의 용어, 한 줄 기록, 할 일, 모르는 것 |
| 🏭 산업 | 개요·구조·제품·기업·시장·이슈·내 메모 (샘플: 반도체/2차전지/자동차) |
| 🏢 기업 | 사업부문·해외사업·경쟁사·채용공고 분석·메모, 기업 직접 추가 |
| 🚢 무역 | 프로세스·서류·결제·운송·통관·용어집(외웠어요 체크)·사례 |
| 📰 뉴스 | 요약 / 배경지식 / 왜 중요한가 3칸 정리, 모르는 용어 자동 저장 |
| ✍️ 글쓰기 | 사설 정리, 내 글+글자수, 셀프 체크리스트, 표현 노트 |
| 🎤 해외영업 | 공통/산업별/기업별 질문, 랜덤 뽑기+1분 타이머, 설명해보기 |
| 📒 기록 | 전체 타임라인, 산업·기업별 모아보기, 모르는 것, 백업/불러오기 |

## 폴더 구조

```
trade_study/
├─ app.py          # 화면 주소(라우트)와 저장 API
├─ storage.py      # 데이터 읽기/쓰기 (나중에 DB로 바꿀 때 이 파일만 수정)
├─ templates/      # 화면(HTML). base.html = 공통 틀, 메뉴당 파일 1개
├─ static/
│  ├─ css/style.css   # 디자인 (색·폰트는 맨 위 :root)
│  ├─ js/app.js       # 공통 동작 (탭, 저장, 삭제, 필터)
│  └─ fonts/          # 내 폰트 넣는 곳 → fonts/README.md
└─ data/
   ├─ *.json          # 샘플 데이터 (직접 고치면 화면에 반영)
   └─ user/           # 내가 저장한 기록 (git 제외)
```

## 자주 하는 수정

- **샘플 데이터 고치기/늘리기**: `data/industries.json`, `companies.json`, `trade.json`, `interview.json`을 열어 같은 모양으로 추가.
- **색 바꾸기**: `static/css/style.css` 맨 위 `:root`의 `--yellow`, `--sky`, `--blue`.
- **폰트 바꾸기**: `static/fonts/README.md` 참고.
- **새 기록 종류 추가**: `storage.py`의 `COLLECTIONS`에 이름 추가 → HTML 폼에 `data-collection="이름"`.

## 알아둘 점

- 샘플 데이터는 **공부 출발점용**이고 `샘플` 표시가 붙어 있어요. 면접에서 쓸 사실은 반드시 직접 확인해서 고쳐 쓰기.
- 내 기록은 `data/user/*.json`에 저장돼요. 📒 기록 → 💾 백업 탭에서 파일로 받아둘 수 있어요.
