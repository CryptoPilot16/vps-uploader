# 📂 VPS Uploader

A personal Telegram bot that receives images, files, video, and audio — saves them to your VPS inbox and replies with the path. Drop a file from your phone → get a path → paste into Claude Code or terminal.

## Deploy (2 minutes)

### 1. Create bot via @BotFather
- Message @BotFather on Telegram
- `/newbot` → name it whatever you like
- Copy the token

### 2. Get your Telegram user ID
- Message @userinfobot on Telegram
- It replies with your numeric ID

### 3. Deploy to VPS
```bash
sudo mkdir -p /opt/uploader
sudo cp -r ./* /opt/uploader/
cd /opt/uploader
npm install

# Edit ecosystem.config.js with your token + user ID
nano ecosystem.config.js

mkdir -p /opt/uploader/inbox
pm2 start ecosystem.config.js
pm2 save
```

## Commands

| Command | Description |
|---------|-------------|
| `/help` | Show available commands |
| `/list` | Show last 10 files in inbox |
| `/clear` | Delete all files in inbox |

## Supported File Types

Send any of the following and the bot saves it to `/opt/uploader/inbox/` and replies with the full path:

- 🖼 Photos / images
- 📄 Documents (any format)
- 🎬 Videos
- 🎙 Voice messages / audio

## Workflow

1. Screenshot something on your phone
2. Send it to the bot in Telegram
3. Bot replies: `` `/opt/uploader/inbox/2026-04-08T12-30-45_photo.jpg` ``
4. Paste that path into Claude Code or your terminal

## Notes

- Only your Telegram user ID can interact with it (auth guard in `bot.js`)
- Telegram bot API file size limit: 20 MB
- Run `/clear` when the inbox gets cluttered
