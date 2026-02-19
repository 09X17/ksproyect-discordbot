export default async function handlePinataInteraction(client, interaction) {

  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith("pinata_hit_")) return false;

  const guildId = interaction.guildId;

  const pinataManager = client.levelManager.pinataManager;

  if (!pinataManager) return false;

  return pinataManager.hit(interaction);
}
