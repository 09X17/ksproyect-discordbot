import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import JobsConfig from '../../../LevelSystem/Managers/JobsConfig.js';

export default class JobSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('job')
                .setDescription('Gestión de trabajos')
                .addSubcommand(sub =>
                    sub.setName('info')
                        .setDescription('Ver tu trabajo actual')
                )
                .addSubcommand(sub =>
                    sub.setName('join')
                        .setDescription('Unirse a un trabajo')
                )
                .addSubcommand(sub =>
                    sub.setName('leave')
                        .setDescription('Abandonar tu trabajo')
                )
                .addSubcommand(sub =>
                    sub.setName('work')
                        .setDescription('Trabajar en tu empleo actual')
                )
                .addSubcommand(sub =>
                    sub
                        .setName('salary')
                        .setDescription('Cobra tu salario')
                        .addStringOption(opt =>
                            opt
                                .setName('type')
                                .setDescription('Tipo de salario')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Semanal', value: 'weekly' },
                                    { name: 'Mensual', value: 'monthly' }
                                )
                        )
                )
            ,
            cooldown: 5,
            category: 'jobs'
        });
    }

    async execute(client, interaction) {
        //     await interaction.deferReply({ flags: 64 });

        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        try {
            // ================= INFO =================
            if (sub === 'info') {

                const jobs = Object.values(JobsConfig);
                const page = 0;
                const job = jobs[page];

                const embed = buildJobEmbed(job, page, jobs.length);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`job_prev_${page}`)
                        .setEmoji("<:flechaizquierda:1456491998335865075>")
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),

                    new ButtonBuilder()
                        .setCustomId(`job_next_${page}`)
                        .setEmoji("<:flechaderecha:1455684486938362010>")
                        .setStyle(ButtonStyle.Primary)
                );

                return interaction.reply({
                    embeds: [embed],
                    components: [row],
                });
            }


            // ================= JOIN =================
            if (sub === 'join') {
                const userJobs = await client.levelManager.getUserJobs(userId, guildId);

                if (userJobs.activeJob) {
                    const currentKey = userJobs.activeJob.toLowerCase();
                    const current = JobsConfig[currentKey];
                    return interaction.reply({ content: `<:rechazado:1453073959842091008> Ya tienes un trabajo activo (**${current?.name || 'Desconocido'}**).\nDebes salir primero con \`/job leave\`.`, flags: 64 });
                }

                const options = Object.values(JobsConfig).map(job => ({
                    label: job.name,
                    value: job.id,
                    description: job.description.slice(0, 50)
                }));

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`job_join_${userId}`)
                        .setPlaceholder('Selecciona un trabajo')
                        .addOptions(options)
                );

                return interaction.reply({
                    content: '<:verificado:1453073955467563008> Selecciona el trabajo al que quieres unirte:',
                    components: [row]
                });
            }

            // ================= LEAVE =================
            if (sub === 'leave') {
                const userJobs = await client.levelManager.getUserJobs(userId, guildId);

                if (!userJobs.activeJob) {
                    return interaction.reply({ content: '❌ No tienes ningún trabajo para abandonar.', flags: 64 });
                }

                const jobKey = userJobs.activeJob.toLowerCase();
                const config = JobsConfig[jobKey];

                if (!config) {
                    return interaction.reply({ content: '❌ Configuración del trabajo no encontrada.', flags: 64 });
                }

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`job_leave_${userId}`)
                        .setPlaceholder('Confirmar trabajo a abandonar')
                        .addOptions([
                            {
                                label: config.name,
                                value: jobKey,
                                description: 'Perderás todo el progreso'
                            }
                        ])
                );

                return interaction.reply({
                    content: '⚠️ Selecciona el trabajo que deseas abandonar:',
                    components: [row]
                });
            }

            // ================= WORK =================
            if (sub === 'work') {
                const result = await client.levelManager.workJob(userId, guildId);

                // ================= ERROR / FALLA =================
                if (!result.success) {
                    const userJobs = await client.levelManager.getUserJobs(userId, guildId);
                    const jobKey = userJobs.activeJob?.toLowerCase();
                    const config = JobsConfig[jobKey];

                    // ❌ Fallo del trabajo
                    if (result.penalty && config) {
                        const unix = Math.floor(result.nextWorkAt.getTime() / 1000);
                        return interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setTitle(`<:perdida:1466082535602786539> \`EL TRABAJO HA FALLADO\``)
                                    .setThumbnail("https://cdn.discordapp.com/attachments/1261326873237913711/1466082652326068348/perdida.png")
                                    .setColor('#E74C3C')
                                    .setDescription(
                                        `${config.failChanceMessage || 'Fallaste tu trabajo.'}\n` +
                                        `<:flechaderecha:1455684486938362010> Perdiste **${result.penalty} Monedas**.\n` +
                                        `<:relojdearena:1457064155067449364> Próximo intento: <t:${unix}:R>`
                                    )
                            ]
                        });
                    }

                    // ⏳ Cooldown
                    if (result.cooldownUntil) {
                        const unix = Math.floor(result.cooldownUntil.getTime() / 1000);
                        return interaction.reply({
                            content: `<:relojdearena:1457064155067449364> Ya trabajaste recientemente.\nPodrás volver a trabajar **<t:${unix}:R>**`,
                            flags: 64
                        });
                    }

                    return interaction.reply({
                        content: `<:flechaderecha:1455684486938362010> ${result.reason || 'No puedes trabajar ahora.'}`,
                        flags: 64
                    });
                }

                const currencyEmoji1 = {
                    coins: '<:dinero:1451695904351457330>',
                    xp: '<:xp:1453078768687255845>'
                };

                const currencyNames1 = {
                    coins: 'MONEDAS',
                    xp: 'XP'
                };

                // ================= RECOMPENSAS =================
                const rewardsText = Object.entries(result.rewards)
                    .map(([k, v]) =>
                        `${currencyEmoji1[k] || '<:xp:1453078768687255845>'} \`${currencyNames1[k] || k}:\` **${v}**`
                    )
                    .join('\n');

                // ================= IMPUESTOS =================
                let taxesText = '';
                if (result.taxes && Object.keys(result.taxes).length > 0) {
                    taxesText =
                        `\n\n<:contabilidad:1466904871583354911> **IMPUESTOS**\n` +
                        Object.entries(result.taxes)
                            .map(([k, v]) =>
                                `${currencyEmoji1[k] || '💰'} \`${currencyNames1[k] || k}:\` **-${v}**`
                            )
                            .join('\n');
                }

                // ================= EVASIÓN =================
                let evasionText = '';
                if (result.taxEvasion?.success) {
                    evasionText =
                        `\n\n<:impuesto:1466929231740141773> **LOGRASTE UNA EVASIÓN FISCAL**\n` +
                        `<:debilidad:1465843214358679694> \`REDUCCIÓN:\` **${result.taxEvasion.percent}%**\n` +
                        Object.entries(result.taxEvasion.saved)
                            .map(([k, v]) =>
                                `${currencyEmoji1[k] || '💰'} \`${currencyNames1[k] || k}:\` **+${v}**`
                            )
                            .join('\n');
                }

                // ================= EMBED =================
                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle(`${result.emoji || ''} \`TRABAJO COMPLETADO: ${result.jobName.toUpperCase()}\``)
                    .setThumbnail(
                        "https://cdn.discordapp.com/attachments/1261326873237913711/1466908008964554858/job-promotion.png"
                    )
                    .setDescription(
                        `<:flechaderecha:1455684486938362010> \`RECIBISTE:\`\n\n` +
                        `<:pocionmagica:1453100161508053052> **RECOMPENSAS**\n` +
                        rewardsText +
                        taxesText +
                        evasionText
                    );



                return interaction.reply({ embeds: [embed] });
            }


            // ================= SALARY =================
            if (sub === 'salary') {
                const type = interaction.options.getString('type'); // weekly | monthly

                const isMonthly = type === 'monthly';

                const result = isMonthly
                    ? await client.levelManager.claimMonthlySalary(userId, guildId)
                    : await client.levelManager.claimWeeklySalary(userId, guildId);

                if (!result.success) {
                    if (
                        result.reason === 'salary_cooldown' ||
                        result.reason === 'monthly_salary_cooldown'
                    ) {
                        const unix = Math.floor((Date.now() + result.remaining) / 1000);

                        return interaction.reply({
                            content: `<:relojdearena:1457064155067449364> Ya cobraste tu salario ${isMonthly ? 'mensual' : 'semanal'}.\n` +
                                `Podrás volver a cobrar **<t:${unix}:R>**`,
                            flags: 64
                        });
                    }

                    return interaction.reply({
                        content: `❌ ${result.reason || 'No puedes cobrar salario ahora.'}`,
                        flags: 64
                    });
                }

                // =========================
                // EMOJIS
                // =========================
                const currencyEmoji = {
                    coins: '<:dinero:1451695904351457330>',
                    tokens: '<:tokens:1451695903080579192>'
                };

                const currencyNames = {
                    coins: 'MONEDAS',
                    tokens: 'TOKENS'
                };

                const salaryText = Object.entries(result.salary)
                    .map(([k, v]) => `${currencyEmoji[k] || '💰'} \`${v} ${currencyNames[k] || k}\``)
                    .join('\n');

                const embed = new EmbedBuilder()
                    .setColor(isMonthly ? '#9B59B6' : '#F1C40F')
                    .setTitle(
                        isMonthly
                            ? '<:corona:1465843214358679694> `SALARIO MENSUAL COBRADO`'
                            : '<:debilidad:1465843214358679694> `SALARIO SEMANAL COBRADO`'
                    )
                    .setDescription(
                        `<:verificado:1453073955467563008> Has cobrado tu salario como **${result.jobName.toUpperCase()}**\n` +
                        salaryText
                    );

                return interaction.reply({ embeds: [embed] });
            }



        } catch (err) {
            client.logger.error('Error en /job:', err);
            return interaction.reply({ content: '❌ Ocurrió un error.', flags: 64 });
        }
    }
}


