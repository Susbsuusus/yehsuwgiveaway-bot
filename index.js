// index.js
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // ست کردن چند اکتیویتی پشت‌سر‌هم
  const activities = [
    {
      name: "Enjoying iGiveaway 🎃",
      type: ActivityType.Watching, // Watching
    },
    {
      name: "R.E.P.O with Elon Musk 🍻",
      type: ActivityType.Playing, // Playing
    },
  ];

  let i = 0;
  setInterval(() => {
    const activity = activities[i];
    client.user.setActivity(activity.name, { type: activity.type });
    i = (i + 1) % activities.length;
  }, 10000); // هر 10 ثانیه تغییر می‌کند
});

client.login(process.env.TOKEN);
