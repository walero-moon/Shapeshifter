import { MessageMentionOptions } from 'discord.js';

export const DEFAULT_ALLOWED_MENTIONS: MessageMentionOptions = {
    parse: [],
    repliedUser: false,
};

export const REPLY_ALLOWED_MENTIONS: MessageMentionOptions = {
    parse: [],
    repliedUser: true,
};