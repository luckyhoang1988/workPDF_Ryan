# Kế hoạch: Hoàn thiện song ngữ Anh-Việt cho Stirling-PDF (webapp + desktop)

## Context

Yêu cầu ban đầu tưởng là "thêm tiếng Việt vào project", nhưng khảo sát cho thấy **tiếng Việt (`vi-VN`) đã tồn tại sẵn** trong hệ thống i18n (i18next + react-i18next, file TOML tại `frontend/editor/public/locales/vi-VN/translation.toml`) và **đã được đăng ký** trong `languages.ts` + hiển thị trong `LanguageSelector.tsx`. App desktop (Tauri) dùng chung y hệt bộ build/locale này với webapp — không có bộ string riêng — nên sửa ở một chỗ là áp dụng cho cả hai nền tảng.

Người dùng đã xác nhận rõ: mục tiêu là **runtime đa ngôn ngữ (English ⇄ Vietnamese) trên UI của webapp và desktop app**, **không phải** dịch mã nguồn/comment sang tiếng Việt. Vì vậy phạm vi công việc nằm hoàn toàn trong hệ thống i18n hiện có (file TOML + component dùng `t()`), không đụng vào logic code.

Vấn đề thật sự không phải "thiếu file tiếng Việt" mà là **lệch nội dung dịch**:
- **221 key thiếu** trong `vi-VN` so với `en-US` (7650 vs 7613 key) — các tính năng portal/SaaS mới thêm sau này.
- **184 key thừa/orphan** trong `vi-VN` — tàn dư từ cấu trúc cũ (`policies.*`, `portal.shell.*`...) đã bị refactor bên `en-US`, cần rà lại xem có phải đổi tên (rename) hay bị xoá hẳn.
- **822 key "dịch giả"** — key tồn tại ở cả hai file nhưng giá trị tiếng Việt **giống hệt tiếng Anh** (copy nguyên văn, chưa dịch thật). Đây là phần lớn nhất, tập trung ở `watchedFolders` (145), `payg` (130), `admin` (67), `portal` (51), `AddStampRequest` (36), `provider` (32), `filesPage` (31), `addImage`/`addText`, `oauthConsent`... 85 namespace bị ảnh hưởng.

→ **Tổng khối lượng dịch thật ≈ 1043 chuỗi**, không phải 221 như thoạt nhìn. Các công cụ validate hiện có (`validate_json_structure.py`, CI `check_toml.yml`) chỉ so sánh **tập key có tồn tại hay không**, không phát hiện được kiểu lỗi "key tồn tại nhưng vẫn là tiếng Anh" — nên lỗi này đã lọt qua từ trước tới nay.

Người dùng chọn: **Claude trực tiếp dịch** (không dùng script GPT `auto_translate.py`, để đảm bảo thuật ngữ nhất quán và không tốn API key). Phạm vi lần này **chỉ tập trung hoàn thiện file dịch TOML cho khớp `en-US`** — việc sửa text hard-code trong vài component React (bypass i18n) và việc mở rộng CI để bắt lỗi "dịch giả" trong tương lai được ghi nhận là **out-of-scope / follow-up riêng**, không làm trong lần này trừ khi được yêu cầu thêm.

## Phạm vi KHÔNG làm (out of scope)

- Không sửa mã nguồn React/TS, không đổi tên biến/comment sang tiếng Việt.
- Không sửa các chuỗi hard-code tiếng Anh trong `BookmarkSidebar.tsx`, `ThumbnailSidebar.tsx`, `LayerSidebar.tsx`, một vài error message ở `authService.ts`/`usersBackend.ts` (các chuỗi này bypass hệ thống i18n hoàn toàn — vẫn hiện tiếng Anh dù chọn ngôn ngữ nào). Ghi nhận để làm ticket riêng nếu cần.
- Không đụng backend Java (`messages.properties` đang rỗng, backend không phục vụ text đã dịch — server chỉ resolve locale qua `?lang=`, không phải nguồn gây ra vấn đề đa ngôn ngữ hiện tại).
- Không mở rộng CI (`check_toml.yml`, `translationAudit.ts`) để tự động bắt lỗi "dịch giả" trong tương lai — optional, để sau.

