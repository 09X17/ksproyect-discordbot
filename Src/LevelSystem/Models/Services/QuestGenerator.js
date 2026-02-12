// Services/QuestGenerator.js
class QuestGenerator {
    static generateDailyQuests(guildId, count = 3) {
        const questTemplates = [
            {
                title: "💬 Charla Matutina",
                description: "Envía 50 mensajes en el servidor",
                type: "daily",
                category: "chat",
                difficulty: "easy",
                objectives: [{
                    type: "send_messages",
                    target: 50
                }],
                rewards: {
                    xp: 250,
                    coins: 100
                }
            },
            {
                title: "🎤 Conexión Vocal",
                description: "Pasa 30 minutos en un canal de voz",
                type: "daily",
                category: "voice",
                difficulty: "medium",
                objectives: [{
                    type: "join_voice",
                    target: 1800 // 30 minutos en segundos
                }],
                rewards: {
                    xp: 500,
                    coins: 200,
                    tokens: 1
                }
            },
            {
                title: "🤝 Embajador Social",
                description: "Consigue 5 reacciones en tus mensajes",
                type: "daily",
                category: "social",
                difficulty: "easy",
                objectives: [{
                    type: "react_messages",
                    target: 5
                }],
                rewards: {
                    xp: 150,
                    coins: 75
                }
            },
            {
                title: "💰 Buscador de Tesoros",
                description: "Gana 500 monedas",
                type: "daily",
                category: "economy",
                difficulty: "medium",
                objectives: [{
                    type: "earn_coins",
                    target: 500
                }],
                rewards: {
                    xp: 400,
                    coins: 250,
                    tokens: 2
                }
            }
        ];
        
        // Seleccionar aleatoriamente
        const selected = [];
        const available = [...questTemplates];
        
        for (let i = 0; i < Math.min(count, available.length); i++) {
            const randomIndex = Math.floor(Math.random() * available.length);
            selected.push({
                guildId,
                ...available[randomIndex]
            });
            available.splice(randomIndex, 1);
        }
        
        return selected;
    }
    
    static generateWeeklyQuests(guildId) {
        return [
            {
                guildId,
                title: "🏆 Maestro de la Semana",
                description: "Completa 10 misiones diarias esta semana",
                type: "weekly",
                category: "collection",
                difficulty: "hard",
                objectives: [{
                    type: "complete_quests",
                    target: 10
                }],
                rewards: {
                    xp: 5000,
                    coins: 1000,
                    tokens: 10,
                    special: {
                        title: "🏆 Maestro Semanal",
                        badge: "weekly_master"
                    }
                },
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        ];
    }
}