import type { Translations } from './types.js';

/**
 * Vietnamese translations
 */
export const vi: Translations = {
  embeds: {
    queueEmpty: 'ĐANG CHỜ LẬP ĐỘI',
    beTheFirst: '💡 **Tham gia để lập tổ đội chinh phạt boss!**',
    clickRole: 'Nhấp vào nút vai trò bên dưới để bắt đầu thành lập tổ đội',
    partyRoster: 'DANH SÁCH TỔ ĐỘI',
    openSlot: 'VỊ TRÍ TRỐNG',
    queueComplete: 'HÀNG ĐỢI ĐẦY! SẴN SÀNG BẮT ĐẦU!',
    queueProgress: '📊 Tiến Độ Lập Đội',
    empty: 'Trống',
    full: 'ĐẦY!',
    players: 'Người Chơi',
    partyFinder: 'Tìm Đội',
  },

  footers: {
    queueEmpty: 'Nhấp vào nút vai trò để tham gia hàng đợi',
    queueActive: 'Hàng đợi đang được lấp đầy! Tham gia ngay',
    queueFull: 'Hàng đợi đã sẵn sàng! Chúc may mắn!',
  },

  buttons: {
    leave: '❌ Rời Tổ Đội',
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
    `🎉 **Hàng Đợi ${queueType} Đã Đầy!**\n\n${mentions}\n\nĐội của bạn đã sẵn sàng! Chúc may mắn và chơi vui vẻ!`,

  commands: {
    setup: {
      description: 'Tạo tổ đội cho các hoạt động Where Winds Meet',
      swordTrial: 'Tạo tổ đội Sword Trial (5 người chơi)',
      heroRealm: 'Tạo tổ đội Hero Realm (10 người chơi)',
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
  },

  queueTypes: {
    swordTrial: 'Sword Trial',
    heroRealm: 'Hero Realm',
  },
};