## Các bước triển khai

### Bước 0 — Tạo checkpoint an toàn
Thư mục làm việc hiện **chưa có git** (`is a git repository: false`). Trước khi sửa hàng loạt vào file TOML 11,000+ dòng, chạy `git init` + commit trạng thái hiện tại để có thể diff/revert nếu cần. Đây là bước bắt buộc trước khi động vào Bước 1.

### Bước 1 — Đồng bộ cấu trúc key (dùng script sẵn có, không sửa tay TOML)
Dùng `scripts/translations/translation_merger.py` (đã xác nhận có đủ subcommand `add-missing`, `remove-unused`, `extract-untranslated`, `apply-translations` qua đọc trực tiếp source). Cần `pip install tomli_w` trước (chưa có trong môi trường Python hiện tại).

1. `python scripts/translations/validate_json_structure.py --language vi-VN --verbose` → xem danh sách 184 key "extra". Rà thủ công ~10-15 phút xem key nào là **rename** của key trong danh sách 221 "missing" (ví dụ `policies.wizard.*` cũ có thể tương ứng `portal.procurement.builder.*` mới) — nếu đúng, tái sử dụng bản dịch tiếng Việt cũ thay vì dịch lại từ đầu.
2. `python scripts/translations/translation_merger.py vi-VN add-missing --backup` — thêm 221 key thiếu (giá trị tạm = tiếng Anh).
3. `python scripts/translations/translation_merger.py vi-VN remove-unused --backup` — xoá các key orphan đã xác nhận không dùng.
4. Kiểm tra lại: `validate_json_structure.py --language vi-VN` phải báo 0 missing, 0 extra, key count khớp `en-US` (7650).

### Bước 2 — Dịch nội dung thật (~1043 chuỗi) — phần việc chính
1. `python scripts/translations/translation_merger.py vi-VN extract-untranslated --output <scratchpad>/vi-VN-untranslated.json` — xuất toàn bộ key cần dịch thật (bao gồm cả 221 key mới thêm lẫn 822 key "dịch giả" cũ, vì cả hai đều có giá trị == tiếng Anh).
2. Claude dịch trực tiếp theo từng batch (chia theo namespace: `watchedFolders`, `payg`, `admin`, `portal`, `AddStampRequest`, `oauthConsent`, `filesPage`, `addImage`, `addText`, `settings`, `provider`...), giữ **thuật ngữ nhất quán xuyên suốt** cho các từ chuyên ngành PDF (watermark → "hình mờ", OCR → giữ nguyên "OCR", flatten → "làm phẳng", bookmark → "dấu trang", signature → "chữ ký"...).
3. Quy tắc bắt buộc khi dịch:
   - Giữ nguyên mọi placeholder (`{{variable}}`, `{n}`, `{total}`, `{filename}`...) không đổi.
   - Các key có hậu tố số nhiều CLDR (`_zero/_one/_two/_few/_many/_other`) — tiếng Việt không có số nhiều ngữ pháp, dùng cùng một cấu trúc câu cho mọi hậu tố, chỉ khác chỗ chèn `{{count}}` (theo đúng convention đã có sẵn trong file, ví dụ `confirmCloseSaveFailed_one`/`_other`).
   - Bỏ qua các key đã khai báo trong `scripts/ignore_translation.toml` mục `[vi_VN]` (ví dụ `language.direction`, `showJS.tags`) — các key này cố ý giữ giống tiếng Anh.
4. Ghi kết quả dịch thành JSON `{key: "bản dịch"}`, áp dụng lại bằng: `python scripts/translations/translation_merger.py vi-VN apply-translations --translations-file <scratchpad>/vi-VN-translated.json --backup`.

### Bước 3 — Chuẩn hoá cấu trúc
`python scripts/translations/toml_beautifier.py` — sắp lại thứ tự key khớp `en-US`, giữ diff sạch, đúng convention các ngôn ngữ khác trong repo đang theo.

