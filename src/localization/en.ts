import type { Translations } from './types.js';

/**
 * English translations
 */
export const en: Translations = {
  embeds: {
    queueEmpty: 'WAITING FOR PLAYERS',
    beTheFirst: '💡 **Be the first to join!**',
    beTheFirstGuildWar: '💡 **Join the Guild War!**',
    clickRole: 'Click a role button below to start the party',
    partyRoster: 'PARTY ROSTER',
    openSlot: 'OPEN SLOT',
    queueComplete: 'PARTY COMPLETE! READY TO START!',
    queueProgress: '📊 Party Progress',
    empty: 'Empty',
    full: 'FULL!',
    players: 'Players',
    partyFinder: 'Party Finder',
    closed: 'Closed',
    closes: 'Closes',
  },

  footers: {
    queueEmpty: 'Click a role button to join the party',
    queueActive: 'Party is filling up! Join now',
    queueFull: 'Party is ready! Good luck!',
    queueClosed: 'This queue is closed',
  },

  buttons: {
    leave: '❌ Leave',
    tank: 'Tank',
    healer: 'Healer',
    dps: 'DPS',
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
    queueClosed: '🔒 This queue is closed.',
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

  queueExpiredMessage: (queueType: string, mentions: string) =>
    `⏰ **${queueType} Queue Time Ended!**\n\n${mentions}\n\nThe queue timer has expired. The queue is now closed.`,

  commands: {
    setup: {
      description: 'Create a party for Where Winds Meet activities',
      swordTrial: 'Create a Sword Trial queue (5 players)',
      heroRealm: 'Create a Hero Realm party (10 players)',
      guildWar: 'Create a Guild War party (30 players)',
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
    guildWar: 'Guild War',
  },

  registration: {
    modalTitle: 'Player Registration',
    modalIngameName: 'In-Game Name',
    modalIngameUid: 'In-Game UID',
    modalGearScore: 'Gear Score',
    modalArenaRank: 'Arena Rank',
    modalPrimaryWeapon: 'Primary Weapon',
    modalSecondaryWeapon: 'Secondary Weapon',
    placeholderIngameName: 'Your character name',
    placeholderIngameUid: 'Your unique player ID',
    placeholderGearScore: 'e.g., 1.82 (shown as 1.82🦆) or 18200',
    placeholderArenaRank: 'e.g., Gold III, Diamond, etc. (optional)',
    selectWeapons: '🗡️ Please select your weapons:',
    registrationSuccess:
      '✅ Registration successful! Your profile has been created.',
    registrationUpdated:
      '✅ Registration updated! Your profile has been refreshed.',
    updateModalTitle: 'Update Stats',
    updateSuccess: '✅ Stats updated successfully!',
    profileTitle: 'Player Profile',
    profileNotFound: 'This player has not registered yet.',
    profileFieldIngameName: '🎮 In-Game Name',
    profileFieldUid: '🆔 UID',
    profileFieldGearScore: '⚔️ Gear Score',
    profileFieldArenaRank: '🏆 Arena Rank',
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

  verification: {
    setupVerification: {
      description: 'Set up member verification system',
      reviewChannelOption: 'Channel where pending registrations are posted',
      pendingRoleOption: 'Role to remove after approval (optional)',
      approvedRoleOption: 'Role to add after approval (optional)',
      approvedChannelOption: 'Channel where approval notifications are sent (optional)',
    },
    disableVerification: {
      description: 'Disable member verification system',
    },
    verificationEnabled: (channel: string) =>
      `✅ Verification system enabled!\n\nPending registrations will be posted to ${channel} for admin review.`,
    verificationDisabled:
      '✅ Verification system disabled. Registrations will complete immediately.',
    pendingReview:
      '✅ Registration submitted for review!\n\nAn admin will approve your registration soon.',
    pendingCardTitle: '🔍 Pending Member Registration',
    pendingCardFooter: 'Waiting for admin approval',
    approveButton: '✅ Approve',
    rejectButton: '❌ Reject',
    approved: '✅ Registration approved successfully!',
    rejected: '❌ Registration rejected.',
    approvalNotification: (guildName: string) =>
      `Your registration has been approved! Welcome to ${guildName}!`,
    approvedCardTitle: '✅ Registration Approved',
    rejectedCardTitle: '❌ Registration Rejected',
    approvedBy: (username: string) => `Approved by @${username}`,
    rejectedBy: (username: string) => `Rejected by @${username}`,
    errorNotAdmin: '❌ Only administrators can approve registrations.',
    errorAlreadyProcessed: '❌ This registration has already been processed.',
    errorMemberLeft: '❌ This member has left the server.',
    errorMissingPermissions: (errors: string[]) =>
      `⚠️ Approved but encountered permission errors:\n${errors.map((e) => `• ${e}`).join('\n')}\n\nPlease fix permissions manually.`,
    errorPartialSuccess: (errors: string[]) =>
      `⚠️ Partially completed with errors:\n${errors.map((e) => `• ${e}`).join('\n')}`,
  },

  panel: {
    description: (capacity: number) =>
      `Ready to find a party? Click below to open a queue for **${capacity} players**.\n\nThe queue will appear here and anyone can join by selecting a role.`,
    roles: '🛡️ Tank   💚 Healer   ⚔️ DPS',
    createButton: (queueType: string) => `Create ${queueType} Queue`,
    footer: 'Only one queue can be active at a time.',
    panelCreated: (queueType: string, channel: string) =>
      `✅ Panel for **${queueType}** created in ${channel}!\n\nAnyone can now click the button to open a queue.`,
    queueCreatedByPanel: (queueType: string) =>
      `✅ **${queueType}** queue is now open! Join with a role button.`,
    panelAlreadyExists:
      '❌ A panel for this queue type already exists in this server. Delete the old panel message first.',
    noActiveQueue:
      '❌ No active queue of this type to close. The panel is still active.',
    panelDeleted: (queueType: string) =>
      `✅ **${queueType}** panel has been deleted.`,
  },

  guildWar: {
    joinButton: '🏆 Join Guild War',
    selectTeamPlaceholder: 'Select your team...',
    selectRolePlaceholder: 'Select your role...',
    teamJungler: 'Jungler',
    teamOffense: 'Offense',
    teamDefense: 'Defense',
    submitJoin: '✅ Confirm Join',
  },

  guildWarEvent: {
    embedTitle: 'Guild War',
    dayNameSat: 'Saturday',
    dayNameSun: 'Sunday',
    statusOpen: '🟢 REGISTRATION OPEN',
    statusLocked: '🔒 LOCKED',
    statusDone: '🏁 FINISHED',
    statusCancelled: '❌ CANCELLED',
    fieldWhen: '📅 When',
    fieldSignups: '👥 Signed up',
    fieldReminder: '⏰ Reminder',
    reminderValue: (notifyTimestamp, leadMinutes) =>
      `${notifyTimestamp} (${leadMinutes} min before start)`,
    signupCount: (count, capacity) => `**${count}** / ${capacity}`,
    teamHeader: (emoji, teamName, count) => `**${emoji} ${teamName} (${count})**`,
    noSignups: '_No one has signed up yet._',
    footerOpen: 'Pick your team and role, then confirm.',
    footerLocked: 'Registration is closed. See you on the battlefield!',

    registerButton: '✅ Register',
    withdrawButton: '❌ Withdraw',
    selectTeamPlaceholder: 'Select your team...',
    selectRolePlaceholder: 'Select your role...',
    submitButton: '✅ Confirm',
    registered: (teamName, roleName) =>
      `✅ You are registered — ${teamName} · ${roleName}`,
    registrationUpdated: (teamName, roleName) =>
      `✅ Updated — ${teamName} · ${roleName}`,
    withdrawn: '✅ You have withdrawn from this Guild War.',

    pingHeader: (dayName, timestamp) =>
      `⏰ **Guild War — ${dayName}** starts ${timestamp}`,
    pingTeamHeader: (emoji, teamName, count) => `${emoji} **${teamName}** (${count})`,
    pingFooter: 'Tap ✅ if you are coming, ❌ if you cannot make it.',
    nudgeHeader: (minutes, timestamp) =>
      `⚠️ **${minutes} minutes left** — Guild War starts ${timestamp}. Please confirm:`,
    nudgeFooter: 'Only players who have not answered yet are listed.',
    attendanceConfirmed: '✅ Marked as attending. See you there!',
    attendanceDeclined: '❌ Marked as not attending. Your slot has been freed.',
    attendanceSummary: (confirmed, declined, pending) =>
      `✅ ${confirmed} · ❌ ${declined} · ⏳ ${pending}`,

    organizerTitle: (dayName) => `📋 Team Organizer — ${dayName}`,
    organizerSelectPlayer: 'Select a player...',
    organizerMoveTo: (teamName) => `→ ${teamName}`,
    organizerNoPlayerSelected: '❌ Select a player first.',
    organizerNotSignedUp: '❌ That player is not registered for this Guild War.',
    organizerMoved: (username, teamName) => `✅ Moved **${username}** to ${teamName}.`,
    organizerBalance: '⚖️ Auto-balance',
    organizerBalanced: '✅ Teams balanced by role.',
    organizerRefresh: '🔄 Refresh',
    organizerRemove: '🗑️ Remove player',
    organizerRemoved: (username) => `✅ Removed **${username}** from this Guild War.`,
    organizerSelectEvent: 'Select an event...',

    rosterTitle: (dayName) => `📋 Roster — ${dayName}`,

    eventCreated: (dayName, timestamp, channelMention) =>
      `✅ ${dayName} Guild War (${timestamp}) opened in ${channelMention}.`,
    eventAlreadyExists: (dayName) =>
      `ℹ️ A ${dayName} Guild War is already open.`,
    eventCancelled: (dayName) => `✅ ${dayName} Guild War cancelled.`,
    pingSent: (dayName) => `✅ Reminder sent for ${dayName} Guild War.`,
    settingsUpdated: '✅ Guild War settings updated.',
    settingsSummary: (lines) => lines.join('\n'),
    autoOpenOn: '✅ Weekly auto-open enabled.',
    autoOpenOff: '✅ Weekly auto-open disabled. Use `/guildwar open` manually.',

    errorNoEvent: '❌ No Guild War is open right now.',
    errorEventNotFound: '❌ This Guild War no longer exists.',
    errorEventLocked: '🔒 Registration for this Guild War is closed.',
    errorEventFull: (capacity) => `❌ This Guild War is full (${capacity}/${capacity}).`,
    errorNotSignedUp: '❌ You are not registered for this Guild War.',
    errorSelectBoth: '❌ Please select both a team and a role.',
    errorNoRegistrationChannel:
      '❌ No registration channel set. Use `/guildwar schedule` first.',
    errorNoAnnounceChannel:
      '❌ No announcement channel set. Use `/guildwar schedule` first.',
    errorInvalidTime: '❌ Invalid time. Use 24-hour HH:MM format, e.g. 20:00.',
    errorInvalidTimezone: '❌ Unknown timezone. Example: Asia/Ho_Chi_Minh',

    retiredNotice:
      'ℹ️ This Guild War panel is no longer used. Guild War now runs on a schedule — ask an admin to run `/guildwar open`, then register on the new embed.',
  },
  help: {
    title: '📖 Where Winds Meet — Bot Guide',
    intro:
      'Everything your guild needs for co-op and Guild War: scheduled sign-ups, automatic reminders, party finders, and a player roster with gear scores. Set it up once — the bot runs the weekly routine.\n\nIn Discord, type `/` and the command name, then pick each option from the menu. `[...]` below means optional.',
    quickStartTitle: '🚀 Quick start (5 minutes)',
    quickStart: [
      '```',
      '1  /language  language: English',
      '2  /guildwar schedule  registration-channel: #sign-up',
      '                       announce-channel: #general',
      '                       sat-time: 20:00  sun-time: 20:00',
      '3  /guildwar open',
      '4  /setup sword-trial',
      '```',
      'After that the bot opens registration every Thursday and pings each team an hour before the war.',
    ].join('\n'),
    guildWarTitle: '🏆 Guild War — scheduled sign-ups',
    guildWarBody: [
      'Saturday and Sunday are separate events, each with its own roster. One per day — opening twice never duplicates.',
      '```',
      '/guildwar schedule  [registration-channel: #channel]',
      '                    [announce-channel: #channel]',
      '                    [sat-time: 20:00]  [sun-time: 20:00]',
      '                    [timezone: Asia/Ho_Chi_Minh]',
      '                    [open-time: 12:00]   (Thursday)',
      '                    [notify-lead: 60]  [nudge-lead: 15]',
      '                    [capacity: 30]',
      '                    [offense-name: ...] [defense-name: ...]',
      '/guildwar open      [day: Both | Saturday | Sunday]',
      '/guildwar teams     [day: Saturday | Sunday]',
      '/guildwar roster    [day: Saturday | Sunday]',
      '/guildwar ping      [day: Saturday | Sunday]',
      '/guildwar cancel     day: Saturday | Sunday',
      '/guildwar auto       enabled: True | False',
      '/guildwar settings',
      '```',
      'Times are 24-hour. **Players never type commands** — they use the buttons on the embed.',
    ].join('\n'),
    queuesTitle: '⚔️ Party finders — Sword Trial & Hero Realm',
    queuesBody: [
      'A permanent panel members click to open a party. Fills up, pings everyone, expires after 30 minutes.',
      '```',
      '/setup sword-trial  [channel: #channel]   (5 players)',
      '/setup hero-realm   [channel: #channel]   (10 players)',
      '/reset        queue-type: Sword Trial | Hero Realm',
      '/close        queue-type: Sword Trial | Hero Realm',
      '/closepanel   queue-type: Sword Trial | Hero Realm',
      '```',
      '`/reset` empties a party, `/close` deletes it, `/closepanel` removes the button panel itself.',
    ].join('\n'),
    profilesTitle: '📝 Player profiles',
    profilesBody: [
      'A roster of who plays what, so you can build balanced teams.',
      '```',
      '/baodanh                          (or /register)',
      '/capnhat',
      '/info  [user: @member]',
      '/setup-registration  [channel: #channel]',
      '```',
      '`/baodanh` opens a form: in-game name, UID, gear score, arena rank, weapons. `/capnhat` updates gear score and rank later.',
    ].join('\n'),
    verificationTitle: '✅ Member verification',
    verificationBody: [
      'New members register, an admin approves, and the bot swaps their roles.',
      '```',
      '/setupverification   reviewchannel: #channel',
      '                    [pendingrole: @role]',
      '                    [approvedrole: @role]',
      '                    [approvedchannel: #channel]',
      '/disableverification',
      '```',
    ].join('\n'),
    settingsTitle: '🌐 Language & help',
    settingsBody: [
      '```',
      '/language  language: English | Tiếng Việt',
      '/help      [public: True | False]',
      '```',
      'Every embed updates instantly on a language change, including ones already posted.',
    ].join('\n'),
    adminNote:
      'All of the above need the Administrator permission, except `/baodanh`, `/capnhat`, `/info` and `/help`.',
    footer: 'Need a hand? Ping a server admin.',
  },
};
