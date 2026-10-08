# 폰트 넣는 곳

기본 폰트는 **그린 심심체 (Griun Simsimche)** 예요.

1. 받은 폰트 파일을 이 폴더(`static/fonts/`)에 넣고
2. 파일 이름을 **`simsim.ttf`** 로 바꿔 주세요. (`.woff2`, `.otf` 도 돼요)
3. 서버를 다시 켜고 브라우저를 `Ctrl + F5` 로 새로고침하면 적용돼요.

> 파일 이름이 `Griun_Simsimche-Rg.ttf` 그대로여도 인식하도록 해뒀지만, 가장 확실한 건 `simsim.ttf` 예요.

폰트가 없으면 인터넷의 Jua / Pretendard로 대신 보여줘요.
다른 폰트로 바꾸고 싶으면 `static/css/style.css` 맨 위 `@font-face` 와 `:root` 의 `--font-title`, `--font-body` 를 고치세요.
