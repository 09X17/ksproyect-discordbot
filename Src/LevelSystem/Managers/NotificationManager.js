import { EmbedBuilder } from 'discord.js';
import userLevel from "../Models/UserLevel.js"

export default class NotificationManager {
    constructor(client, levelManager) {
        this.client = client;
        this.levelManager = levelManager;
    }

    async sendLevelUpNotification({
        guildId,
        member,
        oldLevel,
        newLevel,
        rolesAdded = [],
        userLevel,
        rankInfo,
        context = null
    }) {
        try {
            const guild = member.guild;
            const config = await this.levelManager.getGuildConfig(guildId);

            // ─────────────────────────────────────────────
            // 🧮 CÁLCULO DE XP CORRECTO (NUNCA > 100%)
            // ─────────────────────────────────────────────
            const currentLevelXP =
                await userLevel.getRequiredXPForLevel(userLevel.level);

            const nextLevelXP =
                await userLevel.getRequiredXPForLevel(userLevel.level + 1);

            const xpInLevel = Math.max(0, userLevel.xp - currentLevelXP);
            const xpNeeded = Math.max(1, nextLevelXP - currentLevelXP);
            const xpProgress = `${Math.floor((xpInLevel / xpNeeded) * 100)}%`;

            // ─────────────────────────────────────────────
            // 📦 DATA NORMALIZADA (EMBED SAFE)
            // ─────────────────────────────────────────────
            const data = {
                userMention: member.toString(),
                userTag: member.user.tag,
                userId: member.id,
                username: userLevel.username || member.user.username,
                avatar: member.user.displayAvatarURL({ dynamic: true, size: 256 }),

                level: newLevel,
                oldLevel,
                newLevel,

                xp: userLevel.xp,
                xpInLevel,
                xpNeeded,
                xpProgress,

                rank: rankInfo?.rank ?? 'N/A',
                totalUsers: rankInfo?.totalUsers ?? 1,

                coins: userLevel.coins,
                tokens: userLevel.tokens,

                rolesUnlocked: rolesAdded.length,
                roleMention:
                    rolesAdded.length > 0 ? `<@&${rolesAdded[rolesAdded.length - 1].roleId}>` : '',
                roleName:
                    rolesAdded.length > 0 ? rolesAdded[rolesAdded.length - 1].roleName : '',

                guildName: guild.name
            };

            // ─────────────────────────────────────────────
            // 📬 DM
            // ─────────────────────────────────────────────
            if (config.notifications?.levelUpDM) {
                try {
                    if (config.notifications.levelUpType === 'text') {
                        const msg = config.formatMessage(
                            config.notifications.levelUpMessage,
                            data
                        );
                        await member.send(msg);
                    } else {
                        const embedData = config.createLevelUpEmbed(data);
                        const embed = this.createEmbedFromData(embedData);
                        await member.send({ embeds: [embed] });
                    }
                } catch {
                    // DM cerrado → ignorar
                }
            }

            // ─────────────────────────────────────────────
            // 📢 CANAL
            // ─────────────────────────────────────────────
            if (config.notifications?.levelUpChannel) {
                const channel = guild.channels.cache.get(
                    config.notifications.levelUpChannel
                );

                if (!channel?.isTextBased()) return;

                try {
                    if (config.notifications.levelUpType === 'text') {
                        const msg = config.formatMessage(
                            config.notifications.levelUpMessage,
                            data
                        );
                        await channel.send(msg);
                    } else {
                        const embedData = config.createLevelUpEmbed(data);
                        const embed = this.createEmbedFromData(embedData);

                        const content =
                            config.notifications.levelUpEmbed?.mentionUser
                                ? data.userMention
                                : '';

                        await channel.send({ content, embeds: [embed] });
                    }
                } catch (err) {
                    // 🛟 FALLBACK GARANTIZADO
                    this.client.logger.error(
                        '❌ Embed de level up falló, enviando texto plano',
                        err
                    );

                    await channel.send(
                        `🎉 ${data.userMention} subió del **nivel ${oldLevel}** al **nivel ${newLevel}**`
                    );
                }
            }

            this.client.logger.info(
                `📨 Level up notificado: ${member.id} | ${oldLevel} → ${newLevel}`
            );

        } catch (error) {
            this.client.logger.error(
                '❌ Error crítico en sendLevelUpNotification:',
                error
            );
        }
    }


    async sendDMNotification(member, config, data) {
        try {
            if (config.notifications.levelUpType === 'text') {
                const message = config.formatMessage(config.notifications.levelUpMessage, data);
                await member.send(message);
            } else {
                const embedData = config.createLevelUpEmbed(data);
                const embed = this.createEmbedFromData(embedData);
                await member.send({ embeds: [embed] });
            }
        } catch (error) {
        }
    }

