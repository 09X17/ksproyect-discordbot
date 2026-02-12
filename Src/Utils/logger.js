import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { createWriteStream } from 'fs';

class Logger {
    constructor() {
        this.__filename = fileURLToPath(import.meta.url);
        this.__dirname = dirname(this.__filename);
        
        this.logStreams = new Map();
        this.initialize();
    }

    config = {
        level: 'info',
        logToFile: true,
        logToConsole: true,
        maxFileSize: 10 * 1024 * 1024, 
        maxFiles: 10,
        timestampFormat: 'ISO',
        colorsEnabled: true,
        emojisEnabled: true,
        logDirectory: join(dirname(fileURLToPath(import.meta.url)), '../../logs'),
        dateFormat: 'YYYY-MM-DD',
        jsonFormat: false,
        includeContext: true,
        bufferSize: 100,
        flushInterval: 5000
    };

    levels = {
        fatal: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
        trace: 5
    };

    emojis = {
        fatal: '💀',
        error: '❌',
        warn: '⚠️',
        info: 'ℹ️',
        debug: '🐛',
        trace: '🔍',
        success: '✅',
        event: '🎯',
        command: '⌨️',
        database: '🗄️',
        http: '🌐',
        security: '🔒',
        performance: '⚡',
        startup: '🚀',
        shutdown: '🔌'
    };

    colors = {
        reset: '\x1b[0m',
        bright: '\x1b[1m',
        dim: '\x1b[2m',
        italic: '\x1b[3m',
        underline: '\x1b[4m',
        blink: '\x1b[5m',
        reverse: '\x1b[7m',
        hidden: '\x1b[8m',
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        bgBlack: '\x1b[40m',
        bgRed: '\x1b[41m',
        bgGreen: '\x1b[42m',
        bgYellow: '\x1b[43m',
        bgBlue: '\x1b[44m',
        bgMagenta: '\x1b[45m',
        bgCyan: '\x1b[46m',
        bgWhite: '\x1b[47m'
    };

    buffer = [];
    flushTimer = null;

    async initialize() {
        this.loadConfigFromEnv();
        await this.setupLogsDirectory();
        this.setupAutoFlush();
        
        process.on('beforeExit', () => this.flushBuffer());
        process.on('SIGINT', () => this.cleanup());
        process.on('SIGTERM', () => this.cleanup());
    }

    loadConfigFromEnv() {
        const envConfig = {
            level: process.env.LOG_LEVEL?.toLowerCase() || this.config.level,
            logToFile: process.env.LOG_TO_FILE !== 'false',
            logToConsole: process.env.LOG_TO_CONSOLE !== 'false',
            maxFileSize: parseInt(process.env.MAX_LOG_SIZE) || this.config.maxFileSize,
            maxFiles: parseInt(process.env.MAX_LOG_FILES) || this.config.maxFiles,
            timestampFormat: process.env.LOG_TIMESTAMP_FORMAT || this.config.timestampFormat,
            colorsEnabled: process.env.LOG_COLORS !== 'false',
            emojisEnabled: process.env.LOG_EMOJIS !== 'false',
            logDirectory: process.env.LOG_DIRECTORY || this.config.logDirectory,
            jsonFormat: process.env.LOG_JSON === 'true',
            includeContext: process.env.LOG_CONTEXT !== 'false',
            bufferSize: parseInt(process.env.LOG_BUFFER_SIZE) || this.config.bufferSize,
            flushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL) || this.config.flushInterval
        };

