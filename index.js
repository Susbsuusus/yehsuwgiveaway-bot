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

  const activeCount = [...giveaways.values()].filter(g => !g.ended).length;
  try {
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(
        `🟢 بات روشن شد!\n🔄 ${activeCount} گیواوی در حال اجرا لود شدند.\nEnjoy the fun! 😎`
      );
    }
  } catch {}
});

// 🎉 دستورات اصلی
client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
    return;

  // 🎁 ساخت گیواوی
  if (message.content.startsWith("!giveaway")) {
    const args = message.content.split(" ").slice(1);
    if (args.length < 3)
      return message.channel.send(
        "❌ فرمت: `!giveaway <تعداد_برنده> <مدت> <جایزه>`"
      );

    const winnersCount = parseInt(args[0]);
    const durationStr = args[1];
    const prize = args.slice(2).join(" ");

    if (isNaN(winnersCount) || winnersCount < 1)
      return message.channel.send("❌ تعداد برنده باید بیشتر از 0 باشد.");

    const duration = parsePersianDuration(durationStr);
    if (duration === null)
      return message.channel.send("❌ زمان واردشده معتبر نیست.");

    setTimeout(() => message.delete().catch(() => {}), 1000);

    const startTime = Date.now();
    const endTime = startTime + duration;

    const embed = new EmbedBuilder()
      .setColor("#D97706")
      .setTitle("🎃🍂🎉 گیواوی شروع شد! 🎉🍂🎃")
      .setDescription(`🍁 برای شرکت در گیواوی روی 🍁 کلیک کنید!`)
      .addFields(
        { name: "🌾 برنده", value: "در حال انتخاب...", inline: false },
        {
          name: "🍃 تعداد برنده",
          value: numberToPersianWord(winnersCount),
          inline: true
        },
        { name: "🎁 جایزه", value: prize, inline: true },
        { name: "🕗 وضعیت", value: "در حال اجرا 🍂", inline: true },
        { name: "⌛ زمان باقی‌مانده", value: formatRemaining(duration), inline: true }
      )
      .setTimestamp(endTime)
      .setFooter({ text: "iGiveaway • Enjoy the fun! 🍁" });

    const giveawayMessage = await message.channel.send({ embeds: [embed] });
    await giveawayMessage.react("🍁");

    giveaways.set(giveawayMessage.id, {
      messageId: giveawayMessage.id,
      channelId: message.channel.id,
      guildId: message.guild.id,
      prize,
      winnersCount,
      endTime,
      ended: false
    });

    saveGiveaways();
    setTimeout(() => endGiveaway(giveawayMessage.id, message.channel), duration);
  }

  // 🍂 دراپ
  if (message.content.startsWith("!drop")) {
    const args = message.content.split(" ").slice(1);
    if (args.length < 1)
      return message.channel.send("❌ فرمت: `!drop <جایزه>`");
    const prize = args.join(" ");
    setTimeout(() => message.delete().catch(() => {}), 1000);

    const embed = new EmbedBuilder()
      .setColor("#F97316")
      .setTitle("🍂🎃 دراپ جدید شروع شد! 🎃🍂")
      .setDescription(`🍁 اولین کسی که روی 🍁 کلیک کنه، برنده **${prize}** میشه!`)
      .setFooter({ text: "iGiveaway • Fall Drop 🍁" });

    const dropMsg = await message.channel.send({
      content: `<@&${ROLE_ID}> 🍁`,
      embeds: [embed]
    });

    await dropMsg.react("🍁");

    const filter = (reaction, user) => reaction.emoji.name === "🍁" && !user.bot;
    const collector = dropMsg.createReactionCollector({ filter, max: 1, time: 60000 });

    collector.on("collect", async (reaction, user) => {
      await dropMsg.reactions.removeAll().catch(() => {});
      const winnerEmbed = EmbedBuilder.from(embed)
        .setTitle("🏆🍁 دراپ به پایان رسید! 🍁🏆")
        .setDescription(`🎉 <@${user.id}> برنده **${prize}** شد! 🎉`)
        .setColor("#22C55E");
      await dropMsg.edit({ embeds: [winnerEmbed], content: null });
    });

    collector.on("end", collected => {
      if (collected.size === 0) {
        const endEmbed = EmbedBuilder.from(embed)
          .setTitle("🍂 دراپ به پایان رسید! 🍂")
          .setDescription(`😢 کسی روی 🍁 کلیک نکرد.\nدراپ لغو شد.`)
          .setColor("#EF4444");
        dropMsg.edit({ embeds: [endEmbed], content: null });
      }
    });
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

  // ✏️ ادیت گیواوی
  if (message.content.startsWith("!edit")) {
    const args = message.content.split(" ").slice(1);
    if (args.length < 4)
      return message.channel.send(
        "❌ فرمت: `!edit <messageId> <تعداد_برنده> <مدت> <جایزه>`"
      );

    const messageId = args[0];
    const winnersCount = parseInt(args[1]);
    const durationStr = args[2];
    const prize = args.slice(3).join(" ");
    const data = giveaways.get(messageId);
    if (!data) return message.channel.send("⚠️ گیواوی‌ای با این آیدی پیدا نشد.");
    if (data.ended) return message.channel.send("⚠️ این گیواوی قبلاً تمام شده است.");

    const duration = parsePersianDuration(durationStr);
    if (!duration) return message.channel.send("❌ زمان وارد شده معتبر نیست.");

    const newEnd = Date.now() + duration;
    data.winnersCount = winnersCount;
    data.prize = prize;
    data.endTime = newEnd;
    saveGiveaways();

    const ch = await client.channels.fetch(data.channelId);
    const msg = await ch.messages.fetch(data.messageId);
    const newEmbed = EmbedBuilder.from(msg.embeds[0])
      .spliceFields(
        0,
        5,
        { name: "🌾 برنده", value: "در حال انتخاب...", inline: false },
        {
          name: "🍃 تعداد برنده",
          value: numberToPersianWord(winnersCount),
          inline: true
        },
        { name: "🎁 جایزه", value: prize, inline: true },
        { name: "🕗 وضعیت", value: "ویرایش‌شده", inline: true },
        { name: "⌛ زمان باقی‌مانده", value: formatRemaining(duration), inline: true }
      )
      .setColor("#FEE75C")
      .setTitle("✏️🎉 گیواوی ویرایش شد! 🎉✏️")
      .setTimestamp(newEnd)
      .setFooter({ text: "iGiveaway • Enjoy the fun! 😎" });

    await msg.edit({ embeds: [newEmbed] });
    message.channel.send("✅ گیواوی با موفقیت ویرایش شد.");
    setTimeout(() => endGiveaway(messageId, ch), duration);
  }
});

