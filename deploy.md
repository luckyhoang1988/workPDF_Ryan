# Stirling-PDF VPS Deployment Guide

## Tóm tắt

Stirling-PDF có thể triển khai trên VPS ngay lập tức bằng Docker. **MIT core** (công cụ PDF cơ bản) là miễn phí cho mọi mục đích. Các tính năng **Proprietary** (SSO/SAML, portal admin nâng cao) yêu cầu **license trả phí** cho production/quy mô lớn.

---

## 1. Chọn Image Phù Hợp

Stirling-PDF cung cấp 3 biến thể chính trong thư mục `docker/compose/`:

| Biến thể | File compose | RAM khuyến nghị | CPU | Khi nào dùng |
|---|---|---|---|---|
| **Ultra-lite** | `docker-compose.ultra-lite.yml` | 2 GB | 1-2 vCPU | VPS nhỏ, thao tác PDF cơ bản, không OCR nặng |
| **Standard** | `docker-compose.yml` | 4 GB | 2 vCPU | Cân bằng, đủ OCR/convert, đa số trường hợp |
| **Fat** | `docker-compose.fat.yml` | 6 GB | 4 vCPU | OCR/LibreOffice nặng, xử lý file lớn đồng thời cao |

### Lựa chọn
- VPS 2 GB → `ultra-lite`
- VPS 4+ GB → `standard` (khuyến nghị)
- VPS 6+ GB + tải OCR cao → `fat`

---

## 2. File Cấu Hình Chính

### Dockerfile
- **Standard**: `docker/embedded/Dockerfile` — chứa LibreOffice, Tesseract, Ghostscript trong base image
- **Fat**: `docker/Dockerfile.fat`
- **Ultra-lite**: `docker/Dockerfile.ultra-lite`

### Compose Files
Vị trí: `docker/compose/`

**Standard** (`docker-compose.yml`):
```yaml
services:
  stirling-pdf:
    build: {context: ../.., dockerfile: docker/embedded/Dockerfile}
    ports: ["8080:8080"]
    volumes:
      - ../../stirling/latest/data:/usr/share/tessdata:rw
      - ../../stirling/latest/config:/configs:rw
      - ../../stirling/latest/logs:/logs:rw
    environment:
      DISABLE_ADDITIONAL_FEATURES: "true"
      SECURITY_ENABLELOGIN: "false"
      SYSTEM_MAXFILESIZE: "100"
      METRICS_ENABLED: "true"
```

**Ý nghĩa**:
- `DISABLE_ADDITIONAL_FEATURES: "true"` → dùng bản MIT core (không có proprietary features)
- `SECURITY_ENABLELOGIN: "false"` → **DEFAULT: mở không cần login** (⚠️ nguy hiểm nếu public)
- `SYSTEM_MAXFILESIZE: "100"` → giới hạn 100 MB/file (điều chỉnh theo nhu cầu)
- `/configs` → chứa H2 embedded database (độc lập, không cần Postgres/Redis)

### Application Properties
File: `app/core/src/main/resources/application.properties` (105 dòng)

**Cấu hình mặc định**:
```properties
spring.servlet.multipart.max-file-size=2000MB
spring.servlet.multipart.max-request-size=2100MB
```
Điều chỉnh qua biến môi trường:
```bash
SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE=500MB
SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE=550MB
```

---

## 3. 🔐 Bảo Mật — QUAN TRỌNG

### Vấn đề 1: Login Bị Tắt Mặc Định
**Mặc định**: `SECURITY_ENABLELOGIN=false` → bất kỳ ai truy cập cũng dùng được tất cả công cụ (không cần xác thực).

**Trên VPS public, PHẢI bật login**:
```yaml
environment:
  SECURITY_ENABLELOGIN: "true"
  SECURITY_INITIALLOGIN_USERNAME: "your_admin_username"
  SECURITY_INITIALLOGIN_PASSWORD: "your_strong_password"
```

**Nếu không set 2 biến trên**: Hệ thống tự tạo `admin`/`stirling` → **rất dễ bị tấn công** vì mọi người biết tài khoản mặc định này.

