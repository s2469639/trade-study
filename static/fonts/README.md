# 폰트 넣는 곳

눈누 등에서 받은 폰트 파일의 **이름을 아래처럼 바꿔서** 이 폴더에 넣으면 자동으로 적용돼요.
(확장자는 `.woff2` 또는 `.ttf` 둘 다 가능)

| 파일 이름 | 쓰이는 곳 | 추천 |
|---|---|---|
| `title.woff2` / `title.ttf` | 큰 제목, 메뉴, 버튼 | 배민 주아체 등 통통한 폰트 |
| `label.woff2` / `label.ttf` | 낙서풍 라벨, 태그, 메모 | 오뮤 다예쁨체, 온글잎 등 손글씨 |
| `body.woff2` / `body.ttf` | 본문(긴 글) | 프리텐다드, 에스코어 드림 |

파일이 없으면 인터넷의 Jua / Gaegu / Pretendard로 대신 보여줘요.
폰트를 바꾸고 싶으면 `static/css/style.css` 맨 위 `:root` 의 `--font-title`, `--font-label`, `--font-body` 를 고치세요.
