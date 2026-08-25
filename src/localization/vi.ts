import type { Translations } from './types.js';

/**
 * Vietnamese translations
 */
export const vi: Translations = {
  embeds: {
    queueEmpty: 'ĐANG CHỜ LẬP ĐỘI',
    beTheFirst: '💡 **Tham gia để lập tổ đội chinh phạt boss!**',
    beTheFirstGuildWar: '💡 **Tham gia Bang Chiến!**',
    clickRole: 'Nhấp vào nút vai trò bên dưới để bắt đầu thành lập tổ đội',
    partyRoster: 'DANH SÁCH TỔ ĐỘI',
    openSlot: 'VỊ TRÍ TRỐNG',
    queueComplete: 'LẬP ĐỘI THÀNH CÔNG! SẴN SÀNG BẮT ĐẦU!',
    queueProgress: '📊 Tiến Độ Lập Đội',
    empty: 'Trống',
    full: 'ĐẦY!',
    players: 'Người Chơi',
    partyFinder: 'Tìm Đội',
    closed: 'Đã Đóng',
    closes: 'Đóng',
  },

  footers: {
    queueEmpty: 'Nhấp vào nút vai trò để tham gia hàng đợi',
    queueActive: 'Tổ đội đang được lấp đầy! Tham gia ngay',
    queueFull: 'Tổ đội đã sẵn sàng! Lụm Boss nào!',
    queueClosed: 'Tổ đội này đã đóng',
  },

  buttons: {
    leave: '❌ Rời Tổ Đội',
    tank: 'Tank',
    healer: 'Healer',
    dps: 'DPS',
  },

  success: {
    queueCreated: (queueType: string, channel: string) =>
      `✅ Đã tạo hàng đợi **${queueType}** trong ${channel}!\n\nNgười chơi có thể tham gia bằng các nút vai trò.`,
    queueReset: (queueType: string) =>
      `✅ Hàng đợi **${queueType}** đã được xóa.\n\nTất cả người chơi đã bị loại khỏi hàng đợi.`,
    queueClosed: (queueType: string) =>
      `✅ Hàng đợi **${queueType}** đã được đóng và xóa.`,
    joinedQueue: (role: string) =>
      `✅ Bạn đã tham gia hàng đợi với vai trò ${role}!\n\n💡 *Nhấp vào vai trò khác để chuyển đổi, hoặc nhấp ❌ Rời Đi để thoát khỏi hàng đợi.*`,
    switchedRole: (role: string) => `🔄 Bạn đã chuyển sang ${role}!`,
    leftQueue: `✅ Bạn đã rời khỏi hàng đợi.`,
    languageChanged: (language: string) =>
      `✅ Đã chuyển ngôn ngữ sang **${language}**.`,
  },

  errors: {
    genericError:
      '❌ Đã xảy ra lỗi. Vui lòng thử lại hoặc liên hệ quản trị viên.',
    queueNotFound:
      '❌ Không tìm thấy tổ đội. Nó có thể đã bị xóa hoặc không tồn tại.',
    queueFull: '❌ Tổ đội đã đầy! Vui lòng chờ vòng tiếp theo.',
    queueClosed: '🔒 Tổ đội này đã đóng.',
    queueAlreadyExists:
      '❌ Tổ đội loại này đã tồn tại trong máy chủ này. Sử dụng `/reset` để xóa hoặc `/close` để xóa hẳn.',
    playerAlreadyInQueue:
      '❌ Bạn đã ở trong tổ đội này! Nhấp vào vai trò khác để chuyển đổi, hoặc nhấp ❌ Rời Tổ Đội để thoát.',
    playerInAnotherQueue:
      '❌ Bạn đã ở trong tổ đội khác trong máy chủ này. Vui lòng rời khỏi tổ đội đó trước.',
    playerNotInQueue:
      '❌ Bạn không ở trong tổ đội. Nhấp vào nút vai trò để tham gia!',
    invalidChannel: '❌ Kênh không hợp lệ. Vui lòng chọn kênh text.',
    missingPermissions: (permissions: string[]) =>
      `❌ Tôi thiếu các quyền sau:\n${permissions.map((p) => `• ${p}`).join('\n')}\n\nVui lòng cấp các quyền này và thử lại.`,
  },

  queueFullMessage: (queueType: string, mentions: string) =>
    `🎉 **Tổ Đội ${queueType} Đã Đầy!**\n\n${mentions}\n\nĐội của bạn đã sẵn sàng! Lụm Boss nào!`,

  queueExpiredMessage: (queueType: string, mentions: string) =>
    `⏰ **Hết Thời Gian Tổ Đội ${queueType}!**\n\n${mentions}\n\nThời gian tổ đội đã hết. Tổ đội đã đóng.`,

  commands: {
    setup: {
      description: 'Tạo tổ đội cho các hoạt động Where Winds Meet',
      swordTrial: 'Tạo tổ đội Sword Trial (5 người chơi)',
      heroRealm: 'Tạo tổ đội Hero Realm (10 người chơi)',
      guildWar: 'Tạo tổ đội Guild War (30 người chơi)',
      channelOption: 'Kênh cho tổ đội (mặc định: kênh hiện tại)',
    },
    reset: {
      description: 'Xóa tất cả người chơi khỏi tổ đội',
      queueTypeOption: 'Tổ đội nào cần xóa',
    },
    close: {
      description: 'Xóa hoàn toàn tổ đội',
      queueTypeOption: 'Tổ đội nào cần đóng',
    },
    language: {
      description: 'Thay đổi ngôn ngữ bot',
      languageOption: 'Chọn ngôn ngữ',
    },
    register: {
      description: 'Đăng ký hồ sơ trong game của bạn',
    },
    baodanh: {
      description: 'Đăng ký hồ sơ người chơi',
    },
    info: {
      description: 'Xem hồ sơ người chơi',
      userOption: 'Người chơi cần xem (để trống để xem hồ sơ của bạn)',
    },
    setupRegistration: {
      description: 'Thiết lập kênh đăng ký',
      channelOption: 'Kênh mà người chơi có thể đăng ký',
    },
  },

  queueTypes: {
    swordTrial: 'Sword Trial',
    heroRealm: 'Hero Realm',
    guildWar: 'Bang Chiến',
  },

  registration: {
    modalTitle: 'Đăng Ký Người Chơi',
    modalIngameName: 'Tên Trong Game',
    modalIngameUid: 'UID Trong Game',
    modalGearScore: 'Lực Chiến',
    modalArenaRank: 'Hạng Đấu Trường',
    modalPrimaryWeapon: 'Vũ Khí Chính',
    modalSecondaryWeapon: 'Vũ Khí Phụ',
    placeholderIngameName: 'Tên nhân vật của bạn',
    placeholderIngameUid: 'ID duy nhất của bạn',
    placeholderGearScore: 'vd: 1.82 (hiển thị 1.82🦆) hoặc 18200',
    placeholderArenaRank: 'vd: Beginner I, Legend II, Mythic, v.v. (tùy chọn)',
    selectWeapons: '🗡️ Vui lòng chọn vũ khí của bạn:',
    registrationSuccess: '✅ Đăng ký thành công! Hồ sơ của bạn đã được tạo.',
    registrationUpdated: '✅ Đã cập nhật! Hồ sơ của bạn đã được làm mới.',
    updateModalTitle: 'Cập Nhật Chỉ Số',
    updateSuccess: '✅ Đã cập nhật chỉ số thành công!',
    profileTitle: 'Hồ Sơ Người Chơi',
    profileNotFound: 'Người chơi này chưa đăng ký.',
    profileFieldIngameName: '🎮 Tên Trong Game',
    profileFieldUid: '🆔 UID',
    profileFieldGearScore: '⚔️ Lực Chiến',
    profileFieldArenaRank: '🏆 Hạng Đấu Trường',
    profileFieldWeapons: '🗡️ Vũ Khí',
    profileFieldPrimaryWeapon: 'Vũ Khí Chính',
    profileFieldSecondaryWeapon: 'Vũ Khí Phụ',
    profileFieldRegistered: '📅 Ngày Đăng Ký',
    channelSetSuccess: (channel: string) =>
      `✅ Đã đặt kênh đăng ký thành ${channel}!\n\nNgười chơi có thể sử dụng \`/register\` hoặc \`/baodanh\` trong kênh đó.`,
    errorWrongChannel: (channel: string) =>
      `❌ Đăng ký chỉ được phép trong ${channel}!\n\nVui lòng sử dụng lệnh ở đó.`,
    errorNoChannel:
      '❌ Đăng ký chưa được bật trong máy chủ này. Liên hệ quản trị viên.',
    errorInvalidGearScore:
      '❌ Lực chiến phải là một số hợp lệ (vd: 15000 hoặc 1.5).',
  },

  weapons: {
    sword: 'Kiếm',
    spear: 'Thương',
    bow: 'Cung',
    staff: 'Trượng',
    dualBlades: 'Song Đao',
    other: 'Khác',
  },

  verification: {
    setupVerification: {
      description: 'Thiết lập hệ thống xác minh thành viên',
      reviewChannelOption: 'Kênh nơi đơn đăng ký chờ duyệt được đăng',
      pendingRoleOption: 'Vai trò sẽ bị xóa sau khi duyệt (tùy chọn)',
      approvedRoleOption: 'Vai trò sẽ được thêm sau khi duyệt (tùy chọn)',
      approvedChannelOption: 'Kênh nơi thông báo duyệt được gửi (tùy chọn)',
    },
    disableVerification: {
      description: 'Tắt hệ thống xác minh thành viên',
    },
    verificationEnabled: (channel: string) =>
      `✅ Đã bật hệ thống xác minh!\n\nĐơn đăng ký chờ duyệt sẽ được đăng tại ${channel} để quản trị viên xem xét.`,
    verificationDisabled:
      '✅ Đã tắt hệ thống xác minh. Đăng ký sẽ hoàn tất ngay lập tức.',
    pendingReview:
      '✅ Đơn đăng ký đã được gửi để xem xét!\n\nQuản trị viên sẽ duyệt đơn của bạn sớm nhất.',
    pendingCardTitle: '🔍 Đơn Đăng Ký Thành Viên Đang Chờ',
    pendingCardFooter: 'Chờ quản trị viên duyệt',
    approveButton: '✅ Chấp Nhận',
    rejectButton: '❌ Từ Chối',
    approved: '✅ Đã duyệt đơn đăng ký thành công!',
    rejected: '❌ Đơn đăng ký đã bị từ chối.',
    approvalNotification: (guildName: string) =>
      `Đơn đăng ký của bạn đã được duyệt! Chào mừng bạn đến với ${guildName}!`,
    approvedCardTitle: '✅ Đơn Đăng Ký Đã Được Duyệt',
    rejectedCardTitle: '❌ Đơn Đăng Ký Bị Từ Chối',
    approvedBy: (username: string) => `Được duyệt bởi @${username}`,
    rejectedBy: (username: string) => `Bị từ chối bởi @${username}`,
    errorNotAdmin:
      '❌ Chỉ quản trị viên mới có thể duyệt đơn đăng ký.',
    errorAlreadyProcessed: '❌ Đơn đăng ký này đã được xử lý rồi.',
    errorMemberLeft: '❌ Thành viên này đã rời khỏi máy chủ.',
    errorMissingPermissions: (errors: string[]) =>
      `⚠️ Đã duyệt nhưng gặp lỗi quyền hạn:\n${errors.map((e) => `• ${e}`).join('\n')}\n\nVui lòng sửa quyền thủ công.`,
    errorPartialSuccess: (errors: string[]) =>
      `⚠️ Hoàn thành một phần với lỗi:\n${errors.map((e) => `• ${e}`).join('\n')}`,
  },

  panel: {
    description: (capacity: number) =>
      `Sẵn sàng tìm đội? Nhấp bên dưới để mở hàng đợi cho **${capacity} người chơi**.\n\nHàng đợi sẽ xuất hiện tại đây và mọi người có thể tham gia bằng cách chọn vai trò.`,
    roles: '🛡️ Tank   💚 Healer   ⚔️ DPS',
    createButton: (queueType: string) => `Tạo Tổ Đội ${queueType}`,
    footer: 'Chỉ một tổ đội có thể hoạt động cùng lúc.',
    panelCreated: (queueType: string, channel: string) =>
      `✅ Bảng **${queueType}** đã được tạo trong ${channel}!\n\nBất kỳ ai cũng có thể nhấp vào nút để mở tổ đội.`,
    queueCreatedByPanel: (queueType: string) =>
      `✅ Tổ đội **${queueType}** đã được mở! Tham gia bằng nút vai trò.`,
    panelAlreadyExists:
      '❌ Bảng cho loại tổ đội này đã tồn tại trong máy chủ này. Vui lòng xóa bảng cũ trước.',
    noActiveQueue:
      '❌ Không có tổ đội nào đang hoạt động để đóng. Bảng vẫn còn hoạt động.',
    panelDeleted: (queueType: string) =>
      `✅ Bảng **${queueType}** đã được xóa.`,
  },

  guildWar: {
    joinButton: '🏆 Tham Gia Bang Chiến',
    selectTeamPlaceholder: 'Chọn đội của bạn...',
    selectRolePlaceholder: 'Chọn vai trò của bạn...',
    teamJungler: 'Rừng',
    teamOffense: 'Công',
    teamDefense: 'Thủ',
    submitJoin: '✅ Xác Nhận Tham Gia',
  },

  guildWarEvent: {
    embedTitle: 'Bang Chiến',
    dayNameSat: 'Thứ 7',
    dayNameSun: 'Chủ Nhật',
    statusOpen: '🟢 ĐANG MỞ ĐĂNG KÝ',
    statusLocked: '🔒 ĐÃ KHÓA',
    statusDone: '🏁 ĐÃ KẾT THÚC',
    statusCancelled: '❌ ĐÃ HỦY',
    fieldWhen: '📅 Thời gian',
    fieldSignups: '👥 Đã đăng ký',
    fieldReminder: '⏰ Nhắc nhở',
    reminderValue: (notifyTimestamp, leadMinutes) =>
      `${notifyTimestamp} (trước ${leadMinutes} phút)`,
    signupCount: (count, capacity) => `**${count}** / ${capacity}`,
    teamHeader: (emoji, teamName, count) => `**${emoji} ${teamName} (${count})**`,
    noSignups: '_Chưa có ai đăng ký._',
    footerOpen: 'Chọn đội và vai trò của bạn, rồi xác nhận.',
    footerLocked: 'Đã khóa đăng ký. Hẹn gặp trên chiến trường!',

    registerButton: '✅ Đăng Ký',
    withdrawButton: '❌ Hủy Đăng Ký',
    selectTeamPlaceholder: 'Chọn đội của bạn...',
    selectRolePlaceholder: 'Chọn vai trò của bạn...',
    submitButton: '✅ Xác Nhận',
    registered: (teamName, roleName) =>
      `✅ Đã đăng ký — ${teamName} · ${roleName}`,
    registrationUpdated: (teamName, roleName) =>
      `✅ Đã cập nhật — ${teamName} · ${roleName}`,
    withdrawn: '✅ Bạn đã hủy đăng ký Bang Chiến này.',

    pingHeader: (dayName, timestamp) =>
      `⏰ **Bang Chiến — ${dayName}** bắt đầu ${timestamp}`,
    pingTeamHeader: (emoji, teamName, count) => `${emoji} **${teamName}** (${count})`,
    pingFooter: 'Bấm ✅ nếu bạn tham gia, ❌ nếu bạn bận.',
    nudgeHeader: (minutes, timestamp) =>
      `⚠️ **Còn ${minutes} phút** — Bang Chiến bắt đầu ${timestamp}. Vui lòng xác nhận:`,
    nudgeFooter: 'Chỉ nhắc những người chưa phản hồi.',
    attendanceConfirmed: '✅ Đã ghi nhận bạn tham gia. Hẹn gặp!',
    attendanceDeclined: '❌ Đã ghi nhận bạn không tham gia. Suất của bạn đã được trả lại.',
    attendanceSummary: (confirmed, declined, pending) =>
      `✅ ${confirmed} · ❌ ${declined} · ⏳ ${pending}`,

    organizerTitle: (dayName) => `📋 Sắp Xếp Đội — ${dayName}`,
    organizerSelectPlayer: 'Chọn người chơi...',
    organizerMoveTo: (teamName) => `→ ${teamName}`,
    organizerNoPlayerSelected: '❌ Chọn người chơi trước đã.',
    organizerNotSignedUp: '❌ Người chơi này chưa đăng ký Bang Chiến này.',
    organizerMoved: (username, teamName) => `✅ Đã chuyển **${username}** sang ${teamName}.`,
    organizerBalance: '⚖️ Tự Động Chia Đều',
    organizerBalanced: '✅ Đã chia đều hai đội theo vai trò.',
    organizerRefresh: '🔄 Làm Mới',
    organizerRemove: '🗑️ Xóa Người Chơi',
    organizerRemoved: (username) => `✅ Đã xóa **${username}** khỏi Bang Chiến này.`,
    organizerSelectEvent: 'Chọn buổi Bang Chiến...',

    rosterTitle: (dayName) => `📋 Danh Sách — ${dayName}`,

    eventCreated: (dayName, timestamp, channelMention) =>
      `✅ Đã mở đăng ký Bang Chiến ${dayName} (${timestamp}) tại ${channelMention}.`,
    eventAlreadyExists: (dayName) =>
      `ℹ️ Bang Chiến ${dayName} đã được mở rồi.`,
    eventCancelled: (dayName) => `✅ Đã hủy Bang Chiến ${dayName}.`,
    pingSent: (dayName) => `✅ Đã gửi nhắc nhở cho Bang Chiến ${dayName}.`,
    settingsUpdated: '✅ Đã cập nhật cài đặt Bang Chiến.',
    settingsSummary: (lines) => lines.join('\n'),
    autoOpenOn: '✅ Đã bật tự động mở đăng ký hàng tuần.',
    autoOpenOff: '✅ Đã tắt tự động mở đăng ký. Dùng `/guildwar open` thủ công.',

    errorNoEvent: '❌ Hiện không có Bang Chiến nào đang mở.',
    errorEventNotFound: '❌ Bang Chiến này không còn tồn tại.',
    errorEventLocked: '🔒 Bang Chiến này đã khóa đăng ký.',
    errorEventFull: (capacity) => `❌ Bang Chiến này đã đủ người (${capacity}/${capacity}).`,
    errorNotSignedUp: '❌ Bạn chưa đăng ký Bang Chiến này.',
    errorSelectBoth: '❌ Vui lòng chọn cả đội và vai trò.',
    errorNoRegistrationChannel:
      '❌ Chưa đặt kênh đăng ký. Dùng `/guildwar schedule` trước.',
    errorNoAnnounceChannel:
      '❌ Chưa đặt kênh thông báo. Dùng `/guildwar schedule` trước.',
    errorInvalidTime: '❌ Giờ không hợp lệ. Dùng định dạng 24 giờ HH:MM, vd: 20:00.',
    errorInvalidTimezone: '❌ Múi giờ không hợp lệ. Ví dụ: Asia/Ho_Chi_Minh',

    retiredNotice:
      'ℹ️ Bảng Bang Chiến này không còn dùng nữa. Bang Chiến giờ chạy theo lịch — nhờ admin dùng `/guildwar open`, rồi đăng ký ở bảng mới.',
  },
  help: {
    title: '📖 Where Winds Meet — Hướng Dẫn Bot',
    intro:
      'Tất cả những gì bang hội cần cho co-op và Bang Chiến: đăng ký theo lịch, nhắc nhở tự động, tìm tổ đội, và hồ sơ người chơi kèm lực chiến. Cài một lần — bot lo phần còn lại mỗi tuần.\n\nTrong Discord, gõ `/` rồi tên lệnh, sau đó chọn từng tham số từ menu. `[...]` nghĩa là tùy chọn.',
    quickStartTitle: '🚀 Bắt đầu nhanh (5 phút)',
    quickStart: [
      '```',
      '1  /language  language: Tiếng Việt',
      '2  /guildwar schedule  registration-channel: #dang-ky',
      '                       announce-channel: #thong-bao',
      '                       sat-time: 20:00  sun-time: 20:00',
      '3  /guildwar open',
      '4  /setup sword-trial',
      '```',
      'Sau đó bot tự mở đăng ký mỗi Thứ 5 và ping từng đội trước giờ đánh 1 tiếng.',
    ].join('\n'),
    guildWarTitle: '🏆 Bang Chiến — đăng ký theo lịch',
    guildWarBody: [
      'Thứ 7 và Chủ Nhật là hai buổi riêng, mỗi buổi một danh sách. Mỗi ngày chỉ một buổi — mở lại không bị trùng.',
      '```',
      '/guildwar schedule  [registration-channel: #kênh]',
      '                    [announce-channel: #kênh]',
      '                    [sat-time: 20:00]  [sun-time: 20:00]',
      '                    [timezone: Asia/Ho_Chi_Minh]',
      '                    [open-time: 12:00]   (Thứ 5)',
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
      'Giờ theo định dạng 24 tiếng. **Người chơi không cần gõ lệnh** — chỉ bấm nút trên bảng.',
    ].join('\n'),
    queuesTitle: '⚔️ Tìm tổ đội — Sword Trial & Hero Realm',
    queuesBody: [
      'Bảng cố định để thành viên bấm mở tổ đội. Đủ người thì ping tất cả, tự hết hạn sau 30 phút.',
      '```',
      '/setup sword-trial  [channel: #kênh]    (5 người)',
      '/setup hero-realm   [channel: #kênh]    (10 người)',
      '/reset        queue-type: Sword Trial | Hero Realm',
      '/close        queue-type: Sword Trial | Hero Realm',
      '/closepanel   queue-type: Sword Trial | Hero Realm',
      '```',
      '`/reset` xóa người chơi, `/close` xóa tổ đội, `/closepanel` gỡ luôn bảng bấm.',
    ].join('\n'),
    profilesTitle: '📝 Hồ sơ người chơi',
    profilesBody: [
      'Danh sách ai chơi gì, để xếp đội cho cân.',
      '```',
      '/baodanh                          (hoặc /register)',
      '/capnhat',
      '/info  [user: @thành-viên]',
      '/setup-registration  [channel: #kênh]',
      '```',
      '`/baodanh` mở form: tên trong game, UID, lực chiến, hạng đấu trường, vũ khí. `/capnhat` để cập nhật lực chiến và hạng sau này.',
    ].join('\n'),
    verificationTitle: '✅ Duyệt thành viên',
    verificationBody: [
      'Thành viên mới đăng ký, admin duyệt, bot tự đổi role cho họ.',
      '```',
      '/setupverification   reviewchannel: #kênh',
      '                    [pendingrole: @role]',
      '                    [approvedrole: @role]',
      '                    [approvedchannel: #kênh]',
      '/disableverification',
      '```',
    ].join('\n'),
    settingsTitle: '🌐 Ngôn ngữ & trợ giúp',
    settingsBody: [
      '```',
      '/language  language: English | Tiếng Việt',
      '/help      [public: True | False]',
      '```',
      'Mọi bảng cập nhật ngay khi đổi ngôn ngữ, kể cả bảng đã đăng trước đó.',
    ].join('\n'),
    adminNote:
      'Tất cả lệnh trên cần quyền Administrator, trừ `/baodanh`, `/capnhat`, `/info` và `/help`.',
    footer: 'Cần hỗ trợ? Nhắn cho admin của server.',
  },
};