// 🎯 پایان و ریرول
async function endGiveaway(messageId, channel, forced = false) {
  const data = giveaways.get(messageId);
  if (!data) return channel.send("⚠️ گیواوی‌ای با این آیدی پیدا نشد.");
  if (data.ended) return;

  data.ended = true;
  saveGiveaways();

  const ch = await client.channels.fetch(data.channelId);
  const msg = await ch.messages.fetch(data.messageId);
  const reaction = msg.reactions.cache.get("🍁");
  if (!reaction) return channel.send("⚠️ کسی شرکت نکرده است.");

  const users = await reaction.users.fetch();
  const participants = users.filter(u => !u.bot);
  if (participants.size === 0) return channel.send("⚠️ کسی شرکت نکرده است.");

  const winners = [];
  const arr = Array.from(participants.values());
  for (let i = 0; i < data.winnersCount && arr.length > 0; i++) {
    const index = Math.floor(Math.random() * arr.length);
    winners.push(arr.splice(index, 1)[0]);
  }

  const mentions = winners.map(w => `<@${w.id}>`).join(", ");
  const embed = EmbedBuilder.from(msg.embeds[0])
    .spliceFields(
      0,
      5,
      { name: "🌾 برنده", value: mentions, inline: false },
      {
        name: "🍃 تعداد برنده",
        value: numberToPersianWord(data.winnersCount),
        inline: true
      },
      { name: "🎁 جایزه", value: data.prize, inline: true },
      {
        name: "🕗 وضعیت",
        value: forced ? "❗ پایان دستی" : "✅ پایان خودکار",
        inline: true
      },
      { name: "⌛ زمان باقی‌مانده", value: "تمام شد", inline: true }
    )
    .setTitle("🏆🎉 گیواوی تمام شد! 🎉🏆")
    .setColor("#57F287")
    .setFooter({ text: "iGiveaway • Enjoy the fun! 😎" });

  await msg.edit({ embeds: [embed] });
  channel.send(`🎊 تبریک به ${mentions}! شما برنده جایزه **${data.prize}** شدید! 🥳`);
}

async function rerollGiveaway(messageId, channel) {
  const data = giveaways.get(messageId);
  if (!data || !data.ended)
    return channel.send("⚠️ این گیواوی هنوز تمام نشده است.");

  const ch = await client.channels.fetch(data.channelId);
  const msg = await ch.messages.fetch(data.messageId);
  const reaction = msg.reactions.cache.get("🍁");
  if (!reaction) return channel.send("⚠️ کسی شرکت نکرده است.");

  const users = await reaction.users.fetch();
  const participants = users.filter(u => !u.bot);
  if (participants.size === 0) return channel.send("⚠️ کسی شرکت نکرده است.");

  const winners = [];
  const arr = Array.from(participants.values());
  for (let i = 0; i < data.winnersCount && arr.length > 0; i++) {
    const index = Math.floor(Math.random() * arr.length);
    winners.push(arr.splice(index, 1)[0]);
  }

  const mentions = winners.map(w => `<@${w.id}>`).join(", ");
  channel.send(`🔁 برنده‌های جدید: ${mentions}`);
}

// 👋 تگ خوش‌آمد
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

// 🔁 Self-Ping برای روشن ماندن همیشگی
const SELF_URL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`;
setInterval(async () => {
  try {
    const res = await fetch(SELF_URL);
    if (res.ok) console.log("🟢 Self-ping success");
    else console.log("⚠️ Self-ping failed:", res.status);
  } catch (err) {
    console.log("🔴 Self-ping error:", err.message);
  }
}, 5 * 60 * 1000); // هر ۵ دقیقه خودش رو پینگ می‌کنه