import {
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize, SectionBuilder, ThumbnailBuilder
} from 'discord.js';
import UserLevel from '../Models/UserLevel.js';

/* ===================== UTIL ===================== */

function extractTradeId(customId) {
  if (!customId) return null;

  const prefixes = [
    'trade_accept_',
    'trade_decline_',
    'trade_confirm_',
    'trade_cancel_confirm_',
    'trade_select_resource_',
    'trade_amount_'
  ];

  for (const prefix of prefixes) {
    if (customId.startsWith(prefix)) {
      return customId.replace(prefix, '').split('_').slice(0, 2).join('_');
    }
  }

  return null;
}


function getResourceEmoji(type) {
  return type === 'coins' ? '<:dinero:1451695904351457330>' : '<:tokens:1451695903080579192>';
}

function getResourceName(type) {
  return type === 'coins' ? 'MONEDAS' : 'TOKENS';
}

/* ===================== MAIN ===================== */

export default async function handleTradeInteraction(client, interaction) {
  client.activeTrades ??= new Map();

  // 1️⃣ Solo botones / select / modales
  if (
    !interaction.isButton() &&
    !interaction.isStringSelectMenu() &&
    !interaction.isModalSubmit()
  ) {
    return false;
  }

  // 2️⃣ Solo interacciones de trade
  if (!interaction.customId || !interaction.customId.startsWith('trade_')) {
    return false;
  }

  // 3️⃣ Extraer tradeId
  const tradeId = extractTradeId(interaction.customId);
  if (!tradeId) return false;

  // 4️⃣ Buscar trade
  const trade = client.activeTrades.get(tradeId);

  if (!trade) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        components: [
          new ContainerBuilder()
            .setAccentColor(0xEA4335)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                '<:cancelar:1469343007554928641> | Intercambio no válido o ya no existe.'
              )
            )
        ],
        flags: MessageFlags.IsComponentsV2 | flags: 64
      });
    }
    return;
  }

  // 5️⃣ Expiración
  if (Date.now() > trade.expiresAt && trade.status === 'pending') {
    trade.status = 'expired';
    client.activeTrades.set(tradeId, trade);

    await updateTradeMessage(client, trade);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '<:cancelar:1469343007554928641> | Este intercambio ha expirado.',
        flags: 64
      });
    }
    return;
  }

  // 6️⃣ Routing
  if (interaction.customId.startsWith('trade_accept_')) {
    return handleAccept(client, interaction, trade);
  }

  if (interaction.customId.startsWith('trade_decline_')) {
    return handleDecline(client, interaction, trade);
  }

  if (interaction.customId.startsWith('trade_confirm_')) {
    return handleConfirm(client, interaction, trade);
  }

  if (interaction.customId.startsWith('trade_cancel_confirm_')) {
    return handleCancel(client, interaction, trade);
  }

  if (interaction.customId.startsWith('trade_select_resource_')) {
    return handleSelectResource(client, interaction, trade);
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith('trade_amount_')
  ) {
    return handleAmount(client, interaction, trade);
  }

  return false;
}

/* ===================== HANDLERS ===================== */

