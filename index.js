import {
  Client,
  GatewayIntentBits,
  ActivityType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!";
const activities = [
  { name: "Enjoying iGiveaway 🎃", type: ActivityType.Watching },
  { name: "R.E.P.O with Elon Musk 🍻", type: ActivityType.Playing },
];

let currentActivity = 0;

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // 🎮 تنظیم اکتیویتی به صورت چرخشی
  setInterval(() => {
    const activity = activities[currentActivity];
    client.user.setActivity(activity.name, { type: activity.type });
    currentActivity = (currentActivity + 1) % activities.length;
  }, 10000);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const [command, ...args] = message.content.slice(PREFIX.length).trim().split(" ");
  if (command.toLowerCase() === "embed") {
    const parts = args.join(" ").split("|").map(s => s.trim());

    const title = parts[0] || "بدون عنوان";
    const description = parts[1] || "بدون توضیح";
    const color = parts[2] || "#5865F2";
    const image = parts[3] || null;
    const buttonUrl = parts[4] || null;
    const buttonLabel = parts[5] || null;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (image) embed.setImage(image);

    const components = [];
    if (buttonUrl && buttonLabel) {
      const button = new ButtonBuilder()
        .setLabel(buttonLabel)
        .setStyle(ButtonStyle.Link)
        .setURL(buttonUrl);
      const row = new ActionRowBuilder().addComponents(button);
      components.push(row);
    }

    await message.channel.send({ embeds: [embed], components });
  }
});

client.login(process.env.TOKEN);
