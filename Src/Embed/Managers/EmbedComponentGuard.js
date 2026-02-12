export default class EmbedComponentGuard {

    check(interaction, component) {

        this.#checkPermissions(interaction, component);
        this.#checkLimits(interaction, component);
    }

    // =========================================
    // PERMISSIONS
    // =========================================

    #checkPermissions(interaction, component) {

        const perms = component.permissions;

        if (!perms || Object.keys(perms).length === 0)
            return;

        const member = interaction.member;

        // 🔹 ADMIN REQUIRED
        if (perms.requireGuildAdmin) {

            if (!member.permissions.has('Administrator'))
                throw new Error(
                    'Solo administradores pueden usar este componente.'
                );
        }

        // 🔹 ALLOWED ROLES
        if (perms.allowedRoles?.length) {

            const hasAllowedRole =
                perms.allowedRoles.some(roleId =>
                    member.roles.cache.has(roleId)
                );

            if (!hasAllowedRole)
                throw new Error(
                    'No tienes permiso para usar este componente.'
                );
        }

        // 🔹 BLOCKED ROLES
        if (perms.blockedRoles?.length) {

            const isBlocked =
                perms.blockedRoles.some(roleId =>
                    member.roles.cache.has(roleId)
                );

            if (isBlocked)
                throw new Error(
                    'No puedes usar este componente.'
                );
        }
    }

    // =========================================
    // LIMIT SYSTEM
    // =========================================

    #checkLimits(interaction, component) {

        const limits = component.limits;

        if (!limits || Object.keys(limits).length === 0)
            return;

        const usage = component.usage || {
            totalUses: 0,
            users: [],
            lastGlobalUse: null
        };

        const userEntry =
            usage.users.find(u =>
                u.userId === interaction.user.id
            );

        const now = Date.now();

        // 🔹 GLOBAL LIMIT
        if (
            limits.maxTotalUses &&
            usage.totalUses >= limits.maxTotalUses
        ) {
            throw new Error(
                'Este componente alcanzó el límite máximo de usos.'
            );
        }

        // 🔹 USER LIMIT
        if (
            limits.maxUsesPerUser &&
            userEntry?.uses >= limits.maxUsesPerUser
        ) {
            throw new Error(
                'Ya alcanzaste el límite de uso para este componente.'
            );
        }

        // 🔹 USER COOLDOWN
        if (
            limits.userCooldown &&
            userEntry?.lastUsed
        ) {

            const cooldownEnd =
                new Date(userEntry.lastUsed).getTime() +
                (limits.userCooldown * 1000);

            if (now < cooldownEnd) {

                const remaining =
                    Math.ceil((cooldownEnd - now) / 1000);

                throw new Error(
                    `Debes esperar ${remaining}s para volver a usarlo.`
                );
            }
        }

        // 🔹 GLOBAL COOLDOWN
        if (
            limits.globalCooldown &&
            usage.lastGlobalUse
        ) {

            const cooldownEnd =
                new Date(usage.lastGlobalUse).getTime() +
                (limits.globalCooldown * 1000);

            if (now < cooldownEnd) {

                throw new Error(
                    'Este componente está en cooldown global.'
                );
            }
        }
    }

}
