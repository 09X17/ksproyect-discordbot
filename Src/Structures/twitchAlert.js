import axios from 'axios';
import { EmbedBuilder } from 'discord.js';

let twitchAccessToken = null;
let tokenExpiration = 0;

// Estado en memoria (luego lo puedes mover a Mongo)
const streamState = {
    online: false,
    streamId: null,
    title: null,
    game: null
};

/* ============================================================
   🔑 TOKEN
   ============================================================ */
async function getTwitchAccessToken() {
    const res = await axios.post(
        'https://id.twitch.tv/oauth2/token',
        null,
        {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        }
    );

    twitchAccessToken = res.data.access_token;
    tokenExpiration = Date.now() + (res.data.expires_in - 60) * 1000;

   // console.log('🟣 Twitch token renovado');
}

/* ============================================================
   📡 CHECK STREAM
   ============================================================ */
async function checkTwitchStream(client) {
    if (!twitchAccessToken || Date.now() >= tokenExpiration) {
        await getTwitchAccessToken();
    }

    const res = await axios.get(
        'https://api.twitch.tv/helix/streams',
        {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                Authorization: `Bearer ${twitchAccessToken}`
            },
            params: {
                user_login: process.env.TWITCH_STREAMER
            }
        }
    );

    const stream = res.data.data[0];

    // 🔴 OFFLINE
    if (!stream || stream.type !== 'live') {
        streamState.online = false;
        return;
    }

    // 🟢 STREAM NUEVO
    if (!streamState.online || stream.id !== streamState.streamId) {
        streamState.online = true;
        streamState.streamId = stream.id;
        streamState.title = stream.title;
        streamState.game = stream.game_name;

        return sendLiveEmbed(client, stream);
    }

    // 🔁 CAMBIO DE TÍTULO / JUEGO
    if (
        stream.title !== streamState.title ||
        stream.game_name !== streamState.game
    ) {
        streamState.title = stream.title;
        streamState.game = stream.game_name;

        return sendUpdateEmbed(client, stream);
    }
}

/* ============================================================
   📢 EMBEDS
   ============================================================ */
async function sendLiveEmbed(client, stream) {
    const channel = await client.channels.fetch(
        process.env.DISCORD_CHANNEL_ID
    );
    if (!channel) return;

    const embed = buildTwitchEmbed(stream, 'live');

    /*await channel.send({
        content: `@everyone **${stream.user_name}** está en directo!`,
        embeds: [embed]
    });*/
}

async function sendUpdateEmbed(client, stream) {
    const channel = await client.channels.fetch(
        process.env.DISCORD_CHANNEL_ID
    );
    if (!channel) return;

    const embed = buildTwitchEmbed(stream, 'update');

   // await channel.send({ embeds: [embed] });
}

/* ============================================================
   🎨 EMBED BUILDER (CONFIGURABLE)
   ============================================================ */
function buildTwitchEmbed(stream, type) {
    const isLive = type === 'live';

    return new EmbedBuilder()
        .setColor(isLive ? '#9146FF' : '#772CE8')
        .setTitle(
            isLive
                ? '<:livetwitch:1453178686517018755> ¡ESTAMOS EN DIRECTO!'
                : '<:recargar:1453081355054219486> Stream actualizado'
        ) 
        .setURL(`https://twitch.tv/${stream.user_login}`)
        .setDescription(
            `<:espadas:1453178343112442020> **Juego:** \`${stream.game_name}\`\n` +
            `<:etiqueta:1453099849355493396> **Título:** \`${stream.title}\`\n` +
            `<:entrar:1453179523981119682> **Link:** https://twitch.tv/${stream.user_login}`
        )
        .setImage(
            `https://static-cdn.jtvnw.net/previews-ttv/live_user_${stream.user_login}-1280x720.jpg?t=${Date.now()}`
        )
        .setThumbnail(stream.thumbnail_url
            ?.replace('{width}', '300')
            ?.replace('{height}', '300')
        )
}

/* ============================================================
   🚀 INIT
   ============================================================ */
export function startTwitchAlerts(client) {
    setInterval(() => {
        checkTwitchStream(client).catch(err => {
            client.logger.error('Error checking Twitch stream:', err);
        });
    }, 20_000);
}
