import Eris from "eris";

// bot needs to be installed with oauth scopes: bot, applications.commands
//   and bot permissions: Manage Roles
// bot also needs to have privileged gateway intents enabled
//   just server members for now, but presence soon? and message content may be worth having

// https://discord.com/api/oauth2/authorize?client_id=914226280881348618&permissions=268435456&scope=bot%20applications.commands

const bot = Eris(process.env.DISCORD_TOKEN!, {
  intents: ["guilds", "guildMessages", "guildMembers", "guildMessageReactions"],
});

const commandId = "915646390997237791";
const commandName = "Pick a raffle winner";
const cooldownRoleName = "Raffle cooldown";

bot.on("ready", async () => {
  console.log("ready", new Date());

  const commands = await bot.getCommands();

  const command =
    commands.find((command) => command.id === commandId) ||
    (await bot.createCommand({
      // TODO: figure out how to update command if the constructor changes
      type: Eris.Constants.ApplicationCommandTypes.MESSAGE,
      name: commandName,
    }));
  console.log("found/created command", command);
});

bot.on("interactionCreate", async (interaction) => {
  console.log("interactionCreate", interaction);

  if (!(interaction instanceof Eris.CommandInteraction)) {
    return console.log("skipping, not a command interaction");
  }
  if (interaction.data.name !== commandName) {
    return console.log("skipping, wrong command name", interaction.data.name);
  }

  // Wait for "ready" event, otherwise guilds won't be populated
  if (!bot.ready) {
    return await interaction.createMessage({
      content: "Oops, I'm still booting up… try again in a few seconds?",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }

  const channel = interaction.channel;
  if (!(channel instanceof Eris.GuildChannel)) {
    return console.log("skipping, interaction in a non-guild channel");
  }

  const channelPermissions = channel.permissionsOf(bot.user.id);
  if (!channelPermissions.has("readMessages")) {
    console.log(
      "skipping, missing readMessages permission for channel",
      channel.id
    );
    return await interaction.createMessage({
      content:
        "I don't have permissions to read messages in this channel. If this is a private channel, you can add the `Raffle Bot` role to the channel permissions to give me access.",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }
  if (!channelPermissions.has("sendMessages")) {
    console.log(
      "skipping, missing sendMessages permission for channel",
      channel.id
    );
    return await interaction.createMessage({
      content:
        "I don't have permissions to send messages in this channel. Add 'Raffle Bot' role to this channel. If this is a private channel, you can add the `Raffle Bot` role to the channel permissions to give me access.",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }
  if (!channelPermissions.has("addReactions")) {
    console.log(
      "skipping, missing addReactions permission for channel",
      channel.id
    );
    return await interaction.createMessage({
      content:
        "I don't have permissions to add reactions to messages in this channel. Add 'Raffle Bot' role to this channel. If this is a private channel, you can add the `Raffle Bot` role to the channel permissions to give me access.",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }

  const guildId = interaction.guildID;
  if (!guildId) {
    return console.log("skipping, no guild ID");
  }

  const guild = bot.guilds.get(guildId);
  if (!guild) {
    return console.log("skipping, no guild found for ID", guildId);
  }
  console.log("found guild");

  const interactionMember = interaction.member;
  if (!interactionMember) {
    return console.log("skipping, no interaction member");
  }
  if (!interactionMember.permissions.has("administrator")) {
    console.log("interaction member does not have admin permission");
    return await interaction.createMessage({
      content: "You don't have permission to run this command.",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }
  console.log("interaction made by admin");

  // Find or create role used for raffle cooldowns
  const cooldownRole =
    guild.roles.find((role) => role.name === cooldownRoleName) ||
    (await guild.createRole({
      name: cooldownRoleName,
    }));
  console.log("found/created cooldown role");

  const messageId = interaction.data.target_id;
  if (!messageId) {
    return console.log("skipping, no target message ID");
  }

  const message = await bot.getMessage(interaction.channel.id, messageId);
  console.log("found message");

  const reaction = message.reactions["🎉"];
  if (!reaction || !reaction.count) {
    console.log("no 🎉 reactions on message");
    return await interaction.createMessage({
      content: "No one has reacted with a 🎉 yet.",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }
  if (reaction.count > 100) {
    console.log("too many 🎉 reactions on message");
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
    console.log("no 🎉 reactions on message");
    return await interaction.createMessage({
      content: "No one has reacted with a 🎉 yet.",
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }
  console.log("found reactions");

  const members = await guild.fetchMembers({
    userIDs: userReactions.map((user) => user.id),
  });
  console.log("found users that reacted", members.length);

  const eligibleMembers = members
    // Exclude the person executing the command
    .filter((member) => member.id !== interactionMember.id)
    // Exclude anyone with the cooldown role
    .filter((member) => !member.roles.includes(cooldownRole.id));
  console.log("found eligible users", eligibleMembers.length);
  if (!eligibleMembers.length) {
    console.log("no eligible reactions, all on cooldown?");
    return await interaction.createMessage({
      content: `No one is eligible. Remove folks from ${cooldownRole.mention} and try again?`,
      flags: Eris.Constants.MessageFlags.EPHEMERAL,
    });
  }

  await interaction.acknowledge();

  const winnerIndex = Math.floor(Math.random() * eligibleMembers.length);
  const winner = eligibleMembers[winnerIndex];
  console.log("picked winner", winner);

  await winner.addRole(cooldownRole.id);
  await message.addReaction("✅");

  await interaction.createMessage({
    content: `> ${message.content.replace(
      /\n/g,
      "\n> "
    )}\nAnd the winner is … ${winner.mention}!`,
    // TODO: include original message or embed if this doesn't reply
  });

  console.log("interaction done!");
});

bot.on("error", (error) => {
  console.error(error);
});

bot.connect();

// Attempt to clean up on exit so we don't have a lingering bot associated with a non-running process
process.on("exit", () => {
  bot.disconnect({ reconnect: false });
});
