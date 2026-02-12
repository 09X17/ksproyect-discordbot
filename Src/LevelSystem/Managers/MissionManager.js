import UserLevel from '../Models/UserLevel.js';
import { getRandomInRange } from '../Managers/boxTypesConfig.js';

/**
 * Pool de misiones
 * Puedes expandir esto sin tocar nada más
 */
const DAILY_MISSIONS_POOL = [
    { type: 'messages', min: 10, max: 30 },
    { type: 'xp', min: 300, max: 800 },
    { type: 'voice', min: 15, max: 60 },
    { type: 'lootbox', min: 1, max: 1 }
];

const WEEKLY_MISSIONS_POOL = [
    { type: 'messages', min: 100, max: 300 },
    { type: 'xp', min: 3000, max: 8000 },
    { type: 'voice', min: 300, max: 600 }
];

class MissionManager {

    // ═══════════════════════════════════════════════════════
    // 🧩 GENERAR MISIONES
    // ═══════════════════════════════════════════════════════

    static generateMissions(pool, count, prefix) {
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, count);

        return selected.map((base, i) => {
            const goal = getRandomInRange(base.min, base.max);

            return {
                missionId: `${prefix}_${Date.now()}_${i}`,
                type: base.type,
                goal,
                progress: 0,
                completed: false,
                claimed: false,
                reward: {
                    xp: goal * 2,
                    coins: goal * 2
                }
            };
        });
    }

    static async generateDaily(user) {
        user.missions ??= {};
        user.missions.daily = this.generateMissions(
            DAILY_MISSIONS_POOL,
            3,
            'daily'
        );

        user.missions.lastGenerated ??= {};
        user.missions.lastGenerated.daily = new Date();

        await user.save();
        return user.missions.daily;
    }

    static async generateWeekly(user) {
        user.missions ??= {};
        user.missions.weekly = this.generateMissions(
            WEEKLY_MISSIONS_POOL,
            5,
            'weekly'
        );

        user.missions.lastGenerated ??= {};
        user.missions.lastGenerated.weekly = new Date();

        await user.save();
        return user.missions.weekly;
    }

    // ═══════════════════════════════════════════════════════
    // ⏰ CHECK / AUTO-GENERACIÓN
    // ═══════════════════════════════════════════════════════

    static async ensureDailyMissions(user) {
        const now = new Date();

        // Chequear si hay misiones completadas sin reclamar
        const hasUnclaimed = user.missions?.daily?.some(m => m.completed && !m.claimed);
        if (hasUnclaimed) return user.missions.daily;

        // Si no hay misiones o es un nuevo día, generar
        if (
            !user.missions?.daily?.length ||
            !user.missions?.lastGenerated?.daily ||
            user.missions.lastGenerated.daily.toDateString() !== now.toDateString()
        ) {
            return await this.generateDaily(user);
        }

        return user.missions.daily;
    }

    static async ensureWeeklyMissions(user) {
        const now = new Date();
        const currentWeek = this.getISOWeek(now);

        const lastWeek = user.missions?.lastGenerated?.weekly
            ? this.getISOWeek(user.missions.lastGenerated.weekly)
            : null;

        // Chequear si hay misiones completadas sin reclamar
        const hasUnclaimed = user.missions?.weekly?.some(m => m.completed && !m.claimed);
        if (hasUnclaimed) return user.missions.weekly;

        if (!user.missions?.weekly?.length || currentWeek !== lastWeek) {
            return await this.generateWeekly(user);
        }

        return user.missions.weekly;
    }


    static getISOWeek(date) {
        const temp = new Date(date);
        temp.setHours(0, 0, 0, 0);
        temp.setDate(temp.getDate() + 4 - (temp.getDay() || 7));
        const yearStart = new Date(temp.getFullYear(), 0, 1);
        return Math.ceil((((temp - yearStart) / 86400000) + 1) / 7);
    }

    // ═══════════════════════════════════════════════════════
    // 📈 PROGRESO (EVENTOS)
    // ═══════════════════════════════════════════════════════

    static async handleProgress(userId, guildId, type, amount = 1) {
        const user = await UserLevel.findOne({ userId, guildId });
        if (!user) return;

        await this.ensureDailyMissions(user);
        await this.ensureWeeklyMissions(user);

        const scopes = ['daily', 'weekly'];

        for (const scope of scopes) {
            const missions = user.missions?.[scope];
            if (!missions) continue;

            for (const mission of missions) {
                if (mission.completed) continue;
                if (mission.type !== type) continue;

                mission.progress += amount;

                if (mission.progress >= mission.goal) {
                    mission.completed = true;
                }
            }
        }

        await user.save();
    }


    // ═══════════════════════════════════════════════════════
    // 🎁 RECLAMAR RECOMPENSA
    // ═══════════════════════════════════════════════════════

    // En MissionManager.js
    static async claim(userId, guildId, missionId, scope = 'daily') {
        const user = await UserLevel.findOne({ userId, guildId });
        if (!user) throw new Error('Usuario no encontrado');

        const missions = user.missions?.[scope];
        if (!missions) throw new Error('No hay misiones');

        const mission = missions.find(m => m.missionId === missionId);
        if (!mission) throw new Error('Misión no encontrada');
        if (!mission.completed) throw new Error('Misión no completada');
        if (mission.claimed) throw new Error('Recompensa ya reclamada');

        const r = mission.reward;

        // Aplicar recompensas
       // if (r?.xp) await user.addXP(r.xp, 'mission');
        if (r?.coins) user.coins += r.coins;
        if (r?.tokens) user.tokens += r.tokens;
        if (r?.lootbox) await user.addLootBoxToInventory(r.lootbox);

        mission.claimed = true;

        // Verificar si todas están reclamadas
        if (missions.every(m => m.claimed)) {
            if (scope === 'daily') await this.generateDaily(user);
            if (scope === 'weekly') await this.generateWeekly(user);
        }

        await user.save();

        return {
            scope,
            reward: r,
            user // ← DEVOLVER EL USUARIO ACTUALIZADO
        };
    }

    // ═══════════════════════════════════════════════════════
    // 📜 OBTENER MISIONES (para /misiones)
    // ═══════════════════════════════════════════════════════

    static async getMissions(userId, guildId) {
        const user = await UserLevel.findOne({ userId, guildId });
        if (!user) return null;

        const now = new Date();

        const daily = user.missions?.daily || [];
        const weekly = user.missions?.weekly || [];

        const hasUnclaimedDaily = daily.some(m => m.completed && !m.claimed);
        const hasUnclaimedWeekly = weekly.some(m => m.completed && !m.claimed);

        if (!daily.length || (!hasUnclaimedDaily && !user.missions.lastGenerated?.daily)) {
            await this.generateDaily(user);
        }

        if (!weekly.length || (!hasUnclaimedWeekly && !user.missions.lastGenerated?.weekly)) {
            await this.generateWeekly(user);
        }

        return {
            daily: user.missions?.daily || [],
            weekly: user.missions?.weekly || []
        };
    }


}

export default MissionManager;
