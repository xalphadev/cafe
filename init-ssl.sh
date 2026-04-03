#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# init-ssl.sh — ขอ SSL certificate จาก Let's Encrypt ครั้งแรก
# รันหลังจาก docker compose up -d ครั้งแรก
#
# Usage: ./init-ssl.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

DOMAIN="cafe.xalpha.co.th"
EMAIL="admin@xalpha.co.th"          # <-- เปลี่ยนเป็น email จริง

# ── ตรวจสอบว่า cert มีอยู่แล้วหรือไม่ ──────────────────────────────────────
if docker compose exec certbot test -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" 2>/dev/null; then
  echo "✓ Certificate for ${DOMAIN} already exists. Skipping."
  exit 0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Let's Encrypt SSL setup for ${DOMAIN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Step 1: ใช้ nginx HTTP-only config ก่อน ─────────────────────────────────
echo "▶ Switching nginx to HTTP-only mode for ACME challenge..."
cat > nginx/conf.d/app.conf << 'NGINX_HTTP'
server {
    listen 80;
    server_name cafe.xalpha.co.th;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'SSL setup in progress...';
        add_header Content-Type text/plain;
    }
}
NGINX_HTTP

docker compose exec nginx nginx -s reload
sleep 2

# ── Step 2: ขอ certificate ──────────────────────────────────────────────────
echo "▶ Requesting certificate from Let's Encrypt..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "${EMAIL}" \
  --agree-tos \
  --no-eff-email \
  -d "${DOMAIN}"

# ── Step 3: คืน nginx config แบบ HTTPS ─────────────────────────────────────
echo "▶ Restoring full nginx config with HTTPS..."
cat > nginx/conf.d/app.conf << NGINX_HTTPS
# ── HTTP: redirect to HTTPS + Let's Encrypt challenge ────────────
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

# ── HTTPS: main site ──────────────────────────────────────────────
server {
    listen 443 ssl;
    http2 on;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options    nosniff                               always;
    add_header X-Frame-Options           SAMEORIGIN                            always;

    location /_next/static/ {
        proxy_pass http://app:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
        proxy_set_header Host \$host;
    }

    location /api/ {
        proxy_pass         http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_set_header   Connection        '';
        proxy_buffering    off;
        proxy_cache        off;
        chunked_transfer_encoding on;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location / {
        proxy_pass         http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    client_max_body_size 20m;
}
NGINX_HTTPS

docker compose exec nginx nginx -s reload

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ SSL setup complete!"
echo "  🌐 https://${DOMAIN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
