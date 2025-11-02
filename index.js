// index.js
import { Client, GatewayIntentBits, ActivityType } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const activities = [
    { name: "Enjoying iGiveaway 🎃", type: ActivityType.Watching },
    { name: "R.E.P.O with Elon Musk 🍻", type: ActivityType.Playing },
  ];

  let i = 0;
  setInterval(() => {
    const activity = activities[i];
    client.user.setActivity(activity.name, { type: activity.type });
    i = (i + 1) % activities.length;
  }, 10000);
});

client.login(TOKEN);
