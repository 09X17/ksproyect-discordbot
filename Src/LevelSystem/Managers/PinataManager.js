import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} from 'discord.js';

export default class PinataManager {

  constructor(client, levelManager) {
    this.client = client;
    this.levelManager = levelManager;

    this.activePinata = null;
  }

  /* =========================================
     🎉 Crear Piñata
  ========================================= */

  async spawnPinata(guildId, channelId, options = {}) {

    if (this.activePinata) {
      return { success: false, reason: "already_active" };
    }

    const requiredHits = options.requiredHits ?? 30;
    const durationMs = options.durationMs ?? 3 * 60 * 1000;

    const channel = this.client.channels.cache.get(channelId);
    if (!channel) return { success: false, reason: "invalid_channel" };

    const container = new ContainerBuilder()
      .setAccentColor(0xF4B400)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🎉 **¡APARECIÓ UNA PIÑATA!**\n\n` +
          `🔨 Golpes necesarios: **${requiredHits}**\n` +
          `⏳ Tiempo límite: <t:${Math.floor((Date.now() + durationMs)/1000)}:R>\n\n` +
          `Progreso: **0/${requiredHits}**`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`pinata_hit_${guildId}`)
            .setLabel("Golpear")
            .setEmoji("🔨")
            .setStyle(ButtonStyle.Primary)
        )
      );

    const msg = await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    this.activePinata = {
      guildId,
      channelId,
      messageId: msg.id,
      requiredHits,
      currentHits: 0,
      participants: {},
      exploded: false,
      expiresAt: Date.now() + durationMs
    };

    setTimeout(() => {
      if (this.activePinata && !this.activePinata.exploded) {
        this.endPinata(false);
      }
    }, durationMs);

    return { success: true };
  }

  /* =========================================
     🔨 Golpear Piñata
  ========================================= */

  async hit(interaction) {

    if (!this.activePinata) return false;

    if (this.activePinata.exploded) {
      return interaction.reply({
        content: "💥 La piñata ya explotó.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (Date.now() > this.activePinata.expiresAt) {
      return interaction.reply({
        content: "⏳ La piñata expiró.",
        flags: MessageFlags.Ephemeral
      });
    }

    const userId = interaction.user.id;

    this.activePinata.currentHits++;

    if (!this.activePinata.participants[userId]) {
      this.activePinata.participants[userId] = 0;
    }

    this.activePinata.participants[userId]++;

    await this.updateMessage();

    if (this.activePinata.currentHits >= this.activePinata.requiredHits) {
      await this.explode();
    }

    return interaction.deferUpdate();
  }

  /* =========================================
     🔄 Actualizar mensaje
  ========================================= */

  async updateMessage() {

    const channel = this.client.channels.cache.get(this.activePinata.channelId);
    if (!channel) return;

    const msg = await channel.messages.fetch(this.activePinata.messageId).catch(() => null);
    if (!msg) return;

    const container = new ContainerBuilder()
      .setAccentColor(0xF4B400)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `🎉 **¡APARECIÓ UNA PIÑATA!**\n\n` +
          `🔨 Golpes necesarios: **${this.activePinata.requiredHits}**\n` +
          `Progreso: **${this.activePinata.currentHits}/${this.activePinata.requiredHits}**`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`pinata_hit_${this.activePinata.guildId}`)
            .setLabel("Golpear")
            .setEmoji("🔨")
            .setStyle(ButtonStyle.Primary)
            .setDisabled(this.activePinata.exploded)
        )
      );

    await msg.edit({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }

  /* =========================================
     💥 Explosión
  ========================================= */

  async explode() {

    this.activePinata.exploded = true;

    const ranking = Object.entries(this.activePinata.participants)
      .sort((a,b) => b[1] - a[1]);

    const top3 = ranking.slice(0,3);

    await this.distributeRewards(ranking);

    const channel = this.client.channels.cache.get(this.activePinata.channelId);
    const msg = await channel.messages.fetch(this.activePinata.messageId);

    const resultsText = top3.map((r, i) =>
      `${["🥇","🥈","🥉"][i]} <@${r[0]}> — ${r[1]} golpes`
    ).join("\n");

    const container = new ContainerBuilder()
      .setAccentColor(0x34A853)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `💥 **¡LA PIÑATA EXPLOTÓ!**\n\n${resultsText}`
        )
      );

    await msg.edit({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    this.activePinata = null;
  }

  /* =========================================
     🎁 Reparto de recompensas
  ========================================= */

  async distributeRewards(ranking) {

    for (let i = 0; i < ranking.length; i++) {

      const [userId, hits] = ranking[i];

      const user = await this.levelManager.getOrCreateUserLevel(
        this.activePinata.guildId,
        userId
      );

      if (i === 0) {
        await this.levelManager.giveCurrency(userId, this.activePinata.guildId, "tokens", 50, "pinata");
        await this.levelManager.giveCurrency(userId, this.activePinata.guildId, "coins", 1000, "pinata");
        await user.addLootBoxToInventory("rare_box", "Caja Rara", 1);
      }
      else if (i === 1) {
        await this.levelManager.giveCurrency(userId, this.activePinata.guildId, "tokens", 30, "pinata");
        await this.levelManager.giveCurrency(userId, this.activePinata.guildId, "coins", 600, "pinata");
      }
      else if (i === 2) {
        await this.levelManager.giveCurrency(userId, this.activePinata.guildId, "tokens", 15, "pinata");
        await this.levelManager.giveCurrency(userId, this.activePinata.guildId, "coins", 300, "pinata");
      }
      else {
        await this.levelManager.giveCurrency(userId, this.activePinata.guildId, "coins", 100, "pinata_participation");
      }

      await user.save();
    }
  }

  /* =========================================
     ⛔ Finalizar sin explosión
  ========================================= */

  async endPinata(success) {
    this.activePinata = null;
  }
}
