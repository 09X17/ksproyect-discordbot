import JobsConfig from './JobsConfig.js';
import UserLevel from '../Models/UserLevel.js';
const JOB_CHANGE_COOLDOWN = 1000 * 60 * 60; // 1 hora
const WEEKLY_SALARY_COOLDOWN = 1000 * 60 * 60 * 24 * 7; // 7 días
const MONTHLY_SALARY_COOLDOWN = 1000 * 60 * 60 * 24 * 30; // 30 días

export default class JobsManager {
    constructor(client, levelManager) {
        this.client = client;
        this.levelManager = levelManager;
    }

    // ============================================
    // HELPERS INTERNOS
    // ============================================

    _getJobConfig(jobId) {
        return JobsConfig[jobId] || null;
    }

    _getUserJob(user, jobId) {
        return user.jobs?.data?.find(j => j.jobId === jobId) || null;
    }

    _getActiveJob(user) {
        if (!user.jobs?.activeJob) return null;
        return this._getUserJob(user, user.jobs.activeJob);
    }

    _random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _canChangeJob(user) {
        if (!user.jobs?.lastJobChange) return true;

        const diff = Date.now() - user.jobs.lastJobChange.getTime();
        return diff >= JOB_CHANGE_COOLDOWN;
    }

    _getJobChangeRemaining(user) {
        const end = user.jobs.lastJobChange.getTime() + JOB_CHANGE_COOLDOWN;
        return Math.max(0, end - Date.now());
    }

    _ensureJobsStructure(user) {
        if (!user.jobs) {
            user.jobs = { data: [], activeJob: null };
        }
        if (!user.jobs.data) {
            user.jobs.data = [];
        }

        user.jobs.lastSalary ??= null;
        user.jobs.lastMonthlySalary ??= null;
        user.jobs.lastJobChange ??= null;
    }


    _canClaimWeeklySalary(user) {
        if (!user.jobs.lastSalary) return true;
        return Date.now() - user.jobs.lastSalary.getTime() >= WEEKLY_SALARY_COOLDOWN;
    }

    _getMonthlySalaryRemaining(user) {
        if (!user.jobs.lastMonthlySalary) return 0;
        const end = user.jobs.lastMonthlySalary.getTime() + MONTHLY_SALARY_COOLDOWN;
        return Math.max(0, end - Date.now());
    }

    _canClaimMonthlySalary(user) {
        if (!user.jobs.lastMonthlySalary) return true;
        return Date.now() - user.jobs.lastMonthlySalary.getTime() >= MONTHLY_SALARY_COOLDOWN;
    }

    _getWeeklySalaryRemaining(user) {
        if (!user.jobs.lastSalary) return 0;
        const end = user.jobs.lastSalary.getTime() + WEEKLY_SALARY_COOLDOWN;
        return Math.max(0, end - Date.now());
    }

    // ============================================
    // GESTIÓN DE TRABAJOS
    // ============================================

    async joinJob(userId, guildId, jobId) {
        const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);
        const jobConfig = this._getJobConfig(jobId);

        if (!jobConfig) {
            return { success: false, reason: 'Trabajo no existente' };
        }

        this._ensureJobsStructure(user);

        // ⏳ COOLDOWN DE CAMBIO
        if (!this._canChangeJob(user)) {
            return {
                success: false,
                reason: 'cooldown',
                remaining: this._getJobChangeRemaining(user)
            };
        }

        // 🚫 Ya activo
        if (user.jobs.activeJob === jobId) {
            return { success: false, reason: 'Ese ya es tu trabajo activo' };
        }

        // 🚫 Ya lo tiene guardado
        if (this._getUserJob(user, jobId)) {
            return { success: false, reason: 'Ya tienes este trabajo' };
        }

        user.jobs.data.push({
            jobId,
            level: 1,
            xp: 0,
            totalXp: 0,
            rank: jobConfig.ranks?.[0]?.name || 'Novato',
            lastWork: null,
            cooldownUntil: null,
            stats: {
                timesWorked: 0,
                coinsEarned: 0,
                xpEarned: 0,
                fails: 0
            },
            perks: [],
            isIllegal: jobConfig.illegal || false,
            joinedAt: new Date()
        });

        user.jobs.activeJob = jobId;
        user.jobs.lastJobChange = new Date(); // 👈 CLAVE

        user.markModified('jobs');
        await user.save();