        this.config = { ...this.config, ...envConfig };
    }

    async setupLogsDirectory() {
        try {
            await fs.mkdir(this.config.logDirectory, { recursive: true });
            const subdirs = ['archived', 'errors', 'audit'];
            for (const dir of subdirs) {
                await fs.mkdir(join(this.config.logDirectory, dir), { recursive: true });
            }
        } catch (error) {
            console.error('❌ Error creando directorio de logs:', error);
        }
    }

    getTimestamp() {
        const now = new Date();
        
        switch (this.config.timestampFormat) {
            case 'ISO':
                return now.toISOString();
            case 'local':
                return now.toLocaleString('es-ES', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
            case 'timeonly':
                return now.toLocaleTimeString('es-ES', { hour12: false });
            case 'unix':
                return Math.floor(now.getTime() / 1000).toString();
            default:
                return now.toISOString();
        }
    }

    formatDate() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    getLogFile(type = 'app') {
        const date = this.formatDate();
        return join(this.config.logDirectory, `${type}-${date}.log`);
    }

    formatMessage(level, message, metadata = null, context = null) {
        const timestamp = this.getTimestamp();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message: typeof message === 'string' ? message : JSON.stringify(message),
            pid: process.pid,
            hostname: process.env.HOSTNAME || 'unknown'
        };

        if (metadata) {
            if (metadata instanceof Error) {
                logEntry.error = {
                    message: metadata.message,
                    stack: metadata.stack,
                    name: metadata.name,
                    code: metadata.code
                };
            } else if (typeof metadata === 'object') {
                logEntry.metadata = metadata;
            }
        }

        if (this.config.includeContext && context) {
            logEntry.context = context;
        }

        if (level === 'debug' || level === 'trace') {
            const memUsage = process.memoryUsage();
            logEntry.memory = {
                rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
            };
        }

        if (this.config.jsonFormat) {
            return JSON.stringify(logEntry);
        }

        let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (metadata instanceof Error) {
            formatted += ` - ${metadata.message}`;
            if (metadata.stack && (level === 'error' || level === 'fatal')) {
                formatted += `\n${metadata.stack.split('\n').slice(0, 5).join('\n')}`;
            }
        } else if (metadata && typeof metadata === 'object') {
            formatted += ` - ${JSON.stringify(metadata, this.getCircularReplacer())}`;
        }

        if (context) {
            formatted += ` [${JSON.stringify(context)}]`;
        }

        return formatted;
    }

    getCircularReplacer() {
        const seen = new WeakSet();
        const replacer = (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return "[Circular]";
                }
                seen.add(value);
            }
            
            if (typeof value === 'bigint') {
                return value.toString();
            }
            
            if (value instanceof Buffer) {
                return `Buffer<${value.toString('hex').substring(0, 32)}...>`;
            }
            
            if (typeof value === 'function') {
                return `[Function: ${value.name || 'anonymous'}]`;
            }
            
            if (typeof value === 'symbol') {
                return value.toString();
            }
            
            if (value === undefined) {
                return '[undefined]';
            }
            
            return value;
        };
        return replacer;
    }

    getLevelColor(level) {
        const colorMap = {
            fatal: { color: this.colors.bgRed + this.colors.white, emoji: this.emojis.fatal },
            error: { color: this.colors.red, emoji: this.emojis.error },
            warn: { color: this.colors.yellow, emoji: this.emojis.warn },
            info: { color: this.colors.cyan, emoji: this.emojis.info },
            debug: { color: this.colors.magenta, emoji: this.emojis.debug },
            trace: { color: this.colors.dim, emoji: this.emojis.trace },
            success: { color: this.colors.green, emoji: this.emojis.success }
        };

        return colorMap[level] || { color: this.colors.white, emoji: '📄' };
    }

    consoleLog(level, message, metadata = null, context = null) {
        if (!this.config.logToConsole) return;

        const { color, emoji } = this.getLevelColor(level);
        const timestamp = this.getTimestamp();
        const levelStr = level.toUpperCase().padEnd(6);
        const contextStr = context ? ` ${this.colors.dim}[${JSON.stringify(context)}]${this.colors.reset}` : '';

        let formattedMessage = message;
        
        if (metadata instanceof Error) {
            formattedMessage += ` ${this.colors.red}${metadata.message}${this.colors.reset}`;
        } else if (metadata) {
            formattedMessage += ` ${this.colors.dim}${JSON.stringify(metadata, this.getCircularReplacer())}${this.colors.reset}`;
        }

        if (this.config.colorsEnabled) {
            const displayEmoji = this.config.emojisEnabled ? emoji + ' ' : '';
            console.log(`${color}${displayEmoji}[${timestamp}] ${levelStr}:${this.colors.reset} ${formattedMessage}${contextStr}`);
        } else {
            console.log(`[${timestamp}] ${levelStr}: ${formattedMessage}`);
        }
    }

    async writeToFile(level, message, metadata = null, context = null, type = 'app') {
        if (!this.config.logToFile) return;

        const logFile = this.getLogFile(type);
        const formattedMessage = this.formatMessage(level, message, metadata, context) + '\n';

        this.buffer.push({ file: logFile, message: formattedMessage });

        if (this.buffer.length >= this.config.bufferSize) {
            await this.flushBuffer();
        }
    }

    setupAutoFlush() {
        this.flushTimer = setInterval(() => {
            if (this.buffer.length > 0) {
                this.flushBuffer().catch(err => {
                    console.error('❌ Error en auto-flush:', err);
                });
            }
        }, this.config.flushInterval);
    }

    async flushBuffer() {
        if (this.buffer.length === 0) return;

        const buffersByFile = {};
        for (const entry of this.buffer) {
            if (!buffersByFile[entry.file]) {
                buffersByFile[entry.file] = [];
            }
            buffersByFile[entry.file].push(entry.message);
        }

        try {
            for (const [file, messages] of Object.entries(buffersByFile)) {
                await this.rotateLogs(file);
                await fs.appendFile(file, messages.join(''));
            }
            
            this.buffer = [];
        } catch (error) {
            console.error('❌ Error flushing log buffer:', error);
        }
    }

    async rotateLogs(filePath) {
        try {
            if (!fsSync.existsSync(filePath)) return;

            const stats = await fs.stat(filePath);
            if (stats.size >= this.config.maxFileSize) {
                const archiveDir = join(this.config.logDirectory, 'archived');
                await fs.mkdir(archiveDir, { recursive: true });
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const archivedFile = join(archiveDir, `${this.formatDate()}-${timestamp}.log`);
                
                await fs.rename(filePath, archivedFile);
                
                await this.cleanOldArchives(archiveDir);
            }
        } catch (error) {
            console.error('❌ Error rotando logs:', error);
        }
    }

    async cleanOldArchives(archiveDir) {
        try {
            const files = await fs.readdir(archiveDir);
            const logFiles = files.filter(f => f.endsWith('.log'));
            
            if (logFiles.length > this.config.maxFiles) {
                const sortedFiles = logFiles.sort();
                const filesToDelete = sortedFiles.slice(0, logFiles.length - this.config.maxFiles);
                
                for (const file of filesToDelete) {
                    await fs.unlink(join(archiveDir, file));
                }
            }
        } catch (error) {
            console.error('❌ Error limpiando archivos antiguos:', error);
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.config.level];
    }

    // === MÉTODOS PRINCIPALES DE LOGGING ===
    
    fatal(message, metadata = null, context = null) {
        if (!this.shouldLog('fatal')) return;
        this.consoleLog('fatal', message, metadata, context);
        this.writeToFile('fatal', message, metadata, context, 'error');
        this.flushBuffer();
    }

    error(message, metadata = null, context = null) {
        if (!this.shouldLog('error')) return;
        this.consoleLog('error', message, metadata, context);
        this.writeToFile('error', message, metadata, context, 'error');
    }

    warn(message, metadata = null, context = null) {
        if (!this.shouldLog('warn')) return;
        this.consoleLog('warn', message, metadata, context);
        this.writeToFile('warn', message, metadata, context);
    }

    info(message, metadata = null, context = null) {
        if (!this.shouldLog('info')) return;
        this.consoleLog('info', message, metadata, context);
        this.writeToFile('info', message, metadata, context);
    }

    debug(message, metadata = null, context = null) {
        if (!this.shouldLog('debug')) return;
        this.consoleLog('debug', message, metadata, context);
        this.writeToFile('debug', message, metadata, context);
    }

    trace(message, metadata = null, context = null) {
        if (!this.shouldLog('trace')) return;
        this.consoleLog('trace', message, metadata, context);
        this.writeToFile('trace', message, metadata, context);
    }

    // === MÉTODOS ESPECIALIZADOS ===
    
    success(message, metadata = null) {
        this.consoleLog('success', message, metadata);
        this.writeToFile('info', `SUCCESS: ${message}`, metadata);
    }

    event(eventName, data = null, context = null) {
        const message = `EVENT: ${eventName}`;
        this.consoleLog('event', message, data, context);
        this.writeToFile('info', message, data, context, 'events');
    }

    command(cmd, user = null, guild = null, executionTime = null) {
        const metadata = {
            user: user?.id || user,
            guild: guild?.id || guild,
            executionTime: executionTime ? `${executionTime}ms` : null
        };
        
        const message = `COMMAND: ${cmd}`;
        this.consoleLog('command', message, metadata);
        this.writeToFile('info', message, metadata, null, 'commands');
    }

    database(operation, query = null, executionTime = null, success = true) {
        const metadata = {
            operation,
            query: query ? (typeof query === 'string' ? query.substring(0, 100) + '...' : query) : null,
            executionTime: executionTime ? `${executionTime}ms` : null,
            success
        };
        
        const message = `DATABASE: ${operation}`;
        const level = success ? 'info' : 'error';
        this.consoleLog('database', message, metadata);
        this.writeToFile(level, message, metadata, null, 'database');
    }

    http(method, url, statusCode, responseTime = null, ip = null) {
        const metadata = {
            method,
            url,
            statusCode,
            responseTime: responseTime ? `${responseTime}ms` : null,
            ip
        };
        
        const message = `HTTP: ${method} ${url}`;
        const level = statusCode >= 400 ? (statusCode >= 500 ? 'error' : 'warn') : 'info';
        this.consoleLog('http', message, metadata);
        this.writeToFile(level, message, metadata, null, 'http');
    }

    security(event, user = null, details = null, severity = 'medium') {
        const metadata = {
            user: user?.id || user,
            details,
            severity,
            timestamp: new Date().toISOString()
        };
        
        const message = `SECURITY: ${event}`;
        const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
        this.consoleLog('security', message, metadata);
        this.writeToFile(level, message, metadata, null, 'security');
    }

    performance(operation, duration, threshold = null) {
        const metadata = {
            operation,
            duration: `${duration}ms`,
            threshold: threshold ? `${threshold}ms` : null,
            isSlow: threshold ? duration > threshold : false
        };
        
        const message = `PERFORMANCE: ${operation}`;
        const level = metadata.isSlow ? 'warn' : 'info';
        this.consoleLog('performance', message, metadata);
        this.writeToFile(level, message, metadata, null, 'performance');
    }

    startup(component, status = 'started', details = null) {
        const message = `STARTUP: ${component} ${status}`;
        this.consoleLog('startup', message, details);
        this.writeToFile('info', message, details, null, 'startup');
    }

    shutdown(component, reason = null) {
        const message = `SHUTDOWN: ${component}`;
        this.consoleLog('shutdown', message, reason);
        this.writeToFile('info', message, reason, null, 'shutdown');
    }

    // === MÉTODOS DE UTILIDAD ===
    
    getLogLevel() {
        return this.config.level;
    }

    setLogLevel(level) {
        if (this.levels[level] !== undefined) {
            this.config.level = level;
            this.info(`Nivel de log cambiado a: ${level}`);
        } else {
            this.warn(`Nivel de log inválido: ${level}`);
        }
    }

    async getLogStats() {
        try {
            const files = await fs.readdir(this.config.logDirectory);
            const stats = {
                totalFiles: files.length,
                totalSize: 0,
                byType: {}
            };

            for (const file of files) {
                const filePath = join(this.config.logDirectory, file);
                const fileStats = await fs.stat(filePath);
                stats.totalSize += fileStats.size;
                
                const type = file.split('-')[0] || 'unknown';
                stats.byType[type] = (stats.byType[type] || 0) + fileStats.size;
            }

            stats.totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
            
            for (const type in stats.byType) {
                stats.byType[type] = (stats.byType[type] / 1024 / 1024).toFixed(2) + ' MB';
            }

            return stats;
        } catch (error) {
            return { error: error.message };
        }
    }

    async readLogs(options = {}) {
        const {
            lines = 50,
            file = 'app',
            type = 'app',
            level = null,
            search = null,
            fromDate = null,
            toDate = null
        } = options;

        try {
            let logFile;
            if (fromDate || toDate) {
                return 'Búsqueda por fecha aún no implementada';
            } else {
                logFile = this.getLogFile(type);
            }

            if (!fsSync.existsSync(logFile)) {
                return 'No hay logs disponibles';
            }

            const content = await fs.readFile(logFile, 'utf8');
            let linesArray = content.split('\n').filter(line => line.trim());

            if (level) {
                linesArray = linesArray.filter(line => 
                    line.includes(`[${level.toUpperCase()}]`)
                );
            }

            if (search) {
                linesArray = linesArray.filter(line => 
                    line.toLowerCase().includes(search.toLowerCase())
                );
            }

            return linesArray.slice(-lines).join('\n');
        } catch (error) {
            return `Error leyendo logs: ${error.message}`;
        }
    }

    async clearLogs(type = 'app', daysToKeep = 7) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            const files = await fs.readdir(this.config.logDirectory);
            const logFiles = files.filter(f => f.endsWith('.log') && f.startsWith(`${type}-`));

            for (const file of logFiles) {
                const fileDate = file.match(/\d{4}-\d{2}-\d{2}/)?.[0];
                if (fileDate && fileDate < cutoffStr) {
                    await fs.unlink(join(this.config.logDirectory, file));
                    this.info(`Log eliminado: ${file}`);
                }
            }
        } catch (error) {
            this.error('Error limpiando logs:', error);
        }
    }

    child(context = {}) {
        const childLogger = {
            context: { ...context },
            
            fatal: (msg, metadata) => this.fatal(msg, metadata, childLogger.context),
            error: (msg, metadata) => this.error(msg, metadata, childLogger.context),
            warn: (msg, metadata) => this.warn(msg, metadata, childLogger.context),
            info: (msg, metadata) => this.info(msg, metadata, childLogger.context),
            debug: (msg, metadata) => this.debug(msg, metadata, childLogger.context),
            trace: (msg, metadata) => this.trace(msg, metadata, childLogger.context),
            success: (msg) => this.success(msg, null, childLogger.context),
            
            event: (name, data) => this.event(name, data, childLogger.context),
            command: (cmd, user, guild, time) => this.command(cmd, user, guild, time),
            database: (op, query, time, success) => this.database(op, query, time, success),
            http: (method, url, status, time, ip) => this.http(method, url, status, time, ip),
            security: (event, user, details, severity) => this.security(event, user, details, severity),
            performance: (op, duration, threshold) => this.performance(op, duration, threshold),
            
            getLogLevel: () => this.getLogLevel(),
            setLogLevel: (level) => this.setLogLevel(level),
            addContext: (newContext) => {
                childLogger.context = { ...childLogger.context, ...newContext };
            },
            removeContext: (key) => {
                delete childLogger.context[key];
            }
        };

        return childLogger;
    }

    async cleanup() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        
        await this.flushBuffer();
        
        for (const stream of this.logStreams.values()) {
            if (typeof stream.end === 'function') {
                stream.end();
            }
        }
        
        this.logStreams.clear();
    }

    createMiddleware() {
        return (req, res, next) => {
            const startTime = Date.now();
            const childLogger = this.child({
                requestId: Math.random().toString(36).substring(2, 15),
                method: req.method,
                url: req.url,
                ip: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            });

            req.logger = childLogger;
            
            childLogger.http(req.method, req.url, null, null, req.ip);

            const originalSend = res.send;
            res.send = function(body) {
                const responseTime = Date.now() - startTime;
                childLogger.http(req.method, req.url, res.statusCode, responseTime, req.ip);
                return originalSend.call(this, body);
            };

            next();
        };
    }
}

