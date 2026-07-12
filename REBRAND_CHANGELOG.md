# Rebrand: Stirling-PDF → RyanPDF — Ghi chú thay đổi

> Tài liệu này tổng hợp lại toàn bộ các thay đổi đã thực hiện để đổi thương hiệu từ
> **Stirling / Stirling-PDF / Stirling Tools** sang **RyanPDF**, chia theo từng giai đoạn,
> kèm danh sách những gì **cố tình giữ nguyên** (vì lý do kỹ thuật/pháp lý/rủi ro vỡ hệ thống)
> để tránh nhầm là "làm thiếu". Đọc kỹ phần **"Trước khi deploy thực tế lên VPS"** ở cuối —
> có vài điểm chặn (blocker) cần bạn quyết định trước khi chạy thật.

---

## Giai đoạn 1 — UI hiển thị & i18n

- Đổi các chuỗi hiển thị cho người dùng (tên app, mô tả, tiêu đề trang...) trong các file
  `frontend/editor/public/locales/*/translation.toml` (~50 ngôn ngữ) và các component React
  liên quan đến branding (logo text, footer, tiêu đề trang đăng nhập, onboarding...).
- Đổi các key/text nội bộ liên quan trực tiếp đến hiển thị thương hiệu.

## Giai đoạn 2 — Logo / brand assets

- Thay các file SVG logo bằng wordmark dạng text "RyanPDF" (placeholder), gồm:
  - `frontend/editor/src/core/assets/brand/modern-logo/RyanPDFProcessorLogoWhiteText.svg`
  - `frontend/editor/src/core/assets/brand/modern-logo/RyanPDFProcessorLogoBlackText.svg`
  - và các asset liên quan (`LoginDarkModeHeader.svg`, `useLogoAssets.ts`, `useLogoPath.ts`...).
- **Lưu ý**: đây là logo chữ tạm thời, chưa phải thiết kế đồ hoạ chính thức — nên thay bằng
  logo thật trước khi ra mắt công khai.

## Giai đoạn 3 — Docs / README / pháp lý

