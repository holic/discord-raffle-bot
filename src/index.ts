import { Client, Intents, Message } from "discord.js";

const commandName = "Pick a raffle winner";

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);

  const guildId = "914227570025840730";
  const guild = client.guilds.cache.get(guildId);

  const commands = guild?.commands || client.application?.commands;

  commands?.create({
    type: "MESSAGE",
    name: commandName,
  });
});

// client.on("message", (msg: Message) => {
//   if (msg.content === "ping") {
//     msg.reply("Pong 🏓");
//   } else if (msg.content === "hello") {
//     msg.reply("Choo choo! 🚅");
//   }
// });

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === commandName) {
    await interaction.channel?.send("picking a winner");
    // await interaction.reply("you did it");
  }
});

client.login();
