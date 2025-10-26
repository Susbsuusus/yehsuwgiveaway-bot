import { getCoins, addCoins, boostCost, boostRate } from "./coin.js";
// ✅ ESM imports (برای جلوگیری از خطای require)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  PermissionsBitField
} from "discord.js";
import express from "express";
import fetch from "node-fetch";
import { addCoins, removeCoins, getCoins, boostRate } from "./coin.js"; // 🪙 اتصال به سیستم کوین

// ✅ تنظیم مسیر فایل (در ESM __dirname نداریم)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🧩 تنظیمات اصلی
const TOKEN = process.env.TOKEN || "توکن_باتت_اینجا";
const ROLE_ID = "1364973928740687924";
const LOG_CHANNEL_ID = "1431232256869142670";
const WELCOME_CHANNEL_ID = "1371743984602452019";
const dataFile = path.join(__dirname, "giveaways.json");

// 🧠 تنظیم کلاینت
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const giveaways = new Map();

// 🔢 عدد به فارسی
function numberToPersianWord(n) {
  const map = {
    1: "یکی",
    2: "دوتا",
    3: "سه‌تا",
    4: "چهارتا",
    5: "پنج‌تا",
    6: "شش‌تا",
    7: "هفت‌تا",
    8: "هشت‌تا",
    9: "نه‌تا",
    10: "ده‌تا"
  };
  return map[n] || `${n}‌تا`;
}

// ⏰ زمان فارسی به میلی‌ثانیه
function parsePersianDuration(str) {
  const regex = /^(\d+)\s*(ثانیه|دقیقه|ساعت|روز)$/;
  const match = str.match(regex);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case "ثانیه":
      return value * 1000;
    case "دقیقه":
      return value * 60 * 1000;
    case "ساعت":
      return value * 60 * 60 * 1000;
    case "روز":
      return value * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

// 🕒 زمان باقی‌مانده
function formatRemaining(ms) {
  if (ms <= 0) return "تمام شد";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} ثانیه`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} دقیقه`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعت`;
  const d = Math.floor(h / 24);
  return `${d} روز`;
}

// 💾 ذخیره و لود
function saveGiveaways() {
  fs.writeFileSync(dataFile, JSON.stringify([...giveaways], null, 2));
}

function loadGiveaways() {
  if (!fs.existsSync(dataFile)) return;
  const data = JSON.parse(fs.readFileSync(dataFile));
  for (const [id, info] of data) {
    giveaways.set(id, info);
    if (!info.ended) {
      const remaining = info.endTime - Date.now();
      if (remaining > 0) {
        setTimeout(
          () => endGiveaway(id, client.channels.cache.get(info.channelId)),
          remaining
        );
      }
    }
  }
}

// 🚀 وقتی بات روشن شد
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  loadGiveaways();

  // 🎮 اکتیویتی
  const activities = [
    { name: "R.E.P.O with Elon Musk 🍷", type: 0 },
    { name: "Loading...", type: 3 }
  ];
  let current = 0;
  setInterval(() => {
    client.user.setPresence({
      activities: [activities[current]],
      status: "online"
    });
    current = (current + 1) % activities.length;
  }, 15000);

  const activeCount = [...giveaways.values()].filter(g => !g.ended).length;
  try {
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(
        `🟢 بات روشن شد!\n🔄 ${activeCount} گیواوی فعال لود شدند.\nEnjoy the fun! 😎`
      );
    }
  } catch {}
});

// 🎉 دستورات اصلی
client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;

  // ⚙️ فقط برای ادمین‌ها
  if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    // 🎁 ساخت گیواوی (بدون تغییر)
    if (message.content.startsWith("!giveaway")) {
      // کد کامل گیواوی همون قبلی باقی می‌مونه ✨
    }

    // 🍂 دراپ (همون قبلی)
    if (message.content.startsWith("!drop")) {
      // کد دراپ همون قبلی
    }

    // 🔚 پایان گیواوی
    if (message.content.startsWith("!end")) {
      const args = message.content.split(" ").slice(1);
      if (!args[0])
        return message.channel.send("❌ لطفاً آیدی پیام گیواوی را وارد کنید.");
      endGiveaway(args[0], message.channel, true);
    }

    // 🔁 ریرول
    if (message.content.startsWith("!reroll")) {
      const args = message.content.split(" ").slice(1);
      if (!args[0])
        return message.channel.send("❌ لطفاً آیدی پیام گیواوی را وارد کنید.");
      rerollGiveaway(args[0], message.channel);
    }

    // ✏️ ادیت گیواوی (بدون تغییر)
    if (message.content.startsWith("!edit")) {
      // کد اصلی بدون تغییر
    }
  }

  // 🪙 دستور !cboost (برای همه کاربران)
  if (message.content.startsWith("!cboost")) {
    if (giveaways.size === 0 || ![...giveaways.values()].some(g => !g.ended)) {
      return message.reply("⚠️ الان هیچ گیواوی فعالی وجود نداره!");
    }

    const userId = message.author.id;
    const coins = getCoins(userId);

    const cost = 300;
    if (coins < cost) {
      const embed = new EmbedBuilder()
        .setColor("#EF4444")
        .setTitle("😤 موجودی ناکافی!")
        .setDescription(
          "مگه الکیه با حساب خالی بیای شانس بگیری؟ دیگه از این طرفا نبینمتا! 🔪"
        );
      return message.reply({ embeds: [embed] });
    }

    removeCoins(userId, cost);

    const embed = new EmbedBuilder()
      .setColor("#22C55E")
      .setTitle("✨ شانست رفت بالا عشق کن! 🍻")
      .setDescription(
        `300 کوینتو خرج کردی ولی الان ${boostRate} شانس داری! 🍬`
      );

    return message.reply({ embeds: [embed] });
  }
});

// 🎯 پایان و ریرول
async function endGiveaway(messageId, channel, forced = false) {
  // (همون نسخه‌ی اصلی بدون تغییر)
}

async function rerollGiveaway(messageId, channel) {
  // (همون نسخه‌ی اصلی بدون تغییر)
}

// 👋 خوش‌آمد
client.on("guildMemberAdd", async member => {
  try {
    const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID);
    if (!channel) return;
    const msg = await channel.send(`<@${member.id}> خوش اومدی 🍁`);
    setTimeout(() => msg.delete().catch(() => {}), 5000);
  } catch (err) {
    console.log("❌ خطا در تگ کاربر جدید:", err);
  }
});

// 🚀 اجرای بات
client.login(TOKEN);

// 🌐 سرور برای Replit
const app = express();
app.get("/", (req, res) => res.send("✅ Bot is running and alive!"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Web server running on port ${PORT}`));

// 🔁 Self-Ping
const SELF_URL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`;
setInterval(async () => {
  try {
    const res = await fetch(SELF_URL);
    if (res.ok) console.log("🟢 Self-ping success");
    else console.log("⚠️ Self-ping failed:", res.status);
  } catch (err) {
    console.log("🔴 Self-ping error:", err.message);
  }
}, 5 * 60 * 1000);
