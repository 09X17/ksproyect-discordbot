export default class RateLimiter {
    constructor() {
        this.limits = new Map();
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Limpiar cada minuto
    }

    canProceed(key, limit = 5, windowMs = 60000) {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!this.limits.has(key)) {
            this.limits.set(key, []);
        }
        
        const attempts = this.limits.get(key);
        
        // Limpiar intentos fuera de la ventana de tiempo
        const validAttempts = attempts.filter(time => time > windowStart);
        this.limits.set(key, validAttempts);
        
        if (validAttempts.length >= limit) {
            return false;
        }
        
        validAttempts.push(now);
        return true;
    }

    getRemaining(key, limit = 5, windowMs = 60000) {
        const now = Date.now();
        const windowStart = now - windowMs;
        
        if (!this.limits.has(key)) {
            return limit;
        }
        
        const attempts = this.limits.get(key);
        const validAttempts = attempts.filter(time => time > windowStart);
        
        return Math.max(0, limit - validAttempts.length);
    }

    clear(key) {
        this.limits.delete(key);
    }

    cleanup() {
        const now = Date.now();
        const oneHourAgo = now - 3600000;
        
        for (const [key, attempts] of this.limits.entries()) {
            const validAttempts = attempts.filter(time => time > oneHourAgo);
            if (validAttempts.length === 0) {
                this.limits.delete(key);
            } else {
                this.limits.set(key, validAttempts);
            }
        }
    }

    destroy() {
        clearInterval(this.cleanupInterval);
        this.limits.clear();
    }
}