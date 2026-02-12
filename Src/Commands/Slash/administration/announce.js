import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  AttachmentBuilder,
  EmbedBuilder
} from 'discord.js';

import { createCanvas, loadImage, registerFont } from 'canvas';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class AnuncioCommand extends SlashCommand {
  constructor() {
    super({
      data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Envía un anuncio con una card personalizada')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(option =>
          option
            .setName('canal')
            .setDescription('Canal donde se enviará el anuncio')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        )
        .addStringOption(option =>
          option
            .setName('titulo')
            .setDescription('Título del anuncio')
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption(option =>
          option
            .setName('descripcion')
            .setDescription('Descripción del anuncio (opcional)')
            .setRequired(false)
            .setMaxLength(500)
        )
        .addStringOption(option =>
          option
            .setName('color')
            .setDescription('Color de acento (hex, ej: #5865F2)')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('mencionar')
            .setDescription('Mencionar @everyone (requiere permisos)')
            .setRequired(false)
        ),

      cooldown: 10,
      category: 'moderation',
      userPermissions: [PermissionFlagsBits.ManageGuild],
      botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
    });
  }

  async execute(client, interaction) {
    await interaction.deferReply({ flags: 64 });

    try {
      const canal = interaction.options.getChannel('canal');
      const titulo = interaction.options.getString('titulo');
      const descripcion = interaction.options.getString('descripcion');
      const colorHex = interaction.options.getString('color') || '#5865F2';
      const mencionar = interaction.options.getBoolean('mencionar') || false;

      // Validaciones
      if (!canal?.isTextBased()) {
        return interaction.editReply('❌ El canal seleccionado no es válido');
      }

      if (!this.isValidHexColor(colorHex)) {
        return interaction.editReply('❌ Color hex inválido. Usa formato: #RRGGBB');
      }

      if (mencionar && !interaction.member.permissions.has(PermissionFlagsBits.MentionEveryone)) {
        return interaction.editReply('❌ No tienes permisos para mencionar @everyone');
      }

      // Generar card
      const buffer = await this.generarCard({
        avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 512 }),
        username: interaction.user.username,
        titulo,
        descripcion,
        color: colorHex,
        guildIcon: interaction.guild.iconURL({ extension: 'png', size: 256 })
      });

      const attachment = new AttachmentBuilder(buffer, { name: 'anuncio.png' });

      // Embed adicional (opcional)
      const embed = new EmbedBuilder()
        .setColor(colorHex)
        .setTitle(titulo)
        .setImage('attachment://anuncio.png')
        .setFooter({ 
          text: `Anunciado por ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      if (descripcion) {
        embed.setDescription(descripcion);
      }

      // Enviar
      await canal.send({
        content: mencionar ? '@everyone' : '📣 **Nuevo anuncio**',
        embeds: [embed],
        files: [attachment]
      });

      await interaction.editReply(
        `✅ Anuncio enviado correctamente en ${canal}\n🔗 [Ir al mensaje](${canal.url})`
      );

    } catch (err) {
      console.error('Error en comando announce:', err);
      
      const errorMsg = err.code === 50013 
        ? '❌ No tengo permisos para enviar mensajes en ese canal'
        : '❌ Ocurrió un error al generar o enviar el anuncio';
      
      await interaction.editReply(errorMsg);
    }
  }

  async generarCard({ avatarURL, username, titulo, descripcion, color, guildIcon }) {
    const WIDTH = 800;
    const HEIGHT = 500;

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // Fondo con gradiente
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#1a1a1a');
    gradient.addColorStop(1, '#2d2d2d');
    
    this.roundRect(ctx, 0, 0, WIDTH, HEIGHT, 30);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Barra de color superior
    ctx.fillStyle = color;
    this.roundRect(ctx, 0, 0, WIDTH, 8, 30);
    ctx.fill();

    // Avatar
    try {
      const avatar = await loadImage(avatarURL);
      ctx.save();
      ctx.beginPath();
      ctx.arc(100, 100, 60, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 40, 40, 120, 120);
      ctx.restore();

      // Borde del avatar
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(100, 100, 60, 0, Math.PI * 2);
      ctx.stroke();
    } catch (err) {
      console.error('Error cargando avatar:', err);
    }

    // Username
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial, Sans-serif';
    ctx.fillText(username, 180, 80);

    // Rol/Badge
    ctx.fillStyle = color;
    ctx.font = '18px Arial, Sans-serif';
    ctx.fillText('ANUNCIANTE', 180, 110);

    // Línea separadora
    ctx.strokeStyle = '#404040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 180);
    ctx.lineTo(WIDTH - 40, 180);
    ctx.stroke();

    // Título del anuncio
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial, Sans-serif';
    this.wrapText(ctx, titulo, 40, 240, WIDTH - 80, 50);

    // Descripción
    if (descripcion) {
      ctx.fillStyle = '#b0b0b0';
      ctx.font = '24px Arial, Sans-serif';
      this.wrapText(ctx, descripcion, 40, 320, WIDTH - 80, 35);
    }

    // Icono del servidor (esquina inferior derecha)
    if (guildIcon) {
      try {
        const icon = await loadImage(guildIcon);
        ctx.globalAlpha = 0.3;
        ctx.drawImage(icon, WIDTH - 120, HEIGHT - 120, 80, 80);
        ctx.globalAlpha = 1.0;
      } catch (err) {
        // Ignorar si no se puede cargar
      }
    }

    return canvas.toBuffer('image/png');
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  isValidHexColor(hex) {
    return /^#[0-9A-F]{6}$/i.test(hex);
  }
}