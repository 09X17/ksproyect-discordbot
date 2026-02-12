import { EmbedBuilder } from "discord.js";

const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

/**
 * Envía un log bonito a tu canal de staff/logs.
 * @param {import("discord.js").Client} client 
 * @param {string} message 
 * @param {string} color
 */
export default async function sendLog(client, message, color = "#2F3136") {
  try {
    if (!LOG_CHANNEL_ID) {
      console.warn("⚠️ No se configuró LOG_CHANNEL_ID en .env");
      return;
    }

    const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(message)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("❌ Error enviando log:", err);
  }
}
