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
    clickRole: string;
    partyRoster: string;
    openSlot: string;
    queueComplete: string;
    queueProgress: string;
    empty: string;
    full: string;
    players: string;
    partyFinder: string;
  };

  // Footer messages
  footers: {
    queueEmpty: string;
    queueActive: string;
    queueFull: string;
  };

  // Button labels (Tank, Healer, DPS kept in English)
  buttons: {
    leave: string;
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
    queueAlreadyExists: string;
    playerAlreadyInQueue: string;
    playerInAnotherQueue: string;
    playerNotInQueue: string;
    invalidChannel: string;
    missingPermissions: (permissions: string[]) => string;
  };

  // Queue full notification
  queueFullMessage: (queueType: string, mentions: string) => string;

  // Command descriptions
  commands: {
    setup: {
      description: string;
      swordTrial: string;
      heroRealm: string;
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
}
