import { Client, Intents, Message, ReactionManager } from "discord.js";

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

  console.log("ready to go");
});

// client.on("message", (msg: Message) => {
//   if (msg.content === "ping") {
//     msg.reply("Pong 🏓");
//   } else if (msg.content === "hello") {
//     msg.reply("Choo choo! 🚅");
//   }
// });

client.on("interactionCreate", async (interaction) => {
  console.log("interactionCreate", interaction, {
    isCommand: interaction.isCommand(),
    isMessageComponent: interaction.isMessageComponent(),
    isContextMenu: interaction.isContextMenu(),
    isSelectMenu: interaction.isSelectMenu(),
  });

  if (interaction.isContextMenu() && interaction.commandName === commandName) {
    console.log("data", interaction.options.data);

    const data = interaction.options.data.find((data) => data.message);
    if (data?.message) {
      console.log("reactions", data.message.reactions);
      if (data.message.reactions instanceof ReactionManager) {
        console.log("reactions cache", data.message.reactions.cache);
      }
    }

    await interaction.reply({
      content: "picking a winner",
      ephemeral: true,
    });
  }

  // if (interaction.isMessageComponent()) if (!interaction.isCommand()) return;
  // console.log("got command", interaction.commandName);

  // if (interaction.commandName === commandName) {
  //   console.log("picking a winner");
  //   await interaction.channel?.send("picking a winner");
  //   // await interaction.reply("you did it");
  // }
});

client.login();