async function handleAccept(client, interaction, trade) {
  await interaction.deferReply({ flags: 64 });

  if (interaction.user.id !== trade.targetId || trade.status !== 'pending') {
    return interaction.editReply({
      components: [
        new ContainerBuilder()
          .setAccentColor(0xEA4335)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('<:cancelar:1469343007554928641> | No puedes aceptar este intercambio.')
          )
      ],
      flags: MessageFlags.IsComponentsV2
    });
  }

  trade.status = 'awaiting_offer';
  client.activeTrades.set(trade.id, trade);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`trade_select_resource_${trade.id}`)
    .setPlaceholder('¿Qué ofrecerás a cambio?')
    .addOptions(
      { label: 'MONEDAS', value: 'coins', emoji: '<:dinero:1451695904351457330>' },
      { label: 'TOKENS', value: 'tokens', emoji: '<:tokens:1451695903080579192>' }
    );

  const container = new ContainerBuilder()
    .setAccentColor(0x4285F4)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `\`SELECCIONA TU CONTRAOFFERTA\`\n\n` +
        `<:recibe:1470190315565744279> \`TE OFRECEN:\` ${getResourceEmoji(trade.initiatorOffer.type)} **${trade.initiatorOffer.amount.toLocaleString()} ${getResourceName(trade.initiatorOffer.type)}**`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addActionRowComponents(new ActionRowBuilder().addComponents(menu));

  await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handleSelectResource(client, interaction, trade) {
  const resource = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`trade_amount_${trade.id}_${resource}`)
    .setTitle(`Cantidad de ${getResourceName(resource)}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('amount')
          .setLabel('Cantidad')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

  trade.selectedResource = resource;
  client.activeTrades.set(trade.id, trade);

  await interaction.showModal(modal);
}

async function handleAmount(client, interaction, trade) {
  await interaction.deferReply({ flags: 64 });

  const amount = parseInt(interaction.fields.getTextInputValue('amount'));

  if (!amount || amount <= 0) {
    return interaction.editReply({
      content: '<:cancelar:1469343007554928641> |  Cantidad inválida.',
      flags: 64
    });
  }


  trade.targetOffer = {
    type: trade.selectedResource,
    amount
  };

  trade.status = 'offer_made';
  client.activeTrades.set(trade.id, trade);

  await updateTradeMessage(client, trade);

  await interaction.editReply({
    components: [
      new ContainerBuilder()
        .setAccentColor(0x34A853)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `<:verificado:1453073955467563008> \`OFERTA ENVIADA:\` ${getResourceEmoji(trade.targetOffer.type)} **${amount.toLocaleString()} ${getResourceName(trade.targetOffer.type)}**`
          )
        )
    ],
    flags: MessageFlags.IsComponentsV2
  });
}

async function handleConfirm(client, interaction, trade) {
  await interaction.deferReply({ flags: 64 });

  // 🔐 Solo iniciador
  if (interaction.user.id !== trade.initiatorId) {
    return interaction.editReply({
      content: '<:cancelar:1469343007554928641> | No puedes confirmar este intercambio.',
      flags: 64
    });
  }

  // 🧠 Estado válido
  if (trade.status !== 'offer_made') {
    return interaction.editReply({
      content: '<:cancelar:1469343007554928641> | Este intercambio ya no está disponible.',
      flags: 64
    });
  }

  const [init, targ] = await Promise.all([
    UserLevel.findOne({ guildId: trade.guildId, userId: trade.initiatorId }),
    UserLevel.findOne({ guildId: trade.guildId, userId: trade.targetId })
  ]);

  // 💰 Fondos suficientes
  if (
    !init || !targ ||
    init[trade.initiatorOffer.type] < trade.initiatorOffer.amount ||
    targ[trade.targetOffer.type] < trade.targetOffer.amount
  ) {
    return interaction.editReply({
      content: '<:cancelar:1469343007554928641> | Uno de los usuarios ya no tiene recursos suficientes.',
      flags: 64
    });
  }

  // 🔁 Transferencia
  init[trade.initiatorOffer.type] -= trade.initiatorOffer.amount;
  init[trade.targetOffer.type] += trade.targetOffer.amount;

  targ[trade.targetOffer.type] -= trade.targetOffer.amount;
  targ[trade.initiatorOffer.type] += trade.initiatorOffer.amount;

  await Promise.all([init.save(), targ.save()]);

  // ✅ Finalizar trade
  trade.status = 'completed';
  trade.completedAt = Date.now();
  client.activeTrades.set(trade.id, trade);

  await updateTradeMessage(client, trade);

  const section = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '<:verificado:1453073955467563008> **Intercambio completado con éxito.**'
      )
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL('https://cdn.discordapp.com/attachments/1261326873237913711/1470199012295577680/giphy.gif')
        .setDescription('Trade completado!')
    );

  await interaction.editReply({
    components: [
      new ContainerBuilder()
        .setAccentColor(0x34A853)
        .addSectionComponents(section)
    ],
    flags: MessageFlags.IsComponentsV2
  });


  // 🧹 Limpieza
  setTimeout(() => {
    client.activeTrades.delete(trade.id);
  }, 60_000);
}