let loggerInstance = null;

const getLogger = () => {
    if (!loggerInstance) {
        loggerInstance = new Logger();
    }
    return loggerInstance;
};

export { Logger };
export default getLogger();

if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        const logger = getLogger();
        
        console.log('🔧 Probando sistema de logging mejorado...\n');
        
        console.log('📊 Configuración:', logger.config);
        console.log('🎯 Nivel actual:', logger.getLogLevel());
        
        logger.info('Iniciando pruebas...');
        logger.warn('Advertencia de prueba');
        logger.error('Error de prueba', new Error('Este es un error simulado'));
        logger.debug('Mensaje de debug con metadata', { test: true, count: 42 });
        logger.trace('Mensaje de trace');
        logger.success('¡Operación completada con éxito!');
        logger.fatal('Error fatal', new Error('Simulación de error fatal'));
        
        logger.startup('Database', 'connected', { connection: 'mongodb://localhost' });
        logger.database('SELECT', 'SELECT * FROM users', 45, true);
        logger.event('user_login', { userId: '123', timestamp: new Date() });
        logger.command('ping', { id: 'user123', username: 'test' }, { id: 'guild456' }, 150);
        logger.http('GET', '/api/users', 200, 125, '192.168.1.1');
        logger.security('login_attempt', 'user123', { reason: 'too_many_attempts' }, 'medium');
        logger.performance('heavy_operation', 2500, 1000);
        logger.shutdown('Database', 'maintenance');
        
        const child = logger.child({ module: 'API', version: '1.0.0' });
        child.info('Mensaje desde child logger');
        child.addContext({ endpoint: '/test' });
        child.info('Mensaje con contexto adicional');
        
        const stats = await logger.getLogStats();
        console.log('\n📈 Estadísticas de logs:', stats);
        
        await logger.cleanup();
        console.log('\n✅ Pruebas completadas');
    })();
}