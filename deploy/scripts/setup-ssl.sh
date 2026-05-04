#!/bin/bash
set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSL_DIR="$SCRIPT_DIR/ssl"

mkdir -p "$SSL_DIR"

if command -v certbot &> /dev/null; then
    echo "Using certbot for Let's Encrypt certificate..."
    certbot certonly --standalone -d "$DOMAIN" --non-interactive --agree-tos --email admin@"${DOMAIN#*.}"
    CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
    cp "$CERT_PATH/fullchain.pem" "$SSL_DIR/fullchain.pem"
    cp "$CERT_PATH/privkey.pem" "$SSL_DIR/privkey.pem"
else
    echo "certbot not found. Generating self-signed certificate for internal use..."
    openssl req -x509 -nodes -days 3650 \
        -newkey rsa:2048 \
        -keyout "$SSL_DIR/privkey.pem" \
        -out "$SSL_DIR/fullchain.pem" \
        -subj "/C=CN/ST=Internal/L=Internal/O=Company/CN=$DOMAIN" \
        -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN"
    echo "Self-signed certificate generated (valid for 10 years)"
fi

echo "SSL certificates saved to: $SSL_DIR"
echo ""
echo "To enable HTTPS, update docker-compose.yml to use deploy/nginx/ssl.conf"
