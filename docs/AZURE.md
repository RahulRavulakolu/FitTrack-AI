# FitTrack on Azure for Students

Status: prepared locally, **not deployed**. No Azure credit has been spent by this setup. The Android APK still uses its saved server address. Existing records and photos have not been migrated.

## Proposed deployment

Use `api.rahulravulakola.tech` with a Linux virtual machine running the API, MongoDB, Ollama and Caddy. The phone needs internet, but the laptop can be off. The native interface remains bundled in the phone app. The free `qwen3-vl:2b-instruct` model runs on the Azure VM; there is no paid LLM API or model download to the phone.

Candidate: Ubuntu 24.04 LTS, `Standard_D2as_v5` (2 vCPU, 8 GiB RAM), 64 GiB Standard SSD OS disk, one Standard static IPv4 address, Central India. This is a CPU-only starting configuration for personal use, not a measured performance guarantee. Food photos may take substantially longer than on the laptop GPU; validate against the existing 180-second inference timeout. The API allows one inference at a time. Confirm subscription region policy, VM-family quota, capacity and Ubuntu image availability before provisioning.

Microsoft retail prices retrieved on 15 November 2026, USD, 730 hours/month:

| Item | Rate | Estimated month |
| --- | --- | --- |
| Linux D2as v5, Central India | $0.0556/hour | $40.59 |
| Standard SSD E6 LRS, 64 GiB | $5.28/month | $5.28 |
| Standard regional static public IPv4 | $0.005/hour | $3.65 |
| Base total | | **$49.52** |

Disk operations, outbound transfer beyond included allowances, backups, email and applicable taxes are additional. This is a retail estimate, not a subscription quote. Free service allowances may reduce eligible charges. The included small free VM sizes are not interchangeable with this 8 GiB VM. $100 would cover roughly two months of the base estimate if the entire balance remains and does not expire first; other Azure usage consumes the same balance. A cheaper burstable B2as v2 was $0.0492/hour in this region, but its CPU-credit limits make sustained inference less predictable for a saving of about $4.67/month. No reservation or savings-plan commitment is proposed.

