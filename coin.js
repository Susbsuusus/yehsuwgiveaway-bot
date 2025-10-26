import fs from "fs";
import path from "path";
import { EmbedBuilder } from "discord.js";

const dataFile = path.join(process.cwd(), "coins.json");

// 📊 لود و ذخیره داده‌ها
function loadCoins() {
  if (!fs.existsSync(dataFile)) return {};
  return JSON.parse(fs.readFileSync(dataFile));
}

function saveCoins(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// 💰 گرفتن کوین کاربر
export function getCoins(userId) {
  const coins = loadCoins();
  return coins[userId] || 0;
}

// 💰 تغییر مقدار کوین
export function setCoins(userId, amount) {
  const coins = loadCoins();
  coins[userId] = amount;
  saveCoins(coins);
}

// 💰 اضافه/کم کردن کوین
export function addCoins(userId, amount) {
  const coins = loadCoins();
  coins[userId] = (coins[userId] || 0) + amount;
  saveCoins(coins);
  return coins[userId];
}

// ⚙️ تنظیمات قابل تغییر
export const boostCost = 300; // هزینه بوست
export const boostRate = 3; // ضریب شانس در گیواوی

// 🎲 دستور !cflip
export async function handleCoinFlip(message) {
  const userId = message.author.id;
  const coins = getCoins(userId);

  if (coins <= 0) {
    const embed = new EmbedBuilder()
      .setColor("#ef4444")
      .setTitle("💸 سکه نداری!")
      .setDescription("با جیب خالی اومدی شرط ببندی؟ برو یه کم جمع کن 😤");
    return message.reply({ embeds: [embed] });
  }

  const win = Math.random() < 0.5;
  const change = Math.floor(Math.random() * 50) + 10;
  let newCoins = coins;

  if (win) {
    newCoins = addCoins(userId, change);
  } else {
    newCoins = addCoins(userId, -change);
  }

  const embed = new EmbedBuilder()
    .setTitle(win ? "🏆 بردی!" : "💀 باختی!")
    .setColor(win ? "#22c55e" : "#ef4444")
    .setDescription(
      win
        ? `بابا باریکلا! برنده شدی و **${change}** کوین گرفتی! 🚀`
        : `برو بیرون! باختی و **${change}** کوین از دست دادی! (ناراحت نباش بفرما 🍭)`
    )
    .setFooter({ text: `موجودی فعلی: ${newCoins} 🪙` });

  message.reply({ embeds: [embed] });
}

// 💳 دستور !cbalance
export async function handleBalance(message) {
  const coins = getCoins(message.author.id);
  const embed = new EmbedBuilder()
    .setColor("#facc15")
    .setTitle("💰 موجودی حساب")
    .setDescription(`تو الان **${coins}** کوین داری 🪙`)
    .setFooter({ text: "کار کن تا پولدار شی 😎" });

  message.reply({ embeds: [embed] });
}