async function handleDecline(client, interaction, trade) {
  await interaction.deferReply({ flags: 64 });

  if (interaction.user.id !== trade.targetId || trade.status !== 'pending') {
    return interaction.editReply({
      content: '<:cancelar:1469343007554928641> | No puedes rechazar este intercambio.',
      flags: 64
    });
  }

  trade.status = 'declined';
  trade.declinedAt = Date.now();
  client.activeTrades.set(trade.id, trade);

  await updateTradeMessage(client, trade);


  setTimeout(() => {
    client.activeTrades.delete(trade.id);
  }, 60_000);
}

async function handleCancel(client, interaction, trade) {
  await interaction.deferReply({ flags: 64 });

  if (interaction.user.id !== trade.initiatorId || trade.status !== 'offer_made') {
    return interaction.editReply({
      content: '❌ No puedes cancelar este intercambio.',
      flags: 64
    });
  }

  trade.status = 'pending';
  trade.targetOffer = null;
  delete trade.selectedResource;

  client.activeTrades.set(trade.id, trade);

  await updateTradeMessage(client, trade);

  await interaction.editReply({
    content: '<:cancelar:1469343007554928641> | Has cancelado la confirmación. El intercambio vuelve a estar pendiente.',
    flags: 64
  });
}


/* ===================== UPDATE MSG ===================== */

async function updateTradeMessage(client, trade) {
  const channel = client.channels.cache.get(trade.channelId);
  if (!channel) return;

  const msg = await channel.messages.fetch(trade.messageId).catch(() => null);
  if (!msg) return;

  const section = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `<:flechaderecha:1455684486938362010> *Confirma el intercambio:* <@${trade.initiatorId}>\n` +
        `\`INTERCAMBIO\`\n\n` +
        `<:flechaarriba:1470193573105238016> ${getResourceEmoji(trade.initiatorOffer.type)} **${trade.initiatorOffer.amount.toLocaleString()} ${getResourceName(trade.initiatorOffer.type)}**\n` +
        `<:flechaabajo:1470193571335372892> ${trade.targetOffer
          ? getResourceEmoji(trade.targetOffer.type) +
          ' **' +
          trade.targetOffer.amount.toLocaleString() +
          ' ' +
          getResourceName(trade.targetOffer.type) +
          '**'
          : '\`PENDIENTE\`'
        }`
      )
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder()
        .setURL('https://cdn.discordapp.com/attachments/1261326873237913711/1470199012295577680/giphy.gif')
        .setDescription('Trade en proceso')
    );

  const container = new ContainerBuilder()
    .setAccentColor(0xF4B400)
    .addSectionComponents(section);


  if (trade.status === 'pending') {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`trade_accept_${trade.id}`)
          .setLabel('Aceptar y ofertar')
          .setEmoji('<:verificado:1453073955467563008>')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`trade_decline_${trade.id}`)
          .setLabel('Rechazar')
          .setEmoji('<:cancelar:1469343007554928641>')
          .setStyle(ButtonStyle.Danger)
      )
    );
  }

  if (trade.status === 'offer_made') {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`trade_confirm_${trade.id}`)
          .setLabel('Confirmar intercambio')
          .setEmoji('<:verificado:1453073955467563008>')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`trade_cancel_confirm_${trade.id}`)
          .setLabel('Cancelar')
          .setEmoji('<:cancelar:1469343007554928641>')
          .setStyle(ButtonStyle.Danger)
      )
    );
  }

  if (trade.status === 'completed') {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('<:verificado:1453073955467563008> *Intercambio completado con éxito, puede tardar varios segundos en reflejarse en los balances de ambos usuarios.*')
    );
  }

  if (trade.status === 'declined') {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('<:cancelar:1469343007554928641> | Intercambio rechazado por el usuario objetivo.')
    );
  }

  if (trade.status === 'expired') {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('<:cancelar:1469343007554928641> | Este intercambio ha expirado.')
    );
  }

  if (trade.status === 'awaiting_offer') {
    container.addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent('<:relojdearena:1457064155067449364> | Esperando contraoferta del usuario objetivo...')
    );
  }


  await msg.edit({
    components: [container],
    flags: MessageFlags.IsComponentsV2
  });
}

