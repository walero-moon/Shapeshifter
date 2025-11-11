import { Message, TextChannel } from 'discord.js';
import { matchAlias } from '../../../features/proxy/app/MatchAlias';
import { validateUserChannelPerms } from '../../../features/proxy/app/ValidateUserChannelPerms';
import { proxyCoordinator } from '../../../features/proxy/app/ProxyCoordinator';
import { formRepo } from '../../../features/identity/infra/FormRepo';
import { DiscordChannelProxy } from '../DiscordChannelProxy';
import { log } from '../../../shared/utils/logger';

/**
 * Message create listener for tag-based proxying
 * Listens for guild text messages that match user aliases and proxies them as forms
 */
export async function messageCreateProxy(message: Message) {
    // Skip bot messages
    if (message.author.bot) {
        return;
    }

    // Skip messages without content
    if (!message.content) {
        return;
    }

    // Ignore DMs - only process guild messages
    if (!message.guildId) {
        return;
    }

    try {
        // Check if message matches any alias for the user
        const match = await matchAlias(message.author.id, message.content);

        if (!match) {
            return;
        }

        // Get the form associated with the matched alias
        const form = await formRepo.getById(match.alias.formId);

        if (!form) {
            log.warn('Form not found for alias', {
                component: 'proxy',
                userId: message.author.id,
                aliasId: match.alias.id,
                formId: match.alias.formId,
                status: 'form_not_found'
            });
            return;
        }

        // Validate user permissions in the channel
        const hasPerms = await validateUserChannelPerms(
            message.author.id,
            message.channel as TextChannel,
            message.attachments.map(attachment => attachment)
        );

        if (!hasPerms) {
            log.info('User lacks permissions to proxy in this channel', {
                component: 'proxy',
                userId: message.author.id,
                guildId: message.guildId,
                channelId: message.channelId,
                status: 'perms_denied'
            });
            return;
        }

        // Create channel proxy instance
        const channelProxy = new DiscordChannelProxy(message.channelId);

        // Proxy the message via coordinator
        await proxyCoordinator(
            message.author.id,
            form.id,
            message.channelId,
            message.guildId,
            match.renderedText,
            channelProxy,
            message.attachments.map(attachment => attachment)
        );

        log.info('Message proxied successfully via tag', {
            component: 'proxy',
            userId: message.author.id,
            formId: form.id,
            aliasId: match.alias.id,
            guildId: message.guildId,
            channelId: message.channelId,
            status: 'proxy_success'
        });

    } catch (error) {
        log.error('Failed to proxy message via tag', {
            component: 'proxy',
            userId: message.author.id,
            guildId: message.guildId,
            channelId: message.channelId,
            status: 'proxy_error',
            error
        });

        // Log error but don't throw - proxy failures should not crash the bot
    }
}