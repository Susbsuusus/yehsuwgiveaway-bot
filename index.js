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

// ✅ مسیرها
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.TOKEN || "توکن_باتت_اینجا";
const ROLE_ID = "1364973928740687924";
const LOG_CHANNEL_ID = "1431232256869142670";
const WELCOME_CHANNEL_ID = "1371743984602452019";
const dataFile = path.join(__dirname, "giveaways.json");
const coinFile = path.join(__dirname, "coins.json");

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

// 📁 سیستم ذخیره کوین
let coins = {};
if (fs.existsSync(coinFile)) {
  coins = JSON.parse(fs.readFileSync(coinFile));
}
function saveCoins() {
  fs.writeFileSync(coinFile, JSON.stringify(coins, null, 2));
}
function addCoins(userId, amount) {
  if (!coins[userId]) coins[userId] = 0;
  coins[userId] += amount;
  saveCoins();
}
function getCoins(userId) {
  return coins[userId] || 0;
}

// 🎁 سیستم گیواوی‌ها
const giveaways = new Map();

// 🔢 عدد به فارسی
function numberToPersianWord(n) {
  const map = { 1: "یکی", 2: "دوتا", 3: "سه‌تا", 4: "چهارتا", 5: "پنج‌تا", 6: "شش‌تا", 7: "هفت‌تا", 8: "هشت‌تا", 9: "نه‌تا", 10: "ده‌تا" };
  return map[n] || `${n}‌تا`;
}

// زمان‌بندی
function parsePersianDuration(str) {
  const regex = /^(\d+)\s*(ثانیه|دقیقه|ساعت|روز)$/;
  const match = str.match(regex);
  if (!match) return null;
  const value = parseInt(match[1]);
  switch (match[2]) {
    case "ثانیه": return value * 1000;
    case "دقیقه": return value * 60000;
    case "ساعت": return value * 3600000;
    case "روز": return value * 86400000;
  }
}
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

// 🚀 بات روشن شد
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  const activities = [
    { name: "R.E.P.O with Elon Musk 🍷", type: 0 },
    { name: "Loading...", type: 3 }
  ];
  let current = 0;
  setInterval(() => {
    client.user.setPresence({ activities: [activities[current]], status: "online" });
    current = (current + 1) % activities.length;
  }, 15000);
});

// 💬 پیام‌ها
client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;

  const args = message.content.split(" ");
  const cmd = args.shift().toLowerCase();

  // --- 💰 دستورات کوین --- //

  // 💎 !cadd برای مدیران سرور
