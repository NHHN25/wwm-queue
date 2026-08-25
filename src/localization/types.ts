/**
 * Supported languages
 */
export type Language = 'en' | 'vi';

/**
 * Translation keys structure
 */
export interface Translations {
  // Queue embeds
  embeds: {
    queueEmpty: string;
    beTheFirst: string;
    beTheFirstGuildWar: string;
    clickRole: string;
    partyRoster: string;
    openSlot: string;
    queueComplete: string;
    queueProgress: string;
    empty: string;
    full: string;
    players: string;
    partyFinder: string;
    closed: string;
    closes: string;
  };

  // Footer messages
  footers: {
    queueEmpty: string;
    queueActive: string;
    queueFull: string;
    queueClosed: string;
  };

  // Button labels (Tank, Healer, DPS kept in English)
  buttons: {
    leave: string;
    tank: string;
    healer: string;
    dps: string;
  };

  // Success messages
  success: {
    queueCreated: (queueType: string, channel: string) => string;
    queueReset: (queueType: string) => string;
    queueClosed: (queueType: string) => string;
    joinedQueue: (role: string) => string;
    switchedRole: (role: string) => string;
    leftQueue: string;
    languageChanged: (language: string) => string;
  };

  // Error messages
  errors: {
    genericError: string;
    queueNotFound: string;
    queueFull: string;
    queueClosed: string;
    queueAlreadyExists: string;
    playerAlreadyInQueue: string;
    playerInAnotherQueue: string;
    playerNotInQueue: string;
    invalidChannel: string;
    missingPermissions: (permissions: string[]) => string;
  };

  // Queue full notification
  queueFullMessage: (queueType: string, mentions: string) => string;

  // Queue expired notification
  queueExpiredMessage: (queueType: string, mentions: string) => string;

  // Command descriptions
  commands: {
    setup: {
      description: string;
      swordTrial: string;
      heroRealm: string;
      guildWar: string;
      channelOption: string;
    };
    reset: {
      description: string;
      queueTypeOption: string;
    };
    close: {
      description: string;
      queueTypeOption: string;
    };
    language: {
      description: string;
      languageOption: string;
    };
    register: {
      description: string;
    };
    baodanh: {
      description: string;
    };
    info: {
      description: string;
      userOption: string;
    };
    setupRegistration: {
      description: string;
      channelOption: string;
    };
  };

  // Queue type names
  queueTypes: {
    swordTrial: string;
    heroRealm: string;
    guildWar: string;
  };

  // Player registration
  registration: {
    modalTitle: string;
    modalIngameName: string;
    modalIngameUid: string;
    modalGearScore: string;
    modalArenaRank: string;
    modalPrimaryWeapon: string;
    modalSecondaryWeapon: string;
    placeholderIngameName: string;
    placeholderIngameUid: string;
    placeholderGearScore: string;
    placeholderArenaRank: string;
    selectWeapons: string;
    registrationSuccess: string;
    registrationUpdated: string;
    updateModalTitle: string;
    updateSuccess: string;
    profileTitle: string;
    profileNotFound: string;
    profileFieldIngameName: string;
    profileFieldUid: string;
    profileFieldGearScore: string;
    profileFieldArenaRank: string;
    profileFieldWeapons: string;
    profileFieldPrimaryWeapon: string;
    profileFieldSecondaryWeapon: string;
    profileFieldRegistered: string;
    channelSetSuccess: (channel: string) => string;
    errorWrongChannel: (channel: string) => string;
    errorNoChannel: string;
    errorInvalidGearScore: string;
  };

  // Weapon names
  weapons: {
    sword: string;
    spear: string;
    bow: string;
    staff: string;
    dualBlades: string;
    other: string;
  };

  // Verification system
  verification: {
    // Command descriptions
    setupVerification: {
      description: string;
      reviewChannelOption: string;
      pendingRoleOption: string;
      approvedRoleOption: string;
      approvedChannelOption: string;
    };
    disableVerification: {
      description: string;
    };
    // Success messages
    verificationEnabled: (channel: string) => string;
    verificationDisabled: string;
    // Pending registration
    pendingReview: string;
    pendingCardTitle: string;
    pendingCardFooter: string;
    // Approval
    approveButton: string;
    rejectButton: string;
    approved: string;
    rejected: string;
    approvalNotification: (guildName: string) => string;
    approvedCardTitle: string;
    rejectedCardTitle: string;
    approvedBy: (username: string) => string;
    rejectedBy: (username: string) => string;
    // Errors
    errorNotAdmin: string;
    errorAlreadyProcessed: string;
    errorMemberLeft: string;
    errorMissingPermissions: (errors: string[]) => string;
    errorPartialSuccess: (errors: string[]) => string;
  };

