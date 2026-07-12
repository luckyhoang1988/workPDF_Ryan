# RyanPDF VPS Deployment Guide

## Tóm tắt

RyanPDF triển khai trên VPS bằng Docker, build từ source (không dùng image publish sẵn trên Docker Hub). **MIT core** (công cụ PDF cơ bản) miễn phí cho mọi mục đích. Các tính năng **Proprietary** (SSO/SAML, portal admin nâng cao) yêu cầu **license trả phí** cho production/quy mô lớn — mặc định repo này build ở chế độ MIT core (`DISABLE_ADDITIONAL_FEATURES: "true"`).

---

## 1. Chọn Image Phù Hợp

3 biến thể chính trong thư mục `docker/compose/`:

| Biến thể | File compose | RAM khuyến nghị | CPU | Khi nào dùng |
|---|---|---|---|---|
| **Ultra-lite** | `docker-compose.ultra-lite.yml` | 2 GB | 1-2 vCPU | VPS nhỏ, thao tác PDF cơ bản, không OCR nặng |
| **Standard** | `docker-compose.yml` | 4 GB | 2 vCPU | Cân bằng, đủ OCR/convert, đa số trường hợp |
| **Fat** | `docker-compose.fat.yml` | 6 GB | 4 vCPU | OCR/LibreOffice nặng, xử lý file lớn đồng thời cao |

Cả 3 file cùng nằm trong `docker/compose/` và dùng chung một file `docker/compose/.env`.

---

## 2. Credentials — Dùng `.env` (không hardcode)

Cả 3 compose file đọc user/pass admin từ biến môi trường:
```yaml
environment:
  SECURITY_ENABLELOGIN: "true"
  SECURITY_INITIALLOGIN_USERNAME: "${SECURITY_INITIALLOGIN_USERNAME}"
  SECURITY_INITIALLOGIN_PASSWORD: "${SECURITY_INITIALLOGIN_PASSWORD}"
```

Trên VPS, tạo file thật từ template:
```bash
cd docker/compose
cp .env.example .env
nano .env   # điền username/password thật, KHÔNG commit file này lên git
```

`.env.example` (đã có sẵn trong repo, an toàn để commit):
```
SECURITY_INITIALLOGIN_USERNAME=changeme
SECURITY_INITIALLOGIN_PASSWORD=changeme
```

**Nếu không tạo `.env`**: biến sẽ rỗng, Spring có thể tự sinh tài khoản mặc định `admin`/`stirling` → mất an toàn. Luôn tạo `.env` trước khi `docker compose up`.

---

## 3. 🔐 Bảo Mật — QUAN TRỌNG

- **Login**: đã bật `SECURITY_ENABLELOGIN=true` sẵn trong cả 3 file compose — chỉ cần set `.env` đúng.
- **TLS**: container chỉ expose cổng 8080, không có HTTPS tích hợp. Bắt buộc dùng reverse proxy (Caddy khuyến nghị) cho production, không expose 8080 thẳng ra internet — chỉ mở 80/443.
- **Database**: H2 embedded file-based (`/configs`), user `sa`/blank password — không cần đổi, nhưng backup định kỳ volume `/configs`.

---

## 4. Lộ Trình Triển Khai (Step-by-Step)

### 4.1 Chuẩn Bị VPS
```bash
ssh user@your-vps-ip

# Cài Docker & Compose plugin (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 4.2 Clone Code
```bash
git clone https://github.com/luckyhoang1988/workPDF_Ryan.git
cd workPDF_Ryan
```

### 4.3 Tạo Persistent Volumes
Volumes được mount tương đối ra ngoài `docker/compose/` theo path `../../ryanpdf/latest/{data,config,logs}`, tức thư mục `ryanpdf/latest/` ở root repo — Docker tự tạo khi `up` nếu chưa có, không cần tạo tay.

### 4.4 Tạo `.env`
```bash
cd docker/compose
cp .env.example .env
nano .env   # SECURITY_INITIALLOGIN_USERNAME / PASSWORD thật
```

### 4.5 Setup Reverse Proxy (Caddy — tự động HTTPS)

Template có sẵn tại `docker/compose/Caddyfile.example`:
```bash
cd docker/compose
cp Caddyfile.example Caddyfile
nano Caddyfile   # đổi your-domain.com thành domain thật
docker run -d --name caddy --restart unless-stopped \
  --network host \
  -v $(pwd)/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  -v caddy_config:/config \
  caddy:latest
```
(dùng `--network host` để Caddy reach `localhost:8080` của container RyanPDF chạy trên cùng VPS — đơn giản hơn phải nối chung docker network)

### 4.6 Chạy RyanPDF
```bash
cd docker/compose
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml logs -f
```

### 4.7 Kiểm Tra
```bash
curl http://localhost:8080/api/v1/info/status
# Từ browser: https://your-domain.com
```

---

## 5. Backup

```bash
tar -czf ryanpdf-config-backup-$(date +%Y%m%d).tar.gz ryanpdf/latest/config/
# cron 2h sáng hằng ngày:
0 2 * * * tar -czf /backups/ryanpdf-$(date +\%Y\%m\%d).tar.gz /path/to/workPDF_Ryan/ryanpdf/latest/config/
```

---

## 6. Cập Nhật Code Sau Khi Đã Deploy

Dùng script có sẵn `docker/compose/deploy.sh` (pull code mới nhất + rebuild + restart):
```bash
cd workPDF_Ryan
chmod +x docker/compose/deploy.sh   # chỉ cần lần đầu
./docker/compose/deploy.sh docker-compose.yml
```
Hoặc thủ công:
```bash
cd workPDF_Ryan
git pull origin main
cd docker/compose
docker compose -f docker-compose.yml up -d --build
```

---

## 7. Checklist Triển Khai

- [ ] Chọn biến thể Docker phù hợp với RAM VPS (ultra-lite/standard/fat)
- [ ] Cài Docker + Docker Compose plugin
- [ ] Clone repo `workPDF_Ryan`
- [ ] Tạo `docker/compose/.env` với username/password thật (không commit)
- [ ] Sửa `Caddyfile` với domain thật, chạy Caddy container
- [ ] Trỏ DNS domain về IP VPS
- [ ] `docker compose up -d --build`
- [ ] Kiểm tra port 8080 **không expose** trực tiếp ra internet (chỉ localhost + Caddy dùng)
- [ ] Test `https://your-domain.com`, login với tài khoản admin trong `.env`
- [ ] Test upload/merge/split PDF
- [ ] `docker compose logs` không có error
- [ ] Setup cron backup `ryanpdf/latest/config/`

---

## 8. Troubleshooting

### Container không start
```bash
docker compose logs ryanpdf
```
Kiểm tra: memory, disk space, port conflicts, volume permissions.

### Login không work
```bash
docker compose exec ryanpdf env | grep SECURITY
```
Nếu rỗng → `.env` chưa được tạo/đọc đúng (phải nằm cùng thư mục `docker/compose/` với file compose đang chạy).

### File lớn upload lỗi
```yaml
environment:
  SYSTEM_MAXFILESIZE: "100"
  SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE: "500MB"
  SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE: "550MB"
```

### Database corrupt
```bash
rm -rf ryanpdf/latest/config/ryanpdf-DB-*
docker compose restart ryanpdf
```

---

**Repo**: https://github.com/luckyhoang1988/workPDF_Ryan
**Cập nhật**: 2026-07-12
