import { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import MissionManager from '../../../LevelSystem/Managers/MissionManager.js';
import { boxTypes } from '../../../LevelSystem/Managers/boxTypesConfig.js';

export default class MissionsSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('missions')
                .setDescription('Misiones diarias y semanales')
                .addSubcommand(sub =>
                    sub.setName('show').setDescription('Ver tus misiones')
                )
                .addSubcommand(sub =>
                    sub.setName('claim').setDescription('Reclamar una misión completada')
                ),
            cooldown: 5,
            category: 'levels'
        });
    }

    async execute(client, interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'show') return this.showMissions(interaction);
        if (sub === 'claim') return this.claimMission(client, interaction);
    }

    // ─────────────── VER ───────────────
    async showMissions(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        const missions = await MissionManager.getMissions(userId, guildId);
        if (!missions) return interaction.reply('❌ No se pudieron cargar tus misiones.');

        const formatMission = (m) => {
            const barSize = 8;
            const progress = Math.min(m.progress || 0, m.goal);
            const filled = Math.round((progress / m.goal) * barSize);

            const bar =
                '<:marcolleno:1465161647894171786>'.repeat(filled) +
                '🔲'.repeat(barSize - filled);

            return `**${this.getMissionLabel(m.type)}**\n${bar}\n\`${progress}/${m.goal}\` ${m.completed ? '<:verificado:1453073955467563008>' : ''}`;
        };

        const dailyText = missions.daily.length
            ? missions.daily.map(formatMission).join('\n').slice(0, 1024)
            : 'No hay misiones diarias';

        const weeklyText = missions.weekly.length
            ? missions.weekly.map(formatMission).join('\n').slice(0, 1024)
            : 'No hay misiones semanales';

        const embed = new EmbedBuilder()
            .setThumbnail("https://cdn.discordapp.com/attachments/1261326873237913711/1465174096571662397/estrella-del-trofeo.png")
            .setColor('#ffa1e3')
            .setTitle(`<:objetivo:1465159477190852788> \`MISIONES\``)
            .addFields(
                { name: '`DIARIAS`', value: dailyText },
                { name: '`SEMANALES`', value: weeklyText }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

    // ─────────────── RECLAMAR ───────────────
    async claimMission(client, interaction) {
        await interaction.deferReply({ flags: 64 });

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        const missions = await MissionManager.getMissions(userId, guildId);
        if (!missions) return interaction.editReply('❌ No hay misiones.');

        const claimable = this.getClaimableMissions(missions);
        console.log('Misiones reclamables:', claimable);

        if (!claimable.length) {
            return interaction.editReply('❌ No tienes misiones completadas para reclamar.');
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId('mission_claim')
            .setPlaceholder('Selecciona una misión')
            .addOptions(
                claimable.map(m => ({
                    label: `${this.getMissionLabel(m.type)} | ${m.scope.toUpperCase()}`,
                    description: `Objetivo: ${m.goal}`,
                    value: `${m.scope}:${m.missionId}`,
                    emoji: this.getMissionEmoji(m.type)
                }))
            );

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.editReply({
            content: '<:flechaderecha:1455684486938362010> Selecciona una misión para reclamar:',
            components: [row]
        });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            max: 1,
            time: 30_000
        });

        collector.on('collect', async i => {
            await i.deferUpdate();
            const [scope, missionId] = i.values[0].split(':');

            try {
                const { user: updatedUser } = await MissionManager.claim(userId, guildId, missionId, scope);

                const boxType = 'legendary';
                const boxData = boxTypes[boxType];
                await updatedUser.addLootBoxToInventory(boxType, boxData.name, 1);

                const embed = new EmbedBuilder()
                    .setColor('#88fff5')
                    .setTitle('<:cinta:1453099434908061828> `MISIÓN RECLAMADA`')
                    .setDescription(
                        `<:recompensa:1456812362815373396> Has reclamado una misión **${scope.toUpperCase()}**\n\n` +
                        `<:flechaderecha:1455684486938362010> Recompensa:\n**1 Caja Legendaria**`
                    )
                    .setFooter({ text: 'Usa /inventory para abrirla' });

                await i.update({ embeds: [embed], components: [] });
            } catch (error) {
                console.error('Error reclamando misión:', error);
                await i.update({
                    content: '❌ Hubo un error reclamando la misión. Intenta de nuevo.',
                    components: []
                });
            }
        });
    }

    // ─────────────── FILTRAR MISIONES RECLAMABLES ───────────────
    getClaimableMissions(userMissions) {
        const allMissions = [];

        if (userMissions.daily && Array.isArray(userMissions.daily)) {
            userMissions.daily.forEach(m => {
                const missionObj = m.toObject ? m.toObject() : { ...m };
                allMissions.push({
                    ...missionObj,
                    scope: 'daily'
                });
            });
        }

        if (userMissions.weekly && Array.isArray(userMissions.weekly)) {
            userMissions.weekly.forEach(m => {
                const missionObj = m.toObject ? m.toObject() : { ...m };
                allMissions.push({
                    ...missionObj,
                    scope: 'weekly'
                });
            });
        }

        const filtered = allMissions.filter(m => m.completed === true && m.claimed === false);
        return filtered;
    }


    // ─────────────── HELPERS ───────────────
    getMissionLabel(type) {
        switch (type) {
            case 'messages': return 'MENSAJES';
            case 'xp': return 'XP';
            case 'voice': return 'VOZ';
            case 'lootbox': return 'LOOTBOX';
            default: return 'MISIÓN';
        }
    }

    getMissionEmoji(type) {
        switch (type) {
            case 'messages': return { id: '1451696307466010704' };
            case 'xp': return { id: '1453078768687255845' };
            case 'voice': return { id: '1465160684055826462' };
            case 'lootbox': return { id: '1457062998374879293' };
            default: return { id: '1456828988361146490' };
        }
    }
}