  // Panel embed and button text
  panel: {
    description: (capacity: number) => string;
    roles: string;
    createButton: (queueType: string) => string;
    footer: string;
    panelCreated: (queueType: string, channel: string) => string;
    queueCreatedByPanel: (queueType: string) => string;
    panelAlreadyExists: string;
    noActiveQueue: string;
    panelDeleted: (queueType: string) => string;
  };

  // Guild War specific
  guildWar: {
    joinButton: string;
    selectTeamPlaceholder: string;
    selectRolePlaceholder: string;
    teamJungler: string;
    teamOffense: string;
    teamDefense: string;
    submitJoin: string;
  };

  // Scheduled Guild War events (registration, reminders, team organizing)
  guildWarEvent: {
    // Embed
    embedTitle: string;
    dayNameSat: string;
    dayNameSun: string;
    statusOpen: string;
    statusLocked: string;
    statusDone: string;
    statusCancelled: string;
    fieldWhen: string;
    fieldSignups: string;
    fieldReminder: string;
    reminderValue: (notifyTimestamp: string, leadMinutes: number) => string;
    signupCount: (count: number, capacity: number) => string;
    teamHeader: (emoji: string, teamName: string, count: number) => string;
    noSignups: string;
    footerOpen: string;
    footerLocked: string;

    // Registration flow
    registerButton: string;
    withdrawButton: string;
    selectTeamPlaceholder: string;
    selectRolePlaceholder: string;
    submitButton: string;
    registered: (teamName: string, roleName: string) => string;
    registrationUpdated: (teamName: string, roleName: string) => string;
    withdrawn: string;

    // Reminder pings
    pingHeader: (dayName: string, timestamp: string) => string;
    pingTeamHeader: (emoji: string, teamName: string, count: number) => string;
    pingFooter: string;
    nudgeHeader: (minutes: number, timestamp: string) => string;
    nudgeFooter: string;
    attendanceConfirmed: string;
    attendanceDeclined: string;
    attendanceSummary: (confirmed: number, declined: number, pending: number) => string;

    // Team organizer
    organizerTitle: (dayName: string) => string;
    organizerSelectPlayer: string;
    organizerMoveTo: (teamName: string) => string;
    organizerNoPlayerSelected: string;
    organizerNotSignedUp: string;
    organizerMoved: (username: string, teamName: string) => string;
    organizerBalance: string;
    organizerBalanced: string;
    organizerRefresh: string;
    organizerRemove: string;
    organizerRemoved: (username: string) => string;
    organizerSelectEvent: string;

    // Roster export
    rosterTitle: (dayName: string) => string;

    // Admin feedback
    eventCreated: (dayName: string, timestamp: string, channelMention: string) => string;
    eventAlreadyExists: (dayName: string) => string;
    eventCancelled: (dayName: string) => string;
    pingSent: (dayName: string) => string;
    settingsUpdated: string;
    settingsSummary: (lines: string[]) => string;
    autoOpenOn: string;
    autoOpenOff: string;

    // Errors
    errorNoEvent: string;
    errorEventNotFound: string;
    errorEventLocked: string;
    errorEventFull: (capacity: number) => string;
    errorNotSignedUp: string;
    errorSelectBoth: string;
    errorNoRegistrationChannel: string;
    errorNoAnnounceChannel: string;
    errorInvalidTime: string;
    errorInvalidTimezone: string;

    // Shown on leftover buttons from the retired ad-hoc Guild War queue
    retiredNotice: string;
  };
  // /help — command guide
  help: {
    title: string;
    intro: string;
    quickStartTitle: string;
    quickStart: string;
    guildWarTitle: string;
    guildWarBody: string;
    queuesTitle: string;
    queuesBody: string;
    profilesTitle: string;
    profilesBody: string;
    verificationTitle: string;
    verificationBody: string;
    settingsTitle: string;
    settingsBody: string;
    adminNote: string;
    footer: string;
  };
}