    async sendChannelNotification(guild, config, data) {
        try {
            const channel = guild.channels.cache.get(config.notifications.levelUpChannel);
            if (!channel?.isTextBased()) return;

            if (config.notifications.levelUpType === 'text') {
                const message = config.formatMessage(config.notifications.levelUpMessage, data);
                await channel.send(message);
            } else {
                const embedData = config.createLevelUpEmbed(data);
                const embed = this.createEmbedFromData(embedData);

                const content = config.notifications.levelUpEmbed.mentionUser ?
                    data.userMention : '';

                await channel.send({
                    content,
                    embeds: [embed]
                });
            }
        } catch (error) {
            this.client.logger.error('❌ Error enviando notificación a canal:', error);
        }
    }

    createEmbedFromData(embedData) {
        const embed = new EmbedBuilder();

        if (embedData.title) embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        if (embedData.color) embed.setColor(embedData.color);
        if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
        if (embedData.footer) embed.setFooter({ text: embedData.footer.text || embedData.footer });
        if (embedData.image) embed.setImage(embedData.image);
        if (embedData.timestamp) embed.setTimestamp();
        if (embedData.fields && embedData.fields.length > 0) {
            embed.addFields(embedData.fields);
        }

        return embed;
    }

    async sendRoleRewardNotification(guildId, userId, role, level) {
        try {
            const config = await this.levelManager.getGuildConfig(guildId);
            const guild = this.client.guilds.cache.get(guildId);
            let member = guild?.members.cache.get(userId);
            if (!member) {
                try {
                    member = await guild.members.fetch(userId);
                } catch {
                    return;
                }
            }

            const notificationData = {
                userMention: member.toString(),
                userTag: member.user.tag,
                roleMention: `<@&${role.id}>`,
                roleName: role.name,
                level: level,
                guildName: guild.name
            };


            if (config.notifications.levelUpDM) {
                try {
                    const message = `¡Felicidades! Has desbloqueado el rol **${role.name}** por alcanzar el nivel ${level} 🏆`;
                    await member.send(message);
                } catch (error) {
                }
            }

            if (config.notifications.levelUpChannel) {
                const channel = guild.channels.cache.get(config.notifications.levelUpChannel);
                if (channel?.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setTitle('¡Nuevo Rol Desbloqueado! 🏆')
                        .setDescription(`${member.toString()} ha desbloqueado el rol **${role.name}** por alcanzar el nivel ${level}`)
                        .setColor('#FFD700')
                        .setTimestamp()
                        .setFooter({ text: guild.name, iconURL: guild.iconURL() });

                    await channel.send({ embeds: [embed] });
                }
            }

        } catch (error) {
            this.client.logger.error('❌ Error enviando notificación de rol:', error);
        }
    }

    async sendShopPurchaseNotification(guildId, userId, item, quantity) {
        try {
            const config = await this.levelManager.getGuildConfig(guildId);
            const guild = this.client.guilds.cache.get(guildId);
            let member = guild?.members.cache.get(userId);
            if (!member) {
                try {
                    member = await guild.members.fetch(userId);
                } catch {
                    return;
                }
            }

            try {
                const message = `✅ Has comprado **${item.name}** x${quantity} por ${item.price} ${item.currency === 'coins' ? 'monedas' : 'tokens'}`;
                await member.send(message);
            } catch (error) {
            }

            const logChannelId = config.shop?.logChannelId;
            if (logChannelId) {
                const logChannel = guild.channels.cache.get(logChannelId);
                if (logChannel?.isTextBased()) {
                    const embed = new EmbedBuilder()
                        .setTitle('🛒 Compra en Tienda')
                        .setDescription(`${member.user.tag} (${member.id})`)
                        .addFields(
                            { name: 'Item', value: item.name, inline: true },
                            { name: 'Cantidad', value: quantity.toString(), inline: true },
                            { name: 'Precio', value: `${item.price} ${item.currency === 'coins' ? '💰' : '🎫'}`, inline: true },
                            { name: 'Categoría', value: item.category || 'General', inline: true }
                        )
                        .setColor('#00FF00')
                        .setTimestamp()
                        .setFooter({ text: 'Sistema de Tienda' });

                    await logChannel.send({ embeds: [embed] });
                }
            }

        } catch (error) {
            this.client.logger.error('❌ Error enviando notificación de compra:', error);
        }
    }

