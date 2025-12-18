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
    modalPrimaryWeapon: string;
    modalSecondaryWeapon: string;
    placeholderIngameName: string;
    placeholderIngameUid: string;
    placeholderGearScore: string;
    selectWeapons: string;
    registrationSuccess: string;
    registrationUpdated: string;
    profileTitle: string;
    profileNotFound: string;
    profileFieldIngameName: string;
    profileFieldUid: string;
    profileFieldGearScore: string;
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
}
