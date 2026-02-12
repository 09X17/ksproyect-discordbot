import { EmbedBuilder } from 'discord.js';

export default class UserInfoCommand {
    constructor() {
        this.name = 'userinfo';
        this.aliases = ['user', 'usuario', 'info'];
        this.description = 'Muestra información de un usuario';
        this.usage = '!userinfo [@usuario]';
        this.category = 'utilidad';
        this.cooldown = 10;
    }

    async execute(client, message, args) {
        const target = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(target.id);

        const embed = new EmbedBuilder()
            .setTitle(`👤 Información de ${target.username}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setColor('#5865F2')
            .addFields(
                { name: '🆔 ID', value: target.id, inline: true },
                { name: '📛 Tag', value: target.tag, inline: true },
                { name: '🎭 Apodo', value: member?.nickname || 'Ninguno', inline: true },
                { name: '📅 Cuenta creada', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Se unió', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'No en el servidor', inline: true },
                { name: '🎨 Roles', value: member?.roles.cache.size.toString() || '0', inline: true }
            )
            .setFooter({ text: `Solicitado por ${message.author.tag}` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
        client.logger.command(`Comando !userinfo usado por ${message.author.tag}`);
    }
}