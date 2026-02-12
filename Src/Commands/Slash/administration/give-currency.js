import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class GiveCurrencySlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('give-currency')
                .setDescription('Da coins o tokens a un usuario (Solo administradores)')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario al que dar la moneda')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('moneda')
                        .setDescription('Tipo de moneda')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Coins', value: 'coins' },
                            { name: 'Tokens', value: 'tokens' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('cantidad')
                        .setDescription('Cantidad a otorgar')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1_000_000)
                )
                .addStringOption(option =>
                    option
                        .setName('razon')
                        .setDescription('Razón de la entrega')
                        .setRequired(false)
                ),
            cooldown: 2,
            category: 'admin',
            permissions: [PermissionFlagsBits.ManageGuild]
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply({ flags: 64 });

        try {
            const target = interaction.options.getUser('usuario');
            const currency = interaction.options.getString('moneda');
            const amount = interaction.options.getInteger('cantidad');
            const reason = interaction.options.getString('razon') || 'Administrador';

            if (target.bot) {
                return interaction.editReply({
                    content: '⚠️ No puedes dar monedas a bots.',
                    flags: 64
                });
            }

            const guildId = interaction.guild.id;

            const result = await client.levelManager.giveCurrency(
                target.id,
                guildId,
                currency,
                amount,
                `admin_give:${interaction.user.id}:${reason}`
            );

            if (!result.success) {
                return interaction.editReply({
                    content: `❌ Error: ${result.reason || 'No se pudo otorgar la moneda.'}`,
                    flags: 64
                });
            }

            const currencyEmoji = currency === 'coins'
                ? '<:moneda:1456812362815373396>'
                : '<:token:1457062998374879293>';

            const currencyName = currency === 'coins' ? 'COINS' : 'TOKENS';

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('`MONEDA OTORGADA`')
                .setDescription(
                    `<:flechaderecha:1455684486938362010> Se otorgaron **${result.amount.toLocaleString()} ${currencyName}** a ${target}`
                )
                .addFields(
                    {
                        name: '**```DETALLES```**',
                        value: [
                            `${currencyEmoji} \`MONEDA:\` **${currencyName}**`,
                            `<:flechaderecha:1455684486938362010> \`CANTIDAD BASE:\` **${amount.toLocaleString()}**`,
                            result.fromEvent
                                ? `<:recompensa:1456812362815373396> \`BONUS EVENTO:\` **+${result.bonus}**`
                                : `<:recompensa:1456812362815373396> \`BONUS EVENTO:\` **0**`,
                            `<:cajaderegalo:1457062998374879293> \`BALANCE ACTUAL:\` **${result.newBalance.toLocaleString()}**`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '**```INFORMACIÓN```**',
                        value: [
                            `<:cajaderegalo:1457062998374879293> \`ADMINISTRADOR:\` ${interaction.user.tag}`,
                            `<:flechaderecha:1455684486938362010> \`RAZÓN:\` __${reason}__`
                        ].join('\n'),
                        inline: false
                    }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${target.id}` });


            await interaction.editReply({ embeds: [embed] });

            try {
                const userEmbed = new EmbedBuilder()
                    .setColor('#FF8B75')
                    .setTitle('`RECIBISTES MONEDA`')
                    .setDescription(
                        `<:flechaderecha:1455684486938362010> Has recibido **${result.amount.toLocaleString()} ${currencyName}** en **${interaction.guild.name}**`
                    )
                    .addFields(
                        {
                            name: '**```BALANCE ACTUAL```**',
                            value: [
                                `${currencyEmoji} \`AHORA TIENES:\` **${result.newBalance.toLocaleString()} ${currencyName}**`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '**```INFORMACIÓN```**',
                            value: [
                                `<:cajaderegalo:1457062998374879293> \`ADMINISTRADOR:\` <@${interaction.user.id}>`,
                                `<:flechaderecha:1455684486938362010> \`RAZÓN:\` __${reason}__`
                            ].join('\n'),
                            inline: false
                        }
                    )
                    .setTimestamp();

                await target.send({ embeds: [userEmbed] }).catch(() => { });
            } catch (dmError) { }

        } catch (error) {
            client.logger.error('❌ Error en comando give-currency:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al otorgar la moneda.',
                flags: 64
            });
        }
    }
}