### Bước 4 — Validate (tiêu chí "xong")
Chạy lần lượt, coi mỗi bước là gate bắt buộc:
1. `validate_json_structure.py --language vi-VN` → 0 missing, 0 extra.
2. `validate_placeholders.py --language vi-VN` → 0 mismatch placeholder.
3. `translation_analyzer.py --language vi-VN` → completion rate ~100% (đây là script duy nhất phát hiện lại lỗi "dịch giả", nên là tín hiệu hoàn thành thật sự).
4. Vitest frontend (`frontend/editor`, qua `task frontend:test` hoặc tương đương) — đảm bảo `translationStructure.test.ts` và các test TOML-loader khác vẫn pass, không có lỗi parse.
5. Chạy lại đúng logic CI sẽ áp dụng khi tạo PR: `.github/scripts/check_language_toml.py --reference-file frontend/editor/public/locales/en-US/translation.toml --files frontend/editor/public/locales/vi-VN/translation.toml` (script này còn check trùng key, việc 3 script kia không check).

### Bước 5 — QA thủ công (cả webapp lẫn desktop)
1. Chạy app, vào `LanguageSelector` chuyển sang "Tiếng Việt". Kiểm tra config `ui.languages` trong `settings.yml` đang chạy (mặc định `[]` = cho phép tất cả ngôn ngữ, theo `application.yml.template:307`) — nếu deployment cụ thể có whitelist loại `vi-VN`, cần thêm vào.
2. Click qua các khu vực trước đây toàn tiếng Anh để xác nhận đã dịch đúng: watched folders automation, màn billing/pay-as-you-go, admin panel, portal home/shell, công cụ Add Stamp, màn OAuth consent, files page, Add Image/Add Text, settings.
3. Nếu có build desktop (Tauri) khả dụng để test, lặp lại bước chuyển ngôn ngữ + click-through tương tự — vì dùng chung bộ locale nên về lý thuyết tự động nhất quán với webapp, nhưng nên xác nhận trực quan ít nhất 1 lần.
4. Kiểm tra: không có key i18n hiện ra thô (dấu hiệu thiếu key), dấu tiếng Việt hiển thị đúng (không lỗi font/mojibake), không bị tràn/cắt chữ do tiếng Việt thường dài hơn tiếng Anh 20-40%, không có console warning về missing translation key.

## Ước lượng thời gian
- Bước 0-1: ~30-45 phút (đa phần tự động qua script).
- **Bước 2 (dịch ~1043 chuỗi): phần tốn thời gian nhất** — ước tính cần nhiều batch dịch nối tiếp trong phiên làm việc, tương đương khoảng **1 ngày làm việc tập trung** (không phải việc 20 phút, nhưng cũng không phải dự án nhiều tuần).
- Bước 3-4: ~30-45 phút, phần lớn tự động.
- Bước 5: ~30-60 phút click-through thủ công.

## File quan trọng liên quan
- `frontend/editor/public/locales/vi-VN/translation.toml` — file đích cần sửa.
- `frontend/editor/public/locales/en-US/translation.toml` — file tham chiếu.
- `scripts/translations/translation_merger.py` — công cụ add-missing/remove-unused/extract/apply.
- `scripts/translations/validate_json_structure.py`, `validate_placeholders.py`, `translation_analyzer.py` — công cụ validate.
- `scripts/translations/toml_beautifier.py` — chuẩn hoá thứ tự key.
- `scripts/ignore_translation.toml` — danh sách key cố ý không dịch.
- `.github/scripts/check_language_toml.py` — logic CI sẽ áp dụng khi PR đụng vào file locale.

## Xác minh cuối cùng
- Toàn bộ 4 script validate ở Bước 4 phải pass (exit code 0 / 100% completion).
- Vitest i18n suite không có regression.
- QA thủ công: chuyển ngôn ngữ trong UI thực tế (trình duyệt, và desktop nếu test được), xác nhận các khu vực từng toàn tiếng Anh nay hiển thị tiếng Việt đúng, không lỗi hiển thị.
