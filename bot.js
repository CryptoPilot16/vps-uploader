const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// --- Config ---
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_USER_ID = parseInt(process.env.ALLOWED_USER_ID);
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/home/pilot/inbox';

if (!TOKEN || !ALLOWED_USER_ID) {
  console.error('Missing TELEGRAM_BOT_TOKEN or ALLOWED_USER_ID in env');
  process.exit(1);
}

// Ensure upload dir exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const bot = new TelegramBot(TOKEN, { polling: true });

// --- Auth guard ---
function isAllowed(msg) {
  return msg.from.id === ALLOWED_USER_ID;
}

// --- Generate filename with timestamp ---
function makeFilename(originalName) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext = path.extname(originalName || '.bin') || '.bin';
  const base = path.basename(originalName || 'file', ext).slice(0, 30);
  return `${ts}_${base}${ext}`;
}

// --- Download file from Telegram servers ---
async function downloadFile(fileId) {
  const file = await bot.getFile(fileId);
  const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
  const originalName = path.basename(file.file_path);

  return new Promise((resolve, reject) => {
    const filename = makeFilename(originalName);
    const dest = path.join(UPLOAD_DIR, filename);
    const ws = fs.createWriteStream(dest);

    https.get(url, (res) => {
      res.pipe(ws);
      ws.on('finish', () => {
        ws.close();
        resolve(dest);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// --- Handle photos ---
bot.on('photo', async (msg) => {
  if (!isAllowed(msg)) return;

  try {
    // Grab highest resolution
    const photo = msg.photo[msg.photo.length - 1];
    const savedPath = await downloadFile(photo.file_id);

    await bot.sendMessage(msg.chat.id,
      `\`${savedPath}\``,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('Photo error:', err);
    await bot.sendMessage(msg.chat.id, `❌ Failed: ${err.message}`);
  }
});

// --- Handle documents (any file type) ---
bot.on('document', async (msg) => {
  if (!isAllowed(msg)) return;

  try {
    const doc = msg.document;
    const file = await bot.getFile(doc.file_id);
    const url = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;

    const filename = makeFilename(doc.file_name);
    const dest = path.join(UPLOAD_DIR, filename);

    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(dest);
      https.get(url, (res) => {
        res.pipe(ws);
        ws.on('finish', () => { ws.close(); resolve(); });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });

    await bot.sendMessage(msg.chat.id,
      `\`${dest}\``,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('Document error:', err);
    await bot.sendMessage(msg.chat.id, `❌ Failed: ${err.message}`);
  }
});

// --- Handle video ---
bot.on('video', async (msg) => {
  if (!isAllowed(msg)) return;

  try {
    const savedPath = await downloadFile(msg.video.file_id);
    await bot.sendMessage(msg.chat.id,
      `\`${savedPath}\``,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('Video error:', err);
    await bot.sendMessage(msg.chat.id, `❌ Failed: ${err.message}`);
  }
});

// --- Handle voice/audio ---
bot.on('voice', async (msg) => {
  if (!isAllowed(msg)) return;

  try {
    const savedPath = await downloadFile(msg.voice.file_id);
    await bot.sendMessage(msg.chat.id,
      `\`${savedPath}\``,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('Voice error:', err);
    await bot.sendMessage(msg.chat.id, `❌ Failed: ${err.message}`);
  }
});

bot.on('audio', async (msg) => {
  if (!isAllowed(msg)) return;

  try {
    const savedPath = await downloadFile(msg.audio.file_id);
    await bot.sendMessage(msg.chat.id,
      `\`${savedPath}\``,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('Audio error:', err);
    await bot.sendMessage(msg.chat.id, `❌ Failed: ${err.message}`);
  }
});

// --- Commands ---
bot.onText(/\/start/, (msg) => {
  if (!isAllowed(msg)) return;
  bot.sendMessage(msg.chat.id,
    '📂 *VPS Uploader*\n\nDrop any image, file, video, or audio.\nI\'ll save it and give you the path to paste into terminal.',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/help/, (msg) => {
  if (!isAllowed(msg)) return;
  bot.sendMessage(msg.chat.id,
    '*Commands*\n\n' +
    '/help — show this message\n' +
    '/list — show last 10 uploaded files\n' +
    '/clear — delete all files in inbox\n\n' +
    'Send any image, file, video, or audio to upload it.',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/(list|ls)/, async (msg) => {
  if (!isAllowed(msg)) return;

  try {
    const files = fs.readdirSync(UPLOAD_DIR)
      .sort()
      .slice(-10)
      .map(f => `\`${path.join(UPLOAD_DIR, f)}\``)
      .join('\n');

    await bot.sendMessage(msg.chat.id,
      files || 'Inbox is empty.',
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    await bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
  }
});

bot.onText(/\/clear/, async (msg) => {
  if (!isAllowed(msg)) return;

  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    files.forEach(f => fs.unlinkSync(path.join(UPLOAD_DIR, f)));
    await bot.sendMessage(msg.chat.id, `🗑 Cleared ${files.length} files.`);
  } catch (err) {
    await bot.sendMessage(msg.chat.id, `❌ ${err.message}`);
  }
});

console.log(`📂 VPS Uploader running. Saving to ${UPLOAD_DIR}`);
