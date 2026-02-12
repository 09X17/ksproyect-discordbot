// Models/Clan.js
import mongoose from 'mongoose';

const clanSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    tag: {
        type: String,
        required: true,
        uppercase: true,
        maxlength: 4,
        minlength: 2
    },
    description: {
        type: String,
        default: ''
    },
    level: {
        type: Number,
        default: 1,
        min: 1,
        max: 100
    },
    xp: {
        type: Number,
        default: 0,
        min: 0
    },
    icon: {
        type: String,
        default: '🛡️'
    },
    banner: {
        type: String,
        default: null
    },
    color: {
        type: String,
        default: '#5865F2'
    },
    members: [{
        userId: {
            type: String,
            required: true
        },
        username: String,
        avatar: String,
        role: {
            type: String,
            enum: ['leader', 'co-leader', 'captain', 'elite', 'member', 'recruit'],
            default: 'recruit'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        contributedXP: {
            type: Number,
            default: 0
        },
        contributedCoins: {
            type: Number,
            default: 0
        },
        lastActive: Date,
        permissions: {
            inviteMembers: { type: Boolean, default: false },
            kickMembers: { type: Boolean, default: false },
            manageRoles: { type: Boolean, default: false },
            manageTreasury: { type: Boolean, default: false },
            declareWar: { type: Boolean, default: false },
            manageQuests: { type: Boolean, default: false }
        }
    }],
    settings: {
        privacy: {
            type: String,
            enum: ['open', 'invite_only', 'closed'],
            default: 'invite_only'
        },
        requirements: {
            minLevel: { type: Number, default: 1 },
            minTotalXP: { type: Number, default: 0 },
            applicationRequired: { type: Boolean, default: false }
        },
        maxMembers: {
            type: Number,
            default: 50,
            min: 5,
            max: 200
        }
    },
    treasury: {
        coins: {
            type: Number,
            default: 0,
            min: 0
        },
        items: [{
            itemId: mongoose.Schema.Types.ObjectId,
            quantity: Number,
            donatedBy: String,
            donatedAt: Date
        }]
    },
    upgrades: [{
        name: String,
        level: Number,
        description: String,
        effects: mongoose.Schema.Types.Mixed,
        cost: {
            coins: Number,
            xp: Number
        }
    }],
    perks: {
        xpMultiplier: {
            type: Number,
            default: 1.0,
            min: 1.0,
            max: 2.0
        },
        coinBonus: {
            type: Number,
            default: 0,
            min: 0
        },
        dailyRewardBonus: {
            type: Number,
            default: 0
        },
        shopDiscount: {
            type: Number,
            default: 0,
            min: 0,
            max: 50
        },
        specialAbilities: [String]
    },
    quests: {
        active: [{
            questId: mongoose.Schema.Types.ObjectId,
            progress: Map,
            startedAt: Date,
            expiresAt: Date
        }],
        completed: [{
            questId: mongoose.Schema.Types.ObjectId,
            completedAt: Date,
            rewards: mongoose.Schema.Types.Mixed
        }]
    },
    wars: [{
        opponentClanId: mongoose.Schema.Types.ObjectId,
        type: { type: String, enum: ['friendly', 'ranked', 'tournament'] },
        status: { type: String, enum: ['pending', 'active', 'finished'] },
        startTime: Date,
        endTime: Date,
        scores: {
            clan: Number,
            opponent: Number
        },
        participants: [String],
        result: { type: String, enum: ['win', 'loss', 'draw', 'ongoing'] },
        rewards: mongoose.Schema.Types.Mixed
    }],
    alliances: [{
        clanId: mongoose.Schema.Types.ObjectId,
        establishedAt: Date,
        trustLevel: Number // 1-100
    }],
    achievements: [{
        name: String,
        description: String,
        unlockedAt: Date,
        icon: String
    }],
    stats: {
        totalXPGenerated: { type: Number, default: 0 },
        totalCoinsGenerated: { type: Number, default: 0 },
        warsWon: { type: Number, default: 0 },
        warsLost: { type: Number, default: 0 },
        questsCompleted: { type: Number, default: 0 },
        memberCount: { type: Number, default: 1 },
        averageMemberLevel: { type: Number, default: 1 },
        activityScore: { type: Number, default: 0 }
    },
    leaderboard: {
        weeklyRank: Number,
        monthlyRank: Number,
        allTimeRank: Number
    },
    announcements: [{
        title: String,
        content: String,
        author: String,
        createdAt: Date,
        pinned: Boolean
    }],
    applications: [{
        userId: String,
        username: String,
        level: Number,
        message: String,
        appliedAt: Date,
        status: { type: String, enum: ['pending', 'accepted', 'rejected'] }
    }],
    metadata: {
        createdAt: {
            type: Date,
            default: Date.now
        },
        createdBy: String,
        discordRoleId: String,
        discordCategoryId: String,
        discordChannelId: String
    }
}, {
    timestamps: true
});

// Índices
clanSchema.index({ guildId: 1, name: 1 }, { unique: true });
clanSchema.index({ guildId: 1, tag: 1 }, { unique: true });
clanSchema.index({ guildId: 1, level: -1 });
clanSchema.index({ guildId: 1, xp: -1 });
clanSchema.index({ guildId: 1, 'stats.activityScore': -1 });

