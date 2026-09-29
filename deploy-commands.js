require("dotenv").config();

const {
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("hello")
    .setDescription("Say hello"),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check the bot's latency"),

  new SlashCommandBuilder()
    .setName("list")
    .setDescription("List available commands")
].map(command => command.toJSON());

const rest = new REST({ version: "10" })
  .setToken(process.env.DISCORD_TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );

  console.log("Commands registered!");
})();