- Đổi tên thương hiệu trong `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `DeveloperGuide.md`,
  `devGuide/*.md`, và các file docs khác.
- **`LICENSE` (root + `app/core`, `app/proprietary`, `app/saas`, `engine`, và các LICENSE trong
  `frontend/editor/src/*`)**: đổi copyright holder → **"RyanPDF Inc."** — đây là thay đổi bạn
  đã chủ động yêu cầu, tôi đã cảnh báo rủi ro pháp lý (đứng tên bản quyền cho phần mềm không
  phải do RyanPDF Inc. viết gốc) và bạn xác nhận muốn giữ.
- `docs/security/VERIFYING_RELEASES.md`: **giữ nguyên** — chứa GPG key thật của Stirling-Tools,
  không đổi trừ khi bạn tạo và công bố key ký mới dưới tên RyanPDF.

## Giai đoạn 4 — Backend Java (giá trị cấu hình, KHÔNG đổi tên package/class)

- Đổi các giá trị hiển thị/cấu hình mặc định: `UI_APPNAME`, mô tả app, banner khởi động
  (`app/core/src/main/resources/banner.txt`), OpenAPI title/description
  (`OpenApiConfig.java`, `SpringDocConfig.java`), metadata PDF mặc định (creator/producer),
  `settings.yml.template` (registrationId, SAML placeholder URL, organizationName,
  "Sign with RyanPDF" comment, baseTmpDir comment, prefix...).
- **Chủ động KHÔNG đổi**: package Java thật `stirling.software.*` (SPDF, common, proprietary,
  saas...) và tên class — đổi sẽ vỡ build/import trên diện rộng, không mang lại giá trị branding
  (người dùng không nhìn thấy package name).
- `SECURITY_INITIALLOGIN_PASSWORD: "stirling"` và các giá trị tương tự dùng làm fixture test:
  **giữ nguyên** vì bị tham chiếu cứng ở 9+ file cucumber `.feature`.

## Giai đoạn 5 — Docker / docker-compose / test scripts

**Đã đổi:**
- 6 Dockerfile (`docker/embedded/Dockerfile[.fat|.ultra-lite]`, `docker/backend/Dockerfile`,
  `docker/base/Dockerfile`, `docker/unoserver/Dockerfile`): comment header, và LABEL
  `org.opencontainers.image.*` — theo quyết định của bạn: đổi `title`/`description`/`keywords`
  sang RyanPDF, **xoá hẳn** `vendor`, `maintainer`, `authors`, `url`, `documentation`, `source`
  (các field khẳng định chủ sở hữu/nguồn gốc thật của Stirling-Tools).
- Toàn bộ docker-compose demo/local (`docker/compose/*.yml`) và các file trong
  `docker/embedded/compose/*.yml`, `testing/compose/docker-compose-security*.yml`,
  `docker-compose-ultra-lite.yml`, `test_cicd.yml`: đổi tên service, `container_name`, tên
  network/volume, đường dẫn bind-mount host, `UI_APPNAME`/`UI_HOMEDESCRIPTION`/`UI_APPNAMENAVBAR`.
- `testing/test.sh` (49 chỗ) và `testing/test2.sh`: đổi nhãn test nội bộ.
- `testing/allEndpointsRemovedSettings.yml`: đồng bộ với các đổi ở `settings.yml.template`.
- `.taskfiles/docker.yml`: đổi tag build local (`stirling-pdf` → `ryanpdf`...).

**Chủ động giữ nguyên (rủi ro kỹ thuật/hạ tầng thật):**
- `STIRLING_FLAVOR`, `STIRLING_JVM_PROFILE`, `STIRLING_TEMPFILES_DIRECTORY`, `STIRLING_AOT_ENABLE`,
  `STIRLING_PDF_TEST_COVERAGE`, `STIRLING_ENGINE_WORKERS`, `STIRLING_ENGINE_PORT` — tên biến môi
  trường thật được code đọc trực tiếp, đổi sẽ vỡ chức năng.
- `stirlingpdfuser`/`stirlingpdfgroup` (user/group OS trong base image), `/tmp/stirling-pdf`,
  `stirling.aot`/`stirling.aotconf` — path functional xuyên suốt base image + init scripts.
- `engine/src/stirling` — package Python thật (tương đương package Java, không đổi).
- Cụm **Keycloak/OAuth/SAML/MCP/SaaS test** (`testing/compose/docker-compose-keycloak-*.yml`,
  `docker-compose-saas*.yml`, `keycloak-realm-*.json`, `start-*.sh`, `validate-*.sh`,
  `payg/*.sql`, `mcp-client-check/*`) — cross-reference sâu giữa YAML+JSON+shell, rủi ro cao,
  bạn đã đồng ý **để lại chưa đổi** (xem trao đổi trước).
- `.github/workflows/*.yml` (deploy-on-v2-commit.yml, PR-Auto-Deploy-V2.yml,
  PR-Demo-Comment-with-react.yml, testdriver.yml, docker-compose-tests.yml) — xem mục
  **"Đã xử lý"** bên dưới, 2 điểm chặn này đã được giải quyết.

---

## ✅ Đã xử lý — 2 điểm chặn trước deploy VPS

### 1. Đã xoá các workflow SSH-deploy vào hạ tầng thật của Stirling-Tools

Các file sau **đã bị xoá hẳn** khỏi `.github/workflows/` vì chúng SSH vào VPS thật của
Stirling-Tools (biến `secrets.NEW_VPS_HOST`, domain `demo.stirlingpdf.cloud` /
`*.ssl.stirlingpdf.cloud`, đường dẫn `/stirling/V2/...`):
- `deploy-on-v2-commit.yml`
- `PR-Auto-Deploy-V2.yml`
- `PR-Demo-cleanup.yml`
- `PR-Demo-Comment-with-react.yml`
- `testdriver.yml` (cũng SSH-deploy container test lên cùng VPS thật để chạy UI test)

Đã dọn theo tham chiếu chết: xoá dòng `.github/workflows/testdriver.yml` khỏi filter
`frontend` trong `.github/config/.files.yaml`.

`aur-publish.yml` **giữ nguyên** — dùng SSH key riêng (`AUR_SSH_PRIVATE_KEY`) để publish gói lên
Arch User Repository, không liên quan tới hạ tầng demo/VPS nói trên.

**Lưu ý**: nếu sau này bạn muốn có CI/CD tự động deploy, cần viết workflow mới trỏ về VPS +
domain + SSH secret của riêng bạn (chưa có, vì bạn đang chờ đăng ký VPS).

### 2. Đã xoá dòng `image:` trỏ registry thật của Stirling-Tools trong `docker/embedded/compose/*.yml`

Đã sửa cả 6 file, chỉ còn `build:` (local), không còn `image:` trỏ ra registry ngoài:
- `docker-compose-latest-security.yml`
- `docker-compose-latest-fat-security.yml`
- `docker-compose-latest-fat-endpoints-disabled.yml`
- `docker-compose-latest-ultra-lite.yml`
- `test_cicd.yml`
- `docker-compose-latest-security-remote-uno.yml` (cả service chính lẫn 2 service
  `unoserver1`/`unoserver2` — thêm `build: context: ../../unoserver` để thay cho
  `image: ghcr.io/stirling-tools/stirling-unoserver:latest`)

→ Toàn bộ `docker/embedded/compose/*.yml` giờ build 100% local, không còn khả năng vô tình
pull nhầm image thật của Stirling-Tools.

---

## Các mục còn treo (đã nêu nhưng chưa xử lý, chưa được giao vào giai đoạn nào)

- `frontend/editor/src-tauri/tauri.conf.json`: `productName`, `mainBinaryName`, `identifier`,
  `publisher`, URL scheme `stirlingpdf://`, auto-updater endpoint trỏ
  `github.com/Stirling-Tools/Stirling-PDF/releases` — cần bạn xác nhận trước khi đổi vì ảnh
  hưởng tới ứng dụng desktop (Tauri) và cơ chế auto-update.
- Cụm Keycloak/OAuth/SAML/MCP/SaaS test infrastructure — đã thống nhất tạm để nguyên.