    async sendDailyRewardNotification(guildId, userId, rewardData) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            let member = guild?.members.cache.get(userId);
            if (!member) {
                try {
                    member = await guild.members.fetch(userId);
                } catch {
                    return;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🎁 Recompensa Diaria Reclamada')
                .setDescription(`¡Bien hecho ${member.user.username}! Has reclamado tu recompensa diaria.`)
                .addFields(
                    { name: 'Monedas', value: `💰 ${rewardData.coins}`, inline: true },
                    { name: 'Tokens', value: rewardData.tokens > 0 ? `🎫 ${rewardData.tokens}` : 'Ninguno', inline: true },
                    { name: 'Racha', value: `${rewardData.streakDays} días`, inline: true }
                )
                .setColor('#FFD700')
                .setTimestamp()
                .setFooter({ text: 'Vuelve mañana para otra recompensa' });

            try {
                await member.send({ embeds: [embed] });
            } catch (error) {
            }

        } catch (error) {
            this.client.logger.error('❌ Error enviando notificación de daily:', error);
        }
    }

    async sendAchievementNotification(guildId, userId, achievement) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            let member = guild?.members.cache.get(userId);
            if (!member) {
                try {
                    member = await guild.members.fetch(userId);
                } catch {
                    return;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('🏆 Logro Desbloqueado!')
                .setDescription(`**${achievement.name}**`)
                .addFields(
                    { name: 'Descripción', value: achievement.description },
                    { name: 'Recompensa', value: achievement.reward || 'Sin recompensa' }
                )
                .setColor(this.getRarityColor(achievement.rarity || 'common'))
                .setTimestamp()
                .setFooter({ text: guild.name, iconURL: guild.iconURL() });

            try {
                await member.send({ embeds: [embed] });
            } catch (error) {
            }

        } catch (error) {
            this.client.logger.error('❌ Error enviando notificación de logro:', error);
        }
    }

    getRarityColor(rarity) {
        const colors = {
            common: '#808080',
            uncommon: '#00FF00',
            rare: '#0080FF',
            epic: '#8000FF',
            legendary: '#FF8000'
        };
        return colors[rarity] || '#808080';
    }

    async sendErrorNotification(guildId, error, context = '') {
        try {
            const config = await this.levelManager.getGuildConfig(guildId);
            const logChannelId = config.notifications?.levelUpChannel;

            if (!logChannelId) return;

            const guild = this.client.guilds.cache.get(guildId);
            const channel = guild.channels.cache.get(logChannelId);

            if (!channel?.isTextBased()) return;

            const embed = new EmbedBuilder()
                .setTitle('❌ Error en Sistema de Niveles')
                .setDescription(`**Contexto:** ${context}`)
                .addFields(
                    { name: 'Error', value: `\`\`\`${error.message}\`\`\`` },
                    { name: 'Timestamp', value: new Date().toISOString() }
                )
                .setColor('#FF0000')
                .setTimestamp();

            await channel.send({ embeds: [embed] });

        } catch (notificationError) {
            this.client.logger.error('❌ Error enviando notificación de error:', notificationError);
        }
    }

    async sendLeaderboardUpdate(guildId, leaderboardData, type = 'level') {
        try {
            const config = await this.levelManager.getGuildConfig(guildId);
            const updateChannelId = config.leaderboard?.showInChannel;

            if (!updateChannelId) return;

            const guild = this.client.guilds.cache.get(guildId);
            const channel = guild.channels.cache.get(updateChannelId);

            if (!channel?.isTextBased()) return;

            const typeNames = {
                level: 'Nivel',
                xp: 'XP',
                messages: 'Mensajes',
                voice: 'Minutos de Voz',
                coins: 'Monedas'
            };

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Leaderboard - ${typeNames[type] || type}`)
                .setDescription(`Top ${leaderboardData.length} usuarios`)
                .setColor('#FFD700')
                .setTimestamp()
                .setFooter({ text: guild.name, iconURL: guild.iconURL() });

            let description = '';
            leaderboardData.forEach((entry, index) => {
                let value = '';
                switch (type) {
                    case 'level': value = `Nivel ${entry.level}`; break;
                    case 'xp': value = `${entry.xp} XP`; break;
                    case 'messages': value = `${entry.messages} mensajes`; break;
                    case 'voice': value = `${entry.voiceMinutes} minutos`; break;
                    case 'coins': value = `💰 ${entry.coins}`; break;
                    default: value = entry[type] || 'N/A';
                }

                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                description += `${medal} **${entry.username}** - ${value}\n`;
            });

            embed.setDescription(description.length > 4096 ? description.substring(0, 4093) + '...' : description);

            await channel.send({ embeds: [embed] });

        } catch (error) {
            this.client.logger.error('❌ Error enviando leaderboard:', error);
        }
    }
}