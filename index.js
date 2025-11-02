// index.js
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ✅ تعریف کامندها
const commands = [
  new SlashCommandBuilder()
    .setName("embed")
    .setDescription("📦 ساخت یک Embed شخصی")
    .addStringOption((opt) =>
      opt.setName("title").setDescription("📝 عنوان embed").setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("description")
        .setDescription("💬 توضیحات embed")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("color").setDescription("🎨 رنگ embed (مثلاً: #5865F2)").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("image").setDescription("🖼️ لینک عکس (اختیاری)").setRequired(false)
    )
    .toJSON(),
];

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // ثبت slash commands
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("🧾 Slash commands registered!");
  } catch (err) {
    console.error(err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "embed") {
    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const color = interaction.options.getString("color") || "#5865F2";
    const image = interaction.options.getString("image");

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setFooter({
        text: `ارسال شده توسط ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    if (image) embed.setImage(image);

    await interaction.reply({ embeds: [embed] });
  }
});

client.login(process.env.TOKEN);