        return {
            success: true,
            jobId,
            jobName: jobConfig.name,
            active: true
        };
    }

    async setActiveJob(userId, guildId, jobId) {
        const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);

        this._ensureJobsStructure(user);

        const job = this._getUserJob(user, jobId);
        if (!job) {
            return { success: false, reason: 'No tienes este trabajo' };
        }

        user.jobs.activeJob = jobId;
        user.markModified('jobs');
        await user.save();

        return { success: true, jobId };
    }

    async leaveJob(userId, guildId, jobId) {
        const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);
        this._ensureJobsStructure(user);

        // ⏳ COOLDOWN
        if (!this._canChangeJob(user)) {
            return {
                success: false,
                reason: 'cooldown',
                remaining: this._getJobChangeRemaining(user)
            };
        }

        const index = user.jobs.data.findIndex(j => j.jobId === jobId);
        if (index === -1) {
            return { success: false, reason: 'No tienes este trabajo' };
        }

        user.jobs.data.splice(index, 1);

        if (user.jobs.activeJob === jobId) {
            user.jobs.activeJob = null;
        }

        user.jobs.lastJobChange = new Date(); // 👈 CLAVE

        user.markModified('jobs');
        await user.save();

        return {
            success: true,
            jobId
        };
    }


    // ============================================
    // EJECUTAR TRABAJO
    // ============================================

    async work(userId, guildId) {
        const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);

        this._ensureJobsStructure(user);

        const job = this._getActiveJob(user);

        if (!job) {
            return { success: false, reason: 'No tienes un trabajo activo' };
        }

        const jobConfig = this._getJobConfig(job.jobId);
        if (!jobConfig) {
            return { success: false, reason: 'Configuración de trabajo inválida' };
        }

        const now = new Date();

        // ⏳ Cooldown
        if (job.cooldownUntil && job.cooldownUntil > now) {
            return {
                success: false,
                reason: `<:relojdearena:1457064155067449364> Ya trabajaste recientemente. Tiempo restante: <t:${Math.floor(job.cooldownUntil.getTime() / 1000)}:R>`,
                remainingCooldown: job.cooldownUntil
            };
        }

        // =========================
        // FALLA DEL TRABAJO
        // =========================
        if (jobConfig.failChance && Math.random() < jobConfig.failChance) {
            const penalty = this._random(90, 180);

            await this.levelManager.takeCurrency(
                userId,
                guildId,
                'coins',
                penalty,
                `job_fail_${job.jobId}`
            );

            job.stats.fails = (job.stats.fails || 0) + 1;
            job.lastWork = now;
            job.cooldownUntil = new Date(now.getTime() + (jobConfig.cooldown || 30 * 60 * 1000));

            user.markModified('jobs');
            await user.save();

            return {
                success: false,
                reason: `❌ Fallaste tu trabajo y perdiste ${penalty} monedas.`,
                penalty,
                nextWorkAt: job.cooldownUntil
            };
        }

        // =========================
        // RECOMPENSAS + IMPUESTOS + EVASIÓN
        // =========================
        const rewards = {};
        const summary = [];
        const taxesSummary = {};
        let taxEvasion = null;

        const taxCfg = jobConfig.taxes;
        const evasionCfg = jobConfig.taxEvasion;

        for (const currency of ['coins', 'tokens']) {
            const rewardCfg = jobConfig.rewards?.[currency];
            if (!rewardCfg) continue;

            const grossAmount = this._random(rewardCfg.min, rewardCfg.max);
            if (grossAmount <= 0) continue;

            let taxAmount = 0;
            let savedAmount = 0;

            if (taxCfg?.rate && taxCfg.appliesTo?.includes(currency)) {
                taxAmount = Math.max(1, Math.floor(grossAmount * taxCfg.rate));

                // 🎲 EVASIÓN
                if (
                    evasionCfg &&
                    Math.random() < evasionCfg.chance
                ) {
                    savedAmount = Math.floor(taxAmount * evasionCfg.reduction);
                    taxAmount -= savedAmount;

                    taxEvasion ??= {
                        success: true,
                        percent: evasionCfg.reduction * 100,
                        saved: {}
                    };

                    taxEvasion.saved[currency] = savedAmount;
                }

                if (taxAmount > 0) {
                    taxesSummary[currency] = taxAmount;
                }
            }

            const netAmount = grossAmount - taxAmount;

            const res = await this.levelManager.giveCurrency(
                userId,
                guildId,
                currency,
                netAmount,
                `job_${job.jobId}`
            );

            if (res?.success) {
                rewards[currency] = netAmount;
                summary.push(`${netAmount} ${currency}`);
                job.stats.coinsEarned = (job.stats.coinsEarned || 0) + netAmount;
            }
        }

        // =========================
        // XP
        // =========================
        if (jobConfig.rewards?.xp) {
            const xpAmount = this._random(
                jobConfig.rewards.xp.min,
                jobConfig.rewards.xp.max
            );

            if (xpAmount > 0) {
                await this.levelManager.addXP(
                    userId,
                    guildId,
                    xpAmount,
                    `job_${job.jobId}`
                );

                rewards.xp = xpAmount;
                summary.push(`${xpAmount} XP`);

                job.xp = (job.xp || 0) + xpAmount;
                job.totalXp = (job.totalXp || 0) + xpAmount;
                job.stats.xpEarned = (job.stats.xpEarned || 0) + xpAmount;

                const xpPerLevel = jobConfig.progression?.xpPerLevel || 100;
                const maxLevel = jobConfig.progression?.maxLevel || 20;

                while (job.xp >= xpPerLevel && job.level < maxLevel) {
                    job.xp -= xpPerLevel;
                    job.level += 1;

                    const newRank = jobConfig.ranks
                        ?.slice()
                        .reverse()
                        .find(r => job.level >= r.level);

                    if (newRank) {
                        job.rank = newRank.name;
                    }
                }
            }
        }

        // =========================
        // STATS + COOLDOWN
        // =========================
        job.stats.timesWorked = (job.stats.timesWorked || 0) + 1;
        job.lastWork = now;
        job.cooldownUntil = new Date(now.getTime() + (jobConfig.cooldown || 30 * 60 * 1000));

        user.markModified('jobs');
        await user.save();

        return {
            success: true,
            jobId: job.jobId,
            jobName: jobConfig.name,
            rewards,
            taxes: taxesSummary,
            taxEvasion,
            summary: summary.join(', '),
            nextWorkAt: job.cooldownUntil,
            level: job.level,
            rank: job.rank
        };
    }


    // ============================================
    // CONSULTAS
    // ============================================

    async getUserJobs(userId, guildId) {
        try {
            const user = await UserLevel.findOne({ guildId, userId })
                .select('jobs')
                .lean();

            if (!user || !user.jobs) {
                return {
                    activeJob: null,
                    jobs: []
                };
            }

            return {
                activeJob: user.jobs.activeJob || null,
                jobs: user.jobs.data || []
            };
        } catch (error) {
            console.error('❌ Error en getUserJobs:', error);
            return {
                activeJob: null,
                jobs: []
            };
        }
    }

    async getActiveJobInfo(userId, guildId) {
        const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);

        this._ensureJobsStructure(user);

        const job = this._getActiveJob(user);

        if (!job) {
            return { hasJob: false };
        }

        const config = this._getJobConfig(job.jobId);

        return {
            hasJob: true,
            jobId: job.jobId,
            name: config?.name || job.jobId,
            emoji: config?.emoji || '',
            level: job.level,
            xp: job.xp,
            totalXp: job.totalXp,
            rank: job.rank,
            stats: job.stats,
            cooldownUntil: job.cooldownUntil
        };
    }

    async claimWeeklySalary(userId, guildId) {
        const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);
        this._ensureJobsStructure(user);

        const job = this._getActiveJob(user);
        if (!job) {
            return { success: false, reason: 'No tienes trabajo activo' };
        }

        const config = this._getJobConfig(job.jobId);
        if (!config?.weeklySalary) {
            return { success: false, reason: 'Este trabajo no tiene salario semanal' };
        }

        if (!this._canClaimWeeklySalary(user)) {
            return {
                success: false,
                reason: 'salary_cooldown',
                remaining: this._getWeeklySalaryRemaining(user)
            };
        }

        const paid = {};

        for (const [currency, amount] of Object.entries(config.weeklySalary)) {
            const res = await this.levelManager.giveCurrency(
                userId,
                guildId,
                currency,
                amount,
                `weekly_salary_${job.jobId}`
            );

            if (res?.success) {
                paid[currency] = amount;
            }
        }

        user.jobs.lastSalary = new Date();
        user.markModified('jobs');
        await user.save();

        return {
            success: true,
            jobId: job.jobId,
            jobName: config.name,
            salary: paid
        };
    }

    async claimMonthlySalary(userId, guildId) {
        const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);
        this._ensureJobsStructure(user);

        const job = this._getActiveJob(user);
        if (!job) {
            return { success: false, reason: 'No tienes trabajo activo' };
        }

        const config = this._getJobConfig(job.jobId);
        if (!config?.monthlySalary) {
            return { success: false, reason: 'Este trabajo no tiene salario mensual' };
        }

        if (!this._canClaimMonthlySalary(user)) {
            return {
                success: false,
                reason: 'salary_cooldown',
                remaining: this._getMonthlySalaryRemaining(user)
            };
        }

        const paid = {};

        for (const [currency, amount] of Object.entries(config.monthlySalary)) {
            const res = await this.levelManager.giveCurrency(
                userId,
                guildId,
                currency,
                amount,
                `monthly_salary_${job.jobId}`
            );

            if (res?.success) {
                paid[currency] = amount;
            }
        }

        user.jobs.lastMonthlySalary = new Date();
        user.markModified('jobs');
        await user.save();

        return {
            success: true,
            jobId: job.jobId,
            jobName: config.name,
            salary: paid
        };
    }



}