Azure for Students credit is valid for 12 months. Check the actual remaining credit and expiry in the [Sponsorships portal](https://www.microsoftazuresponsorships.com/). Keep the student spending limit enabled; do not upgrade to paid billing as part of deployment. The subscription/services can be disabled when credit is exhausted or expires. A budget alert is a notification, not a spending cap. Deallocating the VM stops compute billing but disks, IPs and backups can still incur charges, and the app then stops working.

Sources: [student offer](https://azure.microsoft.com/en-us/free/students/), [credit exhaustion and expiry](https://learn.microsoft.com/en-us/azure/cost-management-billing/manage/azurestudents-subscription-disabled), [retail pricing API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices), [D2as v5 specifications](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dasv5-series).

## Review and provision

`deploy/azure/main.bicep` creates one VM, its 64 GiB disk, VNet/subnet, NIC, static public IP and network security group. It does not create a paid AI service, managed database, gateway or container registry. SSH keys are required; SSH is restricted to the administrator's public IPv4 `/32`. Only ports 80 and 443 are open to the public. `cloud-init.yaml` installs Docker and Compose. Database/model/application ports are not published. VM deletion detaches the disk; resource-group deletion still deletes it, so maintain an off-VM backup.

Before creating resources, sign into the intended student subscription and review its balance, expiry, policies and available VM quota. Use Azure CLI or Cloud Shell to validate and run a `what-if` against the Bicep template. Review all resources and the final price, then approve provisioning. Do not automatically switch subscription, remove a spending limit or choose a larger VM if Azure rejects this size.

Example commands **after the resource creation and cost are approved**, from the source root with Azure CLI available:

```bash
az account show --query '{name:name,id:id,state:state}'
az vm list-skus --location centralindia --size Standard_D2as_v5 --all --output table
# Use a dedicated key. Keep the private key outside this project and backups.
ssh-keygen -t ed25519 -f ~/.ssh/fittrack_azure
az group create --name fittrack --location centralindia
az deployment group what-if --resource-group fittrack \
  --template-file deploy/azure/main.bicep \
  --parameters sshPublicKey="$(cat ~/.ssh/fittrack_azure.pub)" adminSourceCidr=YOUR_PUBLIC_IP/32
az deployment group create --resource-group fittrack \
  --template-file deploy/azure/main.bicep \
  --parameters sshPublicKey="$(cat ~/.ssh/fittrack_azure.pub)" adminSourceCidr=YOUR_PUBLIC_IP/32
```

Replace the example IP; do not use `0.0.0.0/0`. These commands are Linux/Cloud Shell Bash examples. The Bicep file also supports the Azure portal's custom template deployment after compiling it to ARM JSON. Capacity/policy validation needs the actual account and is separate from local template compilation.

## DNS and HTTPS

Public DNS returned NXDOMAIN for `rahulravulakola.tech` and `api.rahulravulakola.tech` during setup. Check the registrar's spelling, registration status and delegated nameservers; this result alone does not establish whether you own the domain. After provisioning, create an **A record** named `api` pointing to the VM's static IPv4 at the provider hosting your authoritative DNS. Preserve unrelated website/email records. Remove a conflicting `api` AAAA record only if it points to a different server. No separate Azure DNS zone is required.

Caddy obtains and renews an HTTPS certificate once DNS points to this VM and inbound 80/443 work. Initially use DNS-only routing if a proxy/CDN is enabled, to verify the direct origin and its certificate. Set `FITTRACK_DOMAIN=api.rahulravulakola.tech`; do not include `https://` in that variable. The app environment derives `APP_ORIGIN` from it.

## Install the app on the VM

1. SSH with the dedicated key and verify the host fingerprint against the VM console. Run `sudo cloud-init status --wait` and `sudo docker compose version`.
2. Transfer a clean source bundle into a dedicated directory such as `/opt/fittrack`. Include `package*.json`, `Dockerfile`, `.dockerignore`, source/config files, `public/`, and `deploy/azure/`. Exclude `.env`, `.data`, `node_modules`, mobile build outputs, signing keys and all backups. Transfer existing user data separately over SSH during the migration below. Never make it public or place it in the Docker build context.
3. In `deploy/azure`, create `.env` from `.env.example` with `umask 077`, generate separate passwords using `openssl rand -hex 32`, and fill in a verified SMTP sender/provider. The database app password must be exactly 64 hexadecimal characters. Edit secrets privately on the VM. The application database user has access only to `fittrack`; root credentials stay in the Mongo container. Changing the .env password does not rotate users on an existing Mongo volume.
4. SMTP submission on 587/465 is needed for password resets. Use a provider you control, with a verified sender. Do not use port 25 or assume the domain registration includes email. No email provider has been provisioned by this package. Startup requires the SMTP settings; actual email delivery must be verified separately.
5. Validate/build without exposing the resolved secrets:

   ```bash
   cd /opt/fittrack/deploy/azure
   sudo docker compose config --quiet
   sudo docker compose build app
   sudo docker compose up -d --wait mongo ollama
   sudo docker compose exec ollama ollama pull qwen3-vl:2b-instruct
   ```

6. **Migrate existing records/photos before starting the app for general use.** If intentionally starting fresh, keep the original laptop data backed up.
7. Start with `sudo docker compose up -d --wait`. Use `sudo docker compose ps` and `sudo docker compose logs --tail=100 app caddy` to diagnose startup. Keep logs private. `docker compose config` without `--quiet` exposes environment secrets.

Compose uses named volumes for MongoDB, photos, model files and TLS. Uploaded photos require the owner's authenticated session. The API remains non-root and has a read-only container filesystem except its upload volume and temporary directory. Docker recreations preserve named volumes; **never run `docker compose down --volumes` on user data**. Keep the Compose project name `fittrack` when updating. Do not scale the app above one API process without implementing distributed mutation locking and rate limiting.

## Migrate existing laptop records

This step has not run. A JSON export from the app is useful for personal records, but does not contain password hashes or all account/session information and is not a full database migration.

1. Keep the laptop API stopped to prevent writes. Back up `.data/mongo` and `.data/uploads` while MongoDB is stopped. Retain the originals.
2. Using the same MongoDB 7.0.24 binary already used by the app, temporarily start the database with `.data/mongo` as its data directory, bound only to `127.0.0.1` on an unused port such as 27018. Never start a second Mongo process against that directory. This is only for export; the phone does not need to connect.
3. Use the official MongoDB Database Tools to export `fittrack` with `mongodump --uri mongodb://127.0.0.1:27018/fittrack --archive=fittrack.archive.gz --gzip`. Stop the temporary Mongo process cleanly afterward. Transfer the archive and the contents of `.data/uploads` using SSH/SCP. These contain private health data; do not commit them.
4. On the VM, keep the API stopped. Restore into the **new empty** database, not an existing account database:

   ```bash
   sudo docker compose exec -T mongo sh -c \
     'exec mongorestore --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --nsInclude "fittrack.*" --archive --gzip' \
     < /private/path/fittrack.archive.gz
   ```

   Do not add `--drop` to make a failed restore succeed. Stop and investigate duplicates or mismatched data.
5. Create the app container with `sudo docker compose create app`. Copy the uploads directory contents into `/app/.data/uploads` in that container using `docker cp`. Set its ownership to UID/GID `1000:1000` in the upload volume (the Node user), using a temporary `docker compose run --rm --no-deps --user root app chown -R node:node /app/.data/uploads`. Ollama must be running because the app shares its network namespace.
6. Compare source/destination collection counts, verify the same account can sign in, and inspect actual food, workout and photo history. Switching the phone's server clears its saved login, so sign in again. Delete migrated Session and ResetToken documents to revoke old authentication/reset links before opening the cloud service to users. Keep old data until acceptance is complete.

## Backups, restore and acceptance

`sudo bash deploy/azure/backup.sh` stops API writes briefly, dumps the database, copies photos and server configuration, and resumes the services. Run it before deployments and regularly. It creates a private directory and `.tar.gz` with a checksum under `deploy/azure/backups/`. The archive and retained directory contain secrets and private records. Encrypt and transfer a copy off the VM; a backup on the VM alone cannot survive loss of its disk. No external backup service or schedule is silently provisioned.

For a restore drill, use a separate isolated VM/Compose project with new Mongo credentials, restore the archive into an empty `fittrack` database, copy uploads and apply Node ownership as in migration. Use a separate temporary HTTPS hostname and never point production DNS at it before verification. Do not overwrite the new environment blindly with the backed-up server.env. Compare record counts and verify account/history/photo access. Restore drills and off-VM backups remain required operational steps; they have not been executed locally.

Before switching the phone:

- `https://api.rahulravulakola.tech/api/health` must return HTTP 200 with `{"status":"ok"}` and a valid certificate. This only verifies the API/database; it is not an AI check.
- Confirm saved history and private photos; another account and a signed-out client must not access those photos.
- Upload an actual food image, review the estimate, and try the assistant and routine generation. Check response time and VM RAM; never substitute fabricated data for failed inference.
- Test an actual password-reset email and native reset link.
- Reboot the VM, confirm containers restart and records/photos/model remain. Recheck the API and AI.
- In the installed phone app's server settings, enter `https://api.rahulravulakola.tech`. No `/api` suffix. Sign in, turn phone Wi-Fi off, and verify saved records, a new log, an AI photo and Health Connect sync on mobile data while laptop services remain stopped.

The existing Android build supports changing its server address, so a rebuild is not required for cloud connection. A later build can set `VITE_API_URL` after the public endpoint passes verification. iOS still requires macOS/Xcode and Apple signing. No signed iOS build has been produced here.