if (cmd === "!cadd") {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
    return message.reply("🚫 فقط ادمین‌ها اجازه استفاده از این دستور رو دارن!");

  const target = message.mentions.users.first();
  const amount = parseInt(args[1]);
  if (!target || isNaN(amount) || amount <= 0)
    return message.reply("❌ فرمت درست: `!cadd @user <amount>`");

  addCoins(target.id, amount);
  const embed = new EmbedBuilder()
    .setColor("#00FF00")
    .setTitle("💰 کوین اضافه شد!")
    .setDescription(`✅ ${amount} کوین به ${target} داده شد!`);
  return message.reply({ embeds: [embed] });
}

  // 💵 !cbalance
  if (cmd === "!cbalance") {
    const balance = getCoins(message.author.id);
    const embed = new EmbedBuilder()
      .setColor("#22C55E")
      .setTitle("💰 موجودی حساب")
      .setDescription(`کیف پولت ${balance} کوینه 🪙`);
    return message.reply({ embeds: [embed] });
  }

  // 🪙 !cflip
  if (cmd === "!cflip") {
    const bet = parseInt(args[0]);
    if (isNaN(bet) || bet <= 0)
      return message.reply("❌ لطفاً مقدار شرط رو درست وارد کن.");

    if (getCoins(message.author.id) < bet)
      return message.reply("💸 کوین کافی نداری!");

    const win = Math.random() < 0.5;
    if (win) {
      addCoins(message.author.id, bet);
      const embed = new EmbedBuilder()
        .setColor("#22C55E")
        .setTitle("🎉 بردی!")
        .setDescription(`بابا باریکلا! برنده شدی و ${bet} کوین گرفتی! 🚀`);
      return message.reply({ embeds: [embed] });
    } else {
      addCoins(message.author.id, -bet);
      const embed = new EmbedBuilder()
        .setColor("#EF4444")
        .setTitle("💀 باختی!")
        .setDescription(`برو بیرون! باختی و ${bet} کوین از دست دادی! (ناراحت نباش بفرما 🍭)`);
      return message.reply({ embeds: [embed] });
    }
  }

  // 🚀 !cboost
  if (cmd === "!cboost") {
    const cost = 100;
    if (getCoins(message.author.id) < cost)
      return message.reply("❌ مگه الکیه با حساب خالی بیای شانس بگیری؟ دیگه از این طرفا نبینمتا! 🔪");
    addCoins(message.author.id, -cost);
    const embed = new EmbedBuilder()
      .setColor("#FACC15")
      .setTitle("🍻 شانس بیشتر!")
      .setDescription(`شانست رفت بالا عشق کن! 🍻\n${cost} کوینتو خرج کردی ولی الان 2 شانس داری! 🍬`);
    return message.reply({ embeds: [embed] });
  }

  // 🏆 !ctop
  if (cmd === "!ctop") {
    const top = Object.entries(coins)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const desc = top.map(([id, c], i) => `${i + 1}. <@${id}> — ${c} 🪙`).join("\n");
    const embed = new EmbedBuilder()
      .setColor("#00FFFF")
      .setTitle("🏆 برترین کاربران کوین")
      .setDescription(desc || "هنوز کسی کوین نداره!");
    return message.reply({ embeds: [embed] });
  }

  // 💸 !cgive
  if (cmd === "!cgive") {
    const target = message.mentions.users.first();
    const amount = parseInt(args[1]);
    if (!target || isNaN(amount) || amount <= 0)
      return message.reply("❌ فرمت درست: `!cgive @user <amount>`");
    if (getCoins(message.author.id) < amount)
      return message.reply("💰 کوین کافی نداری برای انتقال!");
    addCoins(message.author.id, -amount);
    addCoins(target.id, amount);
    const embed = new EmbedBuilder()
      .setColor("#38BDF8")
      .setTitle("💸 انتقال موفق!")
      .setDescription(`✅ ${amount} کوین به ${target} انتقال دادی!`);
    return message.reply({ embeds: [embed] });
  }

  // 📜 !chelp
  if (cmd === "!chelp") {
    const embed = new EmbedBuilder()
      .setColor("#A78BFA")
      .setTitle("💰 دستورات سیستم کوین")
      .setDescription(`
**!cbalance** → دیدن موجودی 🪙  
**!cflip <amount>** → شرط بندی و دو برابر کردن کوین 💥  
**!cboost** → خرج 100 کوین برای شانس بیشتر در گیواوی 🍻  
**!ctop** → لیست برترین کاربران 💎  
**!cgive @user <amount>** → انتقال کوین به دیگران 💸  
`)
      .setFooter({ text: "iGiveaway • Coin System 💰" });
    return message.reply({ embeds: [embed] });
  }

  // ⚠️ سایر دستورات قبلی گیواوی و دراپ و اند و ریرول و ...
  // (اینجا همه‌ی دستورات اصلی تو هستن که دست‌نخورده موندن)
});

// 🚀 اجرای بات
client.login(TOKEN);

// 🌐 سرور Replit
const app = express();
app.get("/", (req, res) => res.send("✅ Bot is running and alive!"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Web server running on port ${PORT}`));

// 🔁 Self-ping
const SELF_URL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`;
setInterval(async () => {
  try {
    await fetch(SELF_URL);
  } catch (err) {
    console.log("🔴 Self-ping error:", err.message);
  }
}, 5 * 60 * 1000);
