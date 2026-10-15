#!/bin/sh
# Container start for Render: prepare storage, trust Aiven's CA, migrate, then serve.
set -e
cd /var/www/html

# Render's persistent disk mounts over storage/app, so recreate what Laravel needs.
mkdir -p storage/app/private storage/framework/cache storage/framework/sessions storage/framework/views storage/logs
chown -R www-data:www-data storage bootstrap/cache

# Aiven requires TLS. Paste the CA certificate (ca.pem) into the AIVEN_CA_PEM variable.
if [ -n "$AIVEN_CA_PEM" ]; then
  printf '%s\n' "$AIVEN_CA_PEM" > /etc/ssl/aiven-ca.pem
  export MYSQL_ATTR_SSL_CA=/etc/ssl/aiven-ca.pem
fi

php artisan config:cache
# A failed migration stops the container, so Render keeps the previous version running.
php artisan migrate --force

# Apache refuses to start with more than one MPM; keep only prefork (mod_php needs it).
rm -f /etc/apache2/mods-enabled/mpm_*.load /etc/apache2/mods-enabled/mpm_*.conf
a2enmod mpm_prefork > /dev/null
echo "Apache MPM files enabled:"
ls /etc/apache2/mods-enabled | grep -i mpm || true
echo "LoadModule mpm lines in Apache config:"
grep -rn "LoadModule mpm_" /etc/apache2 2>/dev/null || true

exec apache2-foreground
