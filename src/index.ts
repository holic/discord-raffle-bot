import Eris from "eris";

// bot needs to be installed with oauth scopes: bot, applications.commands
//   and bot permissions: Manage Roles
// bot also needs to have privileged gateway intents enabled
//   just server members for now, but presence soon? and message content may be worth having

// https://discord.com/api/oauth2/authorize?client_id=914226280881348618&permissions=0&scope=bot%20applications.commands

const bot = Eris(process.env.DISCORD_TOKEN!, {
  intents: ["guilds", "guildMessages", "guildMembers", "guildMessageReactions"],
});

const commandName = "Pick a raffle winner";
const cooldownRoleName = "Raffle cooldown";

bot.on("ready", async () => {
  console.log("ready");

  const commands = await bot.getCommands();
  console.log("commands", commands);

  const command = await bot.createCommand({
    type: Eris.Constants.ApplicationCommandTypes.MESSAGE,
    name: commandName,
  });
  console.log("created command", command);
});

bot.on("interactionCreate", async (interaction) => {
  console.log("interactionCreate", interaction);
  if (!(interaction instanceof Eris.CommandInteraction)) return;
  if (interaction.data.name !== commandName) return;

  // Wait for "ready" event, otherwise guilds won't be populated
  if (!bot.ready) {
    return await interaction.createMessage({
      content: "Oops, I'm still booting up… try again in a few seconds?",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }

  const guildId = interaction.guildID;
  if (!guildId) return;

  const guild = bot.guilds.get(guildId);
  if (!guild) return;

  if (!interaction.member) return;
  if (!interaction.member.permissions.has("administrator")) {
    return await interaction.createMessage({
      content: "You don't have permission to run this command.",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }

  // Find or create role used for raffle cooldowns
  const cooldownRole =
    guild.roles.find((role) => role.name === cooldownRoleName) ||
    (await guild.createRole({
      name: cooldownRoleName,
    }));

  const messageId = interaction.data.target_id;
  if (!messageId) return;

  const message = await bot.getMessage(interaction.channel.id, messageId);
  const reaction = message.reactions["🎉"];
  if (!reaction) {
    return await interaction.createMessage({
      content: "No one has reacted with a 🎉 yet.",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }
  if (reaction.count > 100) {
    return await interaction.createMessage({
      content: "I can't do raffles for >100 people yet. Sorry!",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }

  // TODO: paginate and remove the >100 check above
  const userReactions = await message.getReaction("🎉", {
    limit: 100,
  });
  if (!userReactions.length) {
    return await interaction.createMessage({
      content: "No one has reacted with a 🎉 yet.",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }

  const members = await guild.fetchMembers({
    userIDs: userReactions.map((user) => user.id),
  });

  const eligibleMembers = members.filter(
    (member) => !member.roles.includes(cooldownRole.id)
  );
  if (!eligibleMembers.length) {
    return await interaction.createMessage({
      content: `No one is eligible. Remove folks from ${cooldownRole.mention} and try again?`,
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }

  await interaction.acknowledge();

  const winnerIndex = Math.floor(Math.random() * eligibleMembers.length);
  const winner = eligibleMembers[winnerIndex];
  await winner.addRole(cooldownRole.id);
  await message.addReaction("✅");

  await bot.createMessage(interaction.channel.id, {
    content: `And the winner is … ${winner.mention}!`,
    messageReference: { messageID: message.id },
  });

  await interaction.deleteOriginalMessage();
});

bot.on("error", (error) => {
  console.error(error);
});

bot.connect();