### Vấn đề 2: Không Có TLS Tích Hợp
Container chỉ expose **cổng 8080** không có HTTPS/TLS. Trên production:
- **Phải dùng reverse proxy** (Caddy, nginx, Traefik) cho HTTPS termination
- Không expose port 8080 trực tiếp ra internet
- Chỉ mở port 80 & 443 cho proxy

### Vấn đề 3: Database Credentials
H2 embedded database dùng mặc định:
- Username: `sa`
- Password: (trống/blank)

⚠️ **Không cần đổi cho file-based H2**, nhưng đảm bảo `/configs` volume được **backup định kỳ**.

---

## 4. Lộ Trình Triển Khai (Step-by-Step)

### 4.1 Chuẩn Bị VPS
```bash
# 1. SSH vào VPS
ssh user@your-vps-ip

# 2. Cài Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Clone hoặc download project
git clone https://github.com/Stirling-Tools/Stirling-PDF.git
cd Stirling-PDF
```

### 4.2 Tạo Thư Mục Persistent Volumes
```bash
mkdir -p ~/stirling-pdf/{data,config,logs}
```

### 4.3 Chỉnh Docker Compose
**Copy file compose phù hợp**:
```bash
# Ví dụ: dùng standard image
cp docker/compose/docker-compose.yml .
```

**Sửa trong `docker-compose.yml`**:
```yaml
services:
  stirling-pdf:
    build: {context: ., dockerfile: docker/embedded/Dockerfile}
    ports: ["8080:8080"]
    volumes:
      - ./stirling-pdf/data:/usr/share/tessdata:rw
      - ./stirling-pdf/config:/configs:rw
      - ./stirling-pdf/logs:/logs:rw
    environment:
      DISABLE_ADDITIONAL_FEATURES: "true"
      SECURITY_ENABLELOGIN: "true"                           # ← BẬT LOGIN
      SECURITY_INITIALLOGIN_USERNAME: "admin"                # ← ĐỔI TÊN
      SECURITY_INITIALLOGIN_PASSWORD: "your_strong_pwd_123"  # ← ĐỔI PASSWORD
      SYSTEM_MAXFILESIZE: "100"
      METRICS_ENABLED: "true"
```

### 4.4 Setup Reverse Proxy (HTTPS)

