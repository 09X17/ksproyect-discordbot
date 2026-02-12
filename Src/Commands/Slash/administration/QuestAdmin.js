// Commands/Quests/AdminQuestsCommand.js
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class AdminQuestsCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('quests-admin')
                .setDescription('Administración de misiones (Solo Admin)')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('create')
                        .setDescription('Crear nueva misión')
                        .addStringOption(option =>
                            option.setName('title')
                                .setDescription('Título de la misión')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('description')
                                .setDescription('Descripción de la misión')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('type')
                                .setDescription('Tipo de misión')
                                .addChoices(
                                    { name: 'Diaria', value: 'daily' },
                                    { name: 'Semanal', value: 'weekly' },
                                    { name: 'Mensual', value: 'monthly' }
                                )
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('objective-type')
                                .setDescription('Tipo de objetivo')
                                .addChoices(
                                    { name: 'Enviar Mensajes', value: 'send_messages' },
                                    { name: 'Tiempo en Voz', value: 'join_voice' },
                                    { name: 'Ganar XP', value: 'earn_xp' },
                                    { name: 'Ganar Monedas', value: 'earn_coins' },
                                    { name: 'Invitar Usuarios', value: 'invite_users' }
                                )
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option.setName('target')
                                .setDescription('Valor objetivo')
                                .setRequired(true)
                                .setMinValue(1)
                        )
                        .addIntegerOption(option =>
                            option.setName('xp-reward')
                                .setDescription('Recompensa de XP')
                                .setRequired(true)
                                .setMinValue(1)
                        )
                        .addIntegerOption(option =>
                            option.setName('coin-reward')
                                .setDescription('Recompensa de monedas')
                                .setRequired(true)
                                .setMinValue(0)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('delete')
                        .setDescription('Eliminar misión')
                        .addStringOption(option =>
                            option.setName('quest-id')
                                .setDescription('ID de la misión')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('Listar todas las misiones')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('assign')
                        .setDescription('Asignar misión a usuario')
                        .addUserOption(option =>
                            option.setName('user')
                                .setDescription('Usuario')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option.setName('quest-id')
                                .setDescription('ID de la misión')
                                .setRequired(true)
                        )
                ),
            cooldown: 10,
            category: 'admin',
            userPermissions: [PermissionFlagsBits.Administrator],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ No tienes permisos para usar este comando.',
                    flags: 64
                });
            }

            const subcommand = interaction.options.getSubcommand();
            
            switch (subcommand) {
                case 'create':
                    await this.createQuest(client, interaction);
                    break;
                case 'delete':
                    await this.deleteQuest(client, interaction);
                    break;
                case 'list':
                    await this.listQuests(client, interaction);
                    break;
                case 'assign':
                    await this.assignQuest(client, interaction);
                    break;
            }
        } catch (error) {
            console.error('Error en quests-admin:', error);
            await interaction.reply({
                content: '❌ Ocurrió un error al procesar el comando.',
                flags: 64
            });
        }
    }

    async createQuest(client, interaction) {
        const questManager = client.levelManager?.questManager;
        if (!questManager) {
            return interaction.reply({
                content: '❌ El sistema de misiones no está disponible.',
                flags: 64
            });
        }

        const questData = {
            title: interaction.options.getString('title'),
            description: interaction.options.getString('description'),
            type: interaction.options.getString('type'),
            objectiveType: interaction.options.getString('objective-type'),
            target: interaction.options.getInteger('target'),
            xpReward: interaction.options.getInteger('xp-reward'),
            coinReward: interaction.options.getInteger('coin-reward'),
            guildId: interaction.guild.id,
            createdBy: interaction.user.id
        };

        const quest = await questManager.createQuest(questData);

        const embed = new EmbedBuilder()
            .setTitle('<:success:1457064155067449369> `MISIÓN CREADA`')
            .setColor("#2ECC71")
            .setDescription(`**${quest.title}**`)
            .addFields(
                {
                    name: '📝 **Detalles**',
                    value: `• Tipo: **${quest.type}**\n• Objetivo: **${quest.objectiveType}**\n• Meta: **${quest.target}**`,
                    inline: true
                },
                {
                    name: '🎁 **Recompensas**',
                    value: `• XP: **${quest.xpReward}**\n• Monedas: **${quest.coinReward}**`,
                    inline: true
                },
                {
                    name: '🆔 **ID**',
                    value: `\`${quest._id}\``,
                    inline: false
                }
            )
            .setFooter({ 
                text: `Creada por ${interaction.user.tag}` 
            });

        await interaction.reply({ embeds: [embed] });
    }

    async deleteQuest(client, interaction) {
        const questId = interaction.options.getString('quest-id');
        const questManager = client.levelManager?.questManager;
        
        if (!questManager) {
            return interaction.reply({
                content: '❌ El sistema de misiones no está disponible.',
                flags: 64
            });
        }

        const deleted = await questManager.deleteQuest(questId, interaction.guild.id);
        
        if (!deleted) {
            return interaction.reply({
                content: '❌ No se pudo eliminar la misión o no existe.',
                flags: 64
            });
        }

        await interaction.reply({
            content: `✅ Misión eliminada exitosamente.`,
            flags: 64
        });
    }

    async listQuests(client, interaction) {
        const questManager = client.levelManager?.questManager;
        if (!questManager) {
            return interaction.reply({
                content: '❌ El sistema de misiones no está disponible.',
                flags: 64
            });
        }

        const quests = await questManager.getAllQuests(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle('<:list:1457064155067449370> `TODAS LAS MISIONES`')
            .setColor("#1ABC9C")
            .setDescription(`Total: **${quests.length} misiones**`);

        if (quests.length === 0) {
            embed.setDescription('📭 No hay misiones configuradas.');
        } else {
            quests.forEach(quest => {
                embed.addFields({
                    name: `📌 ${quest.title}`,
                    value: `ID: \`${quest._id}\`\nTipo: ${quest.type}\nActiva: ${quest.active ? '✅' : '❌'}`,
                    inline: true
                });
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
}