export default class EmbedVariableResolver {

    resolve(template, context = {}) {

        const clone = JSON.parse(JSON.stringify(template));

        const variables = this.#buildVariables(context);

        clone.embed.title = this.#replace(clone.embed.title, variables);
        clone.embed.description = this.#replace(clone.embed.description, variables);

        if (clone.embed.footer?.text)
            clone.embed.footer.text =
                this.#replace(clone.embed.footer.text, variables);

        if (clone.embed.author?.name)
            clone.embed.author.name =
                this.#replace(clone.embed.author.name, variables);

        if (Array.isArray(clone.embed.fields)) {
            clone.embed.fields = clone.embed.fields.map(f => ({
                ...f,
                name: this.#replace(f.name, variables),
                value: this.#replace(f.value, variables)
            }));
        }

        return clone;
    }

    // =========================
    // VARIABLE MAP
    // =========================

    #buildVariables(context) {

        const user = context.user;
        const member = context.member;
        const guild = context.guild;

        return {
            '{user}': user?.username || '',
            '{user.tag}': user?.tag || '',
            '{user.id}': user?.id || '',
            '{user.mention}': user ? `<@${user.id}>` : '',

            '{guild}': guild?.name || '',
            '{guild.id}': guild?.id || '',
            '{guild.memberCount}': guild?.memberCount?.toString() || '',

            '{date}': new Date().toLocaleDateString(),
            '{timestamp}': `<t:${Math.floor(Date.now() / 1000)}:F>`
        };
    }

    #replace(text, variables) {
        if (!text) return text;

        let result = text;

        for (const key in variables) {
            result = result.split(key).join(variables[key]);
        }

        return result;
    }
}
