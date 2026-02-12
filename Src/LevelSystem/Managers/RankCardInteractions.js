import UserLevel from '../Models/UserLevel.js';

export default async function handleRankcardColorSelect(client, interaction) {
    if (!interaction.isStringSelectMenu()) return false;
    if (interaction.customId !== 'rankcard_color_select') return false;

    await interaction.deferUpdate();

    const permissionKey = interaction.values[0];
    const user = await UserLevel.findOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id
    });

    if (!user) {
        await interaction.editReply({
            content: '❌ No se encontró tu perfil.',
            components: []
        });
        return true;
    }

    if (!user.customization?.permissions?.[permissionKey]) {
        await interaction.editReply({
            content: '❌ No tienes este color desbloqueado.',
            components: []
        });
        return true;
    }

    await UserLevel.updateOne(
        { _id: user._id },
        { $set: { 'customization.active.accentColor': permissionKey }  }
    );

    await interaction.editReply({
        content:
            `🎨 Color aplicado correctamente: \`${permissionKey}\`\n` +
            `Usa \`/rankcard\` para ver el cambio.`,
        components: []
    });

    return true;
}
