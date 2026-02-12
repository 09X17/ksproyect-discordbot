import UserLevel from "../Models/UserLevel.js";
import { boxTypes } from "./boxTypesConfig.js";
import { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

export default async function handleLootboxOpen(client, interaction) {
    if (!interaction.isStringSelectMenu()) return false;
    if (!interaction.customId.startsWith('lootbox_select_')) return false;

    await interaction.deferUpdate();

    const ownerId = interaction.customId.replace('lootbox_select_', '');
    if (!ownerId) return;

    // 🔒 Seguridad
    if (interaction.user.id !== ownerId) {
        return interaction.followUp({
            content: '❌ No puedes abrir cajas de otro usuario.',
            flags: 64
        });
    }

    const guildId = interaction.guild.id;
    const levelManager = client.levelManager;

    try {
        // ✅ OBTENER USUARIO UNA SOLA VEZ
        const user = await UserLevel.findOne({ guildId, userId: ownerId });
        if (!user) {
            return interaction.editReply({ 
                content: '❌ No se encontró tu perfil.', 
                components: [] 
            });
        }

        const lootboxes = user.inventory || [];
        const validLootboxes = lootboxes.filter(box => box.quantity > 0);
        
        if (!validLootboxes.length) {
            return interaction.editReply({ 
                content: '❌ No tienes cajas en tu inventario.', 
                components: [] 
            });
        }

        const selectedBoxId = interaction.values[0];
        const lootbox = validLootboxes.find(b => 
            b._id.toString() === selectedBoxId || 
            b.boxType === selectedBoxId
        );

        if (!lootbox) {
            return interaction.editReply({ 
                content: '❌ Caja no encontrada o ya fue abierta.', 
                components: [] 
            });
        }

        const boxType = lootbox.boxType;
        const boxDef = boxTypes[boxType];
        
        if (!boxDef) {
            return interaction.editReply({ 
                content: '❌ Esta caja no existe en el sistema.', 
                components: [] 
            });
        }

        // ✅ ABRIR CAJA Y OBTENER RECOMPENSAS (esto ya quita la caja del inventario)
        let openResult;
        try {
            openResult = await user.openLootBox(boxType, client.levelManager);
        } catch (error) {
            console.error('Error abriendo caja:', error);
            return interaction.editReply({
                content: `❌ ${error.message}`,
                components: []
            });
        }

        const rewards = openResult.rewards || {};

        if (rewards.coins && rewards.coins > 0) {
            user.coins = (user.coins || 0) + rewards.coins;
        }

        if (rewards.tokens && rewards.tokens > 0) {
            user.tokens = (user.tokens || 0) + rewards.tokens;
        }

        // ✅ UN SOLO SAVE AL FINAL
        user.markModified('inventory'); // Por si openLootBox no lo marcó
        await user.save();

        // 📝 TEXTO DE RECOMPENSAS
        let rewardText = `\`USASTE UNA CAJA: ${boxDef.name.toUpperCase()}\`\n`;

        if (rewards.coins)
            rewardText += `<:flechaderecha:1455684486938362010> <:dinero:1451695904351457330> \`MONEDAS: +${rewards.coins}\`\n`;

        if (rewards.tokens)
            rewardText += `<:flechaderecha:1455684486938362010> <:tokens:1451695903080579192> \`TOKENS: +${rewards.tokens}\`\n`;

        if (rewards.random_box)
            rewardText += `<:flechaderecha:1455684486938362010> <:cajaderegalo:1457062998374879293> \`CAJA ADICIONAL: ${rewards.random_box}\`\n`;

        // 🔄 USAR EL USUARIO QUE YA TENEMOS (ya está actualizado)
        const remainingLootboxes = (user.inventory || []).filter(box => box.quantity > 0);
        
        const components = [];

        // ✅ CREAR NUEVO MENÚ SOLO SI QUEDAN CAJAS
        if (remainingLootboxes.length > 0) {
            const menuOptions = remainingLootboxes
                .slice(0, 25)
                .map(b => {
                    const def = boxTypes[b.boxType];
                    return {
                        label: `${def?.name || b.itemName} (x${b.quantity})`,
                        value: b.boxType || b._id.toString(),
                        description: `Abrir ${def?.name || b.itemName}`,
                        emoji: def?.emoji || '🎁'
                    };
                });

            if (menuOptions.length > 0) {
                const menu = new StringSelectMenuBuilder()
                    .setCustomId(`lootbox_select_${ownerId}`)
                    .setPlaceholder('🎁 Selecciona una caja para abrir')
                    .addOptions(menuOptions);

                components.push(new ActionRowBuilder().addComponents(menu));
            }
        }

        // ✅ MOSTRAR CANTIDAD RESTANTE
        const remainingOfThisBox = remainingLootboxes.find(b => b.boxType === boxType);
        const remainingText = remainingOfThisBox 
            ? `\n<:marcolleno:1465161647894171786> \`RESTAN:\` **${remainingOfThisBox.quantity} ${boxDef.name.toUpperCase()}**`
            : '\n<:marcovacio:1465161611588403210> *Ya no te quedan cajas de este tipo*';

        // 📤 RESPUESTA FINAL
        await interaction.editReply({
            embeds: [{
                color: parseInt(boxDef.color.replace('#', ''), 16),
                title: `${boxDef.emoji || '🎁'} \`${boxDef.name.toUpperCase()} ABIERTA\``,
                description: rewardText + remainingText,
                thumbnail: {
                    url: 'https://cdn.discordapp.com/attachments/1261326873237913711/1464064059497517249/recompensa.png'
                }
            }],
            components
        });

        return true;

    } catch (error) {
        console.error('Error en handleLootboxOpen:', error.stack);
        
        await interaction.editReply({
            content: '❌ Ocurrió un error al abrir la caja. Por favor inténtalo de nuevo.',
            components: []
        }).catch(() => {});

        return false;
    }
}