**Ví dụ với Caddy** (khuyến nghị, đơn giản nhất — tự lấy Let's Encrypt cert):

File `Caddyfile`:
```
your-domain.com {
    reverse_proxy localhost:8080 {
        header_down -Server
        header_up X-Forwarded-For {http.request.remote.host}
        header_up X-Forwarded-Proto {http.request.proto}
    }
}
```

Chạy Caddy:
```bash
docker run -d \
  -p 80:80 -p 443:443 \
  -v $(pwd)/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  -v caddy_config:/config \
  caddy:latest
```

**Ví dụ với nginx**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4.5 Chạy Container
```bash
docker compose up -d

# Kiểm tra logs
docker compose logs -f stirling-pdf
```

### 4.6 Kiểm Tra
```bash
# Từ VPS local
curl http://localhost:8080

# Hoặc từ browser (qua reverse proxy)
# https://your-domain.com
```

---

## 5. Database & Backup Strategy

### Database Mặc Định: H2 File-Based
- Vị trí: `/configs/stirling-pdf-DB-2.3.232...` (trong volume `/configs`)
- Không cần config Postgres/Redis riêng
- Embedded, nhẹ, phù hợp cho deployment cỡ vừa

### Backup `/configs` Volume
```bash
# Backup thủ công
tar -czf stirling-pdf-config-backup-$(date +%Y%m%d).tar.gz ./stirling-pdf/config/

# Hoặc backup tự động (daily cron)
0 2 * * * tar -czf /backups/stirling-pdf-$(date +\%Y\%m\%d).tar.gz /home/user/stirling-pdf/config/

# Kiểm tra backup
ls -lh /backups/
```

---

## 6. Giới Hạn Upload & Performance Tuning

### File Size Limits
```yaml
environment:
  SYSTEM_MAXFILESIZE: "100"  # 100 MB
  # hoặc
  SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE: "500MB"
  SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE: "550MB"
```

### Memory/CPU
- **Ultra-lite**: `-m 2g` (giới hạn 2 GB RAM)
- **Standard**: `-m 4g`
- **Fat**: `-m 6g`

Thêm vào `docker-compose.yml`:
```yaml
services:
  stirling-pdf:
    # ...
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
```

---

## 7. 📜 License Boundaries

### MIT Core (Miễn Phí)
- **File location**: `LICENSE` (repository root)
- **Modules**: `app/core`, `docker/embedded`, base Docker images
- **Công cụ**: PDF edit, merge, split, OCR, convert, sign, compress, etc. (50+ tools)
- **Deployment**: Tự host thoải mái, không giới hạn, không cần license

### Proprietary Features (Trả Phí)
- **File location**: `app/proprietary/LICENSE` ("Stirling PDF User License")
- **Modules**: `app/proprietary/`, `app/saas/`, `frontend/editor/src/proprietary/`, `frontend/editor/src/saas/`, `frontend/editor/src/cloud/`, `frontend/editor/src/desktop/`, `engine/`
- **Công cụ**: SSO/SAML, advanced admin features, portal management, desktop client
- **Deployment**: Trial/internal evaluation ONLY — production/quy mô lớn cần **paid license**

### Kiểm Tra Bạn Dùng Phiên Bản Nào
```bash
# Nếu `DISABLE_ADDITIONAL_FEATURES=true` → MIT Core ✓
# Nếu `DISABLE_ADDITIONAL_FEATURES=false` hoặc không set → Proprietary (cần license cho production)

# Hoặc check build
grep -r "disableAdditional" build.gradle
# gradle.ext.disableAdditional = true → Core only
```

---

## 8. Checklist Triển Khai

- [ ] Chọn biến thể Docker phù hợp với VPS (ultra-lite/standard/fat)
- [ ] **Bật login**: `SECURITY_ENABLELOGIN=true`
- [ ] **Đổi credential**: `SECURITY_INITIALLOGIN_USERNAME`, `SECURITY_INITIALLOGIN_PASSWORD`
- [ ] Tạo persistent volumes cho `/configs`, `/data`, `/logs`
- [ ] **Setup reverse proxy** (Caddy/nginx) + HTTPS
- [ ] Kiểm tra cổng 8080 **không expose** trực tiếp ra internet
- [ ] Kiểm tra `/configs` volume được backup định kỳ
- [ ] Chạy `docker compose up -d`
- [ ] Test `https://your-domain.com` trên browser
- [ ] Test login với tài khoản admin
- [ ] Test một PDF tool (upload/merge/split/...)
- [ ] Kiểm tra `docker compose logs` không có error
- [ ] Xác nhận bạn đang dùng **MIT Core** (free) hoặc **đã mua license** nếu dùng Proprietary

---

## 9. Troubleshooting

### Container không start
```bash
docker compose logs stirling-pdf
```
Kiểm tra: memory, disk space, port conflicts, volume permissions.

### Login không work
```bash
# Kiểm tra biến môi trường được set không
docker compose exec stirling-pdf env | grep SECURITY
```

### File lớn upload lỗi
```bash
# Tăng file size limit
docker compose exec stirling-pdf bash
# Kiểm tra application.properties
cat /app/resources/application.properties | grep multipart
```

### Database corrupt
```bash
# Xóa DB cũ (nếu có backup)
rm -rf ./stirling-pdf/config/stirling-pdf-DB-*
docker compose restart stirling-pdf
# Container sẽ tạo DB mới
```

---

## 10. Tham Khảo Thêm

- **Docker Hub**: https://hub.docker.com/r/stirlingtools/stirling-pdf
- **Documentation**: https://docs.stirlingpdf.com
- **GitHub Repo**: https://github.com/Stirling-Tools/Stirling-PDF
- **Discord Community**: https://discord.gg/HYmhKj45pU

---

**Phiên bản**: 2.3.232+ (cập nhật cuối)  
**Cập nhật**: 2026-07-12
