# SecureAccess med MySQL

Nettsiden bruker na en Node.js-server med MySQL i stedet for lokal demo-state i nettleseren.

## Lokalt

1. Kopier `.env.example` til `.env`.
2. Fyll inn databaseverdiene.
3. Kjor `npm install`.
4. Kjor `npm run db:init`.
5. Kjor `npm run db:seed`.
6. Kjor `npm start`.
7. Apne `http://localhost:3000`.

Demo-brukere etter seeding:

- `admin@example.com` / `1234`
- `kevin@example.com` / `1234`

## Ubuntu VM

I denne sesjonen var `172.16.1.172` ikke nabar fra maskinen som kjorte agenten. SSH mot port `22` ga `DestinationHostUnreachable`.

Installer MySQL:

```bash
sudo apt update
sudo apt install -y mysql-server
sudo systemctl enable --now mysql
```

Opprett database og app-bruker i MySQL:

```sql
CREATE DATABASE grupa5_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'secureaccess_app'@'%' IDENTIFIED BY 'BYTT_TIL_ET_STERKT_PASSORD';
GRANT ALL PRIVILEGES ON grupa5_db.* TO 'secureaccess_app'@'%';
FLUSH PRIVILEGES;
```

Hvis databasen skal naes fra andre maskiner, oppdater `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
bind-address = 0.0.0.0
```

Start MySQL pa nytt:

```bash
sudo systemctl restart mysql
sudo ufw allow 3306/tcp
```

Bruk deretter disse verdiene i `.env`:

```env
PORT=3000
DB_HOST=172.16.1.172
DB_PORT=3306
DB_NAME=grupa5_db
DB_USER=secureaccess_app
DB_PASSWORD=BYTT_TIL_ET_STERKT_PASSORD
```
