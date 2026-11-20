#!/usr/bin/env bash
# Run from a Linux VM: sudo bash deploy/azure/backup.sh
set -euo pipefail
umask 077
cd "$(dirname "$0")"
docker compose config --quiet
mkdir -p backups
backup_dir="$(mktemp -d "backups/$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")"
app_id="$(docker compose ps -q app)"
if [[ -z "$app_id" ]]; then
  echo 'Start the app before creating a consistent backup.' >&2
  exit 1
fi
docker compose stop caddy app
trap 'docker compose start app caddy >/dev/null' EXIT
docker compose exec -T mongo sh -c 'exec mongodump --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db fittrack --archive --gzip' > "$backup_dir/mongo.archive.gz"
docker cp "$app_id:/app/.data/uploads/." "$backup_dir/uploads"
cp .env "$backup_dir/server.env"
tar -czf "$backup_dir.tar.gz" -C "$backup_dir" .
sha256sum "$backup_dir.tar.gz" > "$backup_dir.tar.gz.sha256"
echo "Backup created: $PWD/$backup_dir.tar.gz"
echo 'This contains private records, photos and secrets. Store an encrypted copy off this VM.'
echo 'The uncompressed backup directory is retained until you verify the archive.'