// Métodos
clanSchema.methods.addMember = function(userId, userData, role = 'recruit') {
    if (this.members.length >= this.settings.maxMembers) {
        throw new Error('Clan lleno');
    }
    
    if (this.members.some(m => m.userId === userId)) {
        throw new Error('Usuario ya en el clan');
    }
    
    this.members.push({
        userId,
        username: userData.username,
        avatar: userData.avatar,
        role,
        joinedAt: new Date(),
        contributedXP: 0,
        contributedCoins: 0,
        lastActive: new Date()
    });
    
    this.stats.memberCount = this.members.length;
    
    return this.members[this.members.length - 1];
};

clanSchema.methods.removeMember = function(userId) {
    const memberIndex = this.members.findIndex(m => m.userId === userId);
    
    if (memberIndex === -1) {
        throw new Error('Usuario no encontrado en el clan');
    }
    
    // Si es el líder, designar nuevo líder
    if (this.members[memberIndex].role === 'leader' && this.members.length > 1) {
        // Buscar co-líder o miembro más antiguo
        const newLeader = this.members.find(m => 
            m.userId !== userId && m.role === 'co-leader'
        ) || this.members.filter(m => m.userId !== userId)
                        .sort((a, b) => a.joinedAt - b.joinedAt)[0];
        
        if (newLeader) {
            newLeader.role = 'leader';
        }
    }
    
    this.members.splice(memberIndex, 1);
    this.stats.memberCount = this.members.length;
};

clanSchema.methods.addXP = function(amount, contributorId = null) {
    const oldLevel = this.level;
    
    this.xp += amount;
    this.stats.totalXPGenerated += amount;
    
    if (contributorId) {
        const member = this.members.find(m => m.userId === contributorId);
        if (member) {
            member.contributedXP += amount;
        }
    }
    
    // Calcular nuevo nivel
    const xpForNextLevel = this.getXPForLevel(this.level + 1);
    if (this.xp >= xpForNextLevel) {
        this.level++;
        
        // Desbloquear beneficios del nivel
        this.unlockLevelPerks();
        
        return { leveledUp: true, oldLevel, newLevel: this.level };
    }
    
    return { leveledUp: false };
};

clanSchema.methods.getXPForLevel = function(targetLevel) {
    // Fórmula: 1000 * nivel^1.8
    let totalXP = 0;
    
    for (let lvl = 1; lvl < targetLevel; lvl++) {
        totalXP += Math.floor(1000 * Math.pow(lvl, 1.8));
    }
    
    return totalXP;
};

clanSchema.methods.unlockLevelPerks = function() {
    const levelPerks = {
        5: { maxMembers: 75, xpMultiplier: 1.1 },
        10: { maxMembers: 100, coinBonus: 100 },
        20: { maxMembers: 150, xpMultiplier: 1.2, shopDiscount: 10 },
        30: { maxMembers: 200, specialAbilities: ['clan_quests'] },
        50: { xpMultiplier: 1.5, coinBonus: 500, specialAbilities: ['clan_wars'] }
    };
    
    if (levelPerks[this.level]) {
        const perks = levelPerks[this.level];
        
        if (perks.maxMembers) {
            this.settings.maxMembers = perks.maxMembers;
        }
        
        if (perks.xpMultiplier) {
            this.perks.xpMultiplier = perks.xpMultiplier;
        }
        
        if (perks.coinBonus) {
            this.perks.coinBonus = perks.coinBonus;
        }
        
        if (perks.shopDiscount) {
            this.perks.shopDiscount = perks.shopDiscount;
        }
        
        if (perks.specialAbilities) {
            this.perks.specialAbilities.push(...perks.specialAbilities);
        }
        
        this.achievements.push({
            name: `Nivel ${this.level} alcanzado`,
            description: `¡El clan ha alcanzado el nivel ${this.level}!`,
            unlockedAt: new Date(),
            icon: '🎖️'
        });
    }
};

clanSchema.methods.startWar = async function(opponentClanId, type = 'friendly') {
    if (this.wars.some(w => w.status === 'active')) {
        throw new Error('El clan ya está en guerra');
    }
    
    const war = {
        opponentClanId,
        type,
        status: 'pending',
        startTime: null,
        endTime: null,
        scores: {
            clan: 0,
            opponent: 0
        },
        participants: [],
        result: 'ongoing'
    };
    
    this.wars.push(war);
    
    return war;
};

clanSchema.methods.contributeToTreasury = function(userId, coins = 0, items = []) {
    const member = this.members.find(m => m.userId === userId);
    
    if (!member) {
        throw new Error('No eres miembro de este clan');
    }
    
    if (coins > 0) {
        this.treasury.coins += coins;
        member.contributedCoins += coins;
        this.stats.totalCoinsGenerated += coins;
    }
    
    if (items.length > 0) {
        items.forEach(item => {
            const existingItem = this.treasury.items.find(i => 
                i.itemId.toString() === item.itemId.toString()
            );
            
            if (existingItem) {
                existingItem.quantity += item.quantity;
            } else {
                this.treasury.items.push({
                    itemId: item.itemId,
                    quantity: item.quantity,
                    donatedBy: userId,
                    donatedAt: new Date()
                });
            }
        });
    }
    
    return { coins: this.treasury.coins, items: this.treasury.items };
};

clanSchema.methods.getLeaderboardRank = function() {
    const leaderIndex = this.members.findIndex(m => m.role === 'leader');
    const leaders = this.members
        .filter(m => ['leader', 'co-leader', 'captain'].includes(m.role))
        .map(m => ({
            userId: m.userId,
            username: m.username,
            role: m.role,
            contributedXP: m.contributedXP,
            contributedCoins: m.contributedCoins
        }))
        .sort((a, b) => b.contributedXP - a.contributedXP);
    
    return leaders;
};

export default mongoose.model('Clan', clanSchema);