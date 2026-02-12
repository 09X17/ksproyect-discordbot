import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    AttachmentBuilder,
    MessageFlags,
    MediaGalleryBuilder,
    EmbedBuilder
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import ContestEntry from '../../../Contest/Models/ContestEntry.js';
import fetch from 'node-fetch';

export default class ContestFixImageCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('contest-fix-image')
                .setDescription('Restaura completamente una entrada del concurso (imagen + layout)')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addStringOption(option =>
                    option
                        .setName('message_id')
                        .setDescription('ID del mensaje del concurso')
                        .setRequired(true)
                ),

            category: 'contest',
            cooldown: 10,
            userPermissions: [PermissionFlagsBits.ManageGuild]
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply({ flags: 64 });

        const messageId = interaction.options.getString('message_id');

        // 1️⃣ Buscar entrada en DB
        const entry = await ContestEntry.findOne({
            guildId: interaction.guildId,
            messageId
        });

        if (!entry) {
            return interaction.editReply({
                content: '❌ No se encontró ninguna entrada con ese messageId.'
            });
        }

        // 2️⃣ Buscar canal y mensaje
        const channel = await client.channels.fetch(entry.channelId).catch(() => null);
        if (!channel?.isTextBased()) {
            return interaction.editReply({
                content: '❌ Canal no válido o no accesible.'
            });
        }

        const message = await channel.messages.fetch(entry.messageId).catch(() => null);
        if (!message) {
            return interaction.editReply({
                content: '❌ No se pudo encontrar el mensaje.'
            });
        }

        // 3️⃣ Descargar imagen original
        const response = await fetch(entry.imageUrl);
        if (!response.ok) {
            return interaction.editReply({
                content: '❌ No se pudo descargar la imagen original.'
            });
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const filename = entry.imageFilename || `entry_${entry._id}.png`;
        const attachment = new AttachmentBuilder(buffer, { name: filename });

        // 4️⃣ Reconstruir embed (si existía)
        const embeds = [];
        if (message.embeds?.length) {
            embeds.push(EmbedBuilder.from(message.embeds[0]));
        }

        // 5️⃣ Reconstruir MediaGallery (CLAVE)
        const mediaGallery = new MediaGalleryBuilder()
            .addItems(item =>
                item
                    .setURL(`attachment://${filename}`)
                    .setDescription(entry.description || '')
            );

        // 6️⃣ Restaurar mensaje COMPLETO
        await message.edit({
            embeds,
            components: [
                ...(message.components ?? []),
                mediaGallery
            ],
            files: [attachment],
            flags: MessageFlags.IsComponentsV2
        });

        await interaction.editReply({
            content: '✅ Entrada restaurada correctamente y con el layout original.'
        });
    }
}