function buildJobEmbed(job, page, total) {
    const cooldownMin = Math.floor(job.cooldown / 60000);

    const taxRate = job.taxes?.rate
        ? `${job.taxes.rate * 100}%`
        : 'Ninguno';

    const taxCurrencies = job.taxes?.appliesTo?.length
        ? job.taxes.appliesTo.map(c => c.toUpperCase()).join(', ')
        : '—';

    const evasionChance = job.taxEvasion?.chance
        ? `${job.taxEvasion.chance * 100}%`
        : '—';

    const evasionReduction = job.taxEvasion?.reduction
        ? `${job.taxEvasion.reduction * 100}%`
        : '—';

    return new EmbedBuilder()
        .setColor(job.illegal ? '#E74C3C' : '#2ECC71')
        .setTitle(`\`${job.name.toUpperCase()}\``)
        .setDescription(
            `<:flechaderecha:1455684486938362010> \`${job.description.toUpperCase()}\`\n` +
            `\`ESTADO\`: ${job.illegal
                ? '<:rechazado:1453073959842091008> **Ilegal**'
                : '<:verificado:1453073955467563008> **Legal**'}\n\n` +

            `<:expediente:1466915123967820022> \`INFORMACIÓN\`\n` +
            `• \`PROB DE FALLAR:\` **${job.failChance * 100}%**\n` +
            `• \`COOLDOWN:\` **${cooldownMin} MINUTOS**\n\n` +

            `<:expediente:1466915123967820022> \`IMPUESTOS\`\n` +
            `• \`TASA:\` **${taxRate}**\n` +
            `• \`APLICA A:\` **${taxCurrencies}**\n\n` +

            `<:expediente:1466915123967820022> \`EVASIÓN FISCAL\`\n` +
            `• \`PROBABILIDAD:\` **${evasionChance}**\n` +
            `• \`REDUCCIÓN:\` **${evasionReduction}**\n\n` +

            `<:recompensa:1456812362815373396> \`RECOMPENSAS\`\n` +
            `<:dinero:1451695904351457330> \`MONEDAS:\` **${job.rewards.coins.min} – ${job.rewards.coins.max}**\n` +
            `<:xp:1453078768687255845> \`XP:\` **${job.rewards.xp.min} – ${job.rewards.xp.max}**`
        )
        .setFooter({ text: `Trabajo ${page + 1} de ${total}` });
}
