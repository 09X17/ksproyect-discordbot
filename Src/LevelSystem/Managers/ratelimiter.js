export default class RateLimiter {
    constructor() {
        this.attempts = new Map();
        this.locks = new Map();
        this.defaultLimits = {
            messages: { limit: 10, window: 60000 }, 
            commands: { limit: 5, window: 30000 }, 
            voice_rewards: { limit: 60, window: 3600000 }, 
            shop_purchases: { limit: 20, window: 3600000 } 
        };
    }

    canProceed(userId, action, customLimit = null) {
        const key = `${userId}:${action}`;
        const now = Date.now();
        
        const lock = this.locks.get(key);
        if (lock && lock > now) {
            return { allowed: false, remaining: Math.ceil((lock - now) / 1000) };
        }

        const limits = customLimit || this.defaultLimits[action] || { limit: 5, window: 60000 };
        let userAttempts = this.attempts.get(key) || [];
        userAttempts = userAttempts.filter(time => now - time < limits.window);
        
        if (userAttempts.length >= limits.limit) {
            const lockTime = now + (limits.window / 2);
            this.locks.set(key, lockTime);
            
            return { 
                allowed: false, 
                remaining: Math.ceil((lockTime - now) / 1000),
                reason: `Límite de ${limits.limit} ${action} alcanzado`
            };
        }

        userAttempts.push(now);
        this.attempts.set(key, userAttempts);
        
        return { 
            allowed: true, 
            remaining: limits.limit - userAttempts.length,
            resetIn: Math.ceil((limits.window - (now - userAttempts[0])) / 1000)
        };
    }

    clearAttempts(userId, action = null) {
        if (action) {
            const key = `${userId}:${action}`;
            this.attempts.delete(key);
            this.locks.delete(key);
        } else {
            for (const key of this.attempts.keys()) {
                if (key.startsWith(`${userId}:`)) {
                    this.attempts.delete(key);
                }
            }
            for (const key of this.locks.keys()) {
                if (key.startsWith(`${userId}:`)) {
                    this.locks.delete(key);
                }
            }
        }
    }

    getAttempts(userId, action) {
        const key = `${userId}:${action}`;
        return this.attempts.get(key) || [];
    }

    setLimit(action, limit, window) {
        this.defaultLimits[action] = { limit, window };
    }

    getLimit(action) {
        return this.defaultLimits[action] || { limit: 5, window: 60000 };
    }

    cleanup() {
        const now = Date.now();
        for (const [key, attempts] of this.attempts.entries()) {
            const limits = this.defaultLimits[key.split(':')[1]] || { limit: 5, window: 60000 };
            const freshAttempts = attempts.filter(time => now - time < limits.window);
            
            if (freshAttempts.length === 0) {
                this.attempts.delete(key);
            } else {
                this.attempts.set(key, freshAttempts);
            }
        }

        for (const [key, lockTime] of this.locks.entries()) {
            if (now > lockTime) {
                this.locks.delete(key);
            }
        }
    }

    isLocked(userId, action) {
        const key = `${userId}:${action}`;
        const lock = this.locks.get(key);
        return lock && lock > Date.now();
    }

    getLockTimeRemaining(userId, action) {
        const key = `${userId}:${action}`;
        const lock = this.locks.get(key);
        const now = Date.now();
        
        if (!lock || lock <= now) return 0;
        return Math.ceil((lock - now) / 1000);
    }

    getStats() {
        return {
            totalAttempts: this.attempts.size,
            totalLocks: this.locks.size,
            defaultLimits: this.defaultLimits
        };
    }
}