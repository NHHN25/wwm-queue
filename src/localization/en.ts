import type { Translations } from './types.js';

/**
 * English translations
 */
export const en: Translations = {
  embeds: {
    queueEmpty: 'WAITING FOR PLAYERS',
    beTheFirst: '💡 **Be the first to join!**',
    clickRole: 'Click a role button below to start the party',
    partyRoster: 'PARTY ROSTER',
    openSlot: 'OPEN SLOT',
    queueComplete: 'PARTY COMPLETE! READY TO START!',
    queueProgress: '📊 Party Progress',
    empty: 'Empty',
    full: 'FULL!',
    players: 'Players',
    partyFinder: 'Party Finder',
  },

  footers: {
    queueEmpty: 'Click a role button to join the party',
    queueActive: 'Party is filling up! Join now',
    queueFull: 'Party is ready! Good luck!',
  },

  buttons: {
    leave: '❌ Leave',
  },

  success: {
    queueCreated: (queueType: string, channel: string) =>
      `✅ Successfully created **${queueType}** party in ${channel}!\n\nPlayers can now join using the role buttons.`,
    queueReset: (queueType: string) =>
      `✅ The **${queueType}** party has been cleared.\n\nAll players have been removed from the party.`,
    queueClosed: (queueType: string) =>
      `✅ The **${queueType}** party has been closed and removed.`,
    joinedQueue: (role: string) =>
      `✅ You joined the party as ${role}!\n\n💡 *Click a different role to switch, or click ❌ Leave to exit the party.*`,
    switchedRole: (role: string) => `🔄 You switched to ${role}!`,
    leftQueue: `✅ You left the party.`,
    languageChanged: (language: string) =>
      `✅ Language changed to **${language}**.`,
  },

  errors: {
    genericError:
      '❌ An error occurred. Please try again or contact an administrator.',
    queueNotFound:
      '❌ Party not found. It may have been deleted or does not exist.',
    queueFull: '❌ The party is full! Please wait for the next round.',
    queueAlreadyExists:
      '❌ A party of this type already exists in this server. Use `/reset` to clear it or `/close` to delete it.',
    playerAlreadyInQueue:
      '❌ You are already in this party! Click a different role to switch, or click ❌ Leave to exit.',
    playerInAnotherQueue:
      '❌ You are already in another party in this server. Please leave that party first.',
    playerNotInQueue:
      '❌ You are not in the party. Click a role button to join!',
    invalidChannel: '❌ Invalid channel. Please select a text channel.',
    missingPermissions: (permissions: string[]) =>
      `❌ I'm missing these permissions:\n${permissions.map((p) => `• ${p}`).join('\n')}\n\nPlease grant these permissions and try again.`,
  },

  queueFullMessage: (queueType: string, mentions: string) =>
    `🎉 **${queueType} Queue is Full!**\n\n${mentions}\n\nYour party is ready! Good luck and have fun!`,

  commands: {
    setup: {
      description: 'Create a party for Where Winds Meet activities',
      swordTrial: 'Create a Sword Trial queue (5 players)',
      heroRealm: 'Create a Hero Realm party (10 players)',
      channelOption: 'Channel for the party (default: current channel)',
    },
    reset: {
      description: 'Clear all players from a party',
      queueTypeOption: 'Which queue to reset',
    },
    close: {
      description: 'Delete a queue completely',
      queueTypeOption: 'Which queue to close',
    },
    language: {
      description: 'Change the bot language',
      languageOption: 'Select a language',
    },
    register: {
      description: 'Register your in-game profile',
    },
    baodanh: {
      description: 'Đăng ký hồ sơ người chơi (Vietnamese)',
    },
    info: {
      description: "View a player's profile",
      userOption: 'The player to view (leave empty for yourself)',
    },
    setupRegistration: {
      description: 'Set the registration channel',
      channelOption: 'Channel where players can register',
    },
  },

  queueTypes: {
    swordTrial: 'Sword Trial',
    heroRealm: 'Hero Realm',
  },

  registration: {
    modalTitle: 'Player Registration',
    modalIngameName: 'In-Game Name',
    modalIngameUid: 'In-Game UID',
    modalGearScore: 'Gear Score',
    modalPrimaryWeapon: 'Primary Weapon',
    modalSecondaryWeapon: 'Secondary Weapon',
    placeholderIngameName: 'Your character name',
    placeholderIngameUid: 'Your unique player ID',
    placeholderGearScore: 'e.g., 1.628 or 16280',
    selectWeapons: '🗡️ Please select your weapons:',
    registrationSuccess:
      '✅ Registration successful! Your profile has been created.',
    registrationUpdated:
      '✅ Registration updated! Your profile has been refreshed.',
    profileTitle: 'Player Profile',
    profileNotFound: 'This player has not registered yet.',
    profileFieldIngameName: '🎮 In-Game Name',
    profileFieldUid: '🆔 UID',
    profileFieldGearScore: '⚔️ Gear Score',
    profileFieldWeapons: '🗡️ Weapons',
    profileFieldPrimaryWeapon: 'Primary',
    profileFieldSecondaryWeapon: 'Secondary',
    profileFieldRegistered: '📅 Registered',
    channelSetSuccess: (channel: string) =>
      `✅ Registration channel set to ${channel}!\n\nPlayers can now use \`/register\` or \`/baodanh\` in that channel.`,
    errorWrongChannel: (channel: string) =>
      `❌ Registration is only allowed in ${channel}!\n\nPlease use the command there.`,
    errorNoChannel:
      '❌ Registration is not enabled in this server. Contact an administrator.',
    errorInvalidGearScore: '❌ Gear Score must be a valid number (e.g., 15000).',
  },

  weapons: {
    sword: 'Sword',
    spear: 'Spear',
    bow: 'Bow',
    staff: 'Staff',
    dualBlades: 'Dual Blades',
    other: 'Other',
  },
};
