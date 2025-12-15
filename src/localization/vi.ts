import type { Translations } from './types.js';

/**
 * Vietnamese translations
 */
export const vi: Translations = {
  embeds: {
    queueEmpty: 'ĐANG CHỜ NGƯỜI CHƠI',
    beTheFirst: '💡 **Hãy là người đầu tiên tham gia!**',
    clickRole: 'Nhấp vào nút vai trò bên dưới để bắt đầu hàng đợi',
    partyRoster: 'DANH SÁCH ĐỘI',
    openSlot: 'VỊ TRÍ TRỐNG',
    queueComplete: 'HÀNG ĐỢI ĐẦY! SẴN SÀNG BẮT ĐẦU!',
    queueProgress: '📊 Tiến Độ Hàng Đợi',
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
    leave: '❌ Rời Đi',
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
      '❌ Không tìm thấy hàng đợi. Nó có thể đã bị xóa hoặc không tồn tại.',
    queueFull: '❌ Hàng đợi đã đầy! Vui lòng chờ vòng tiếp theo.',
    queueAlreadyExists:
      '❌ Hàng đợi loại này đã tồn tại trong máy chủ này. Sử dụng `/reset` để xóa hoặc `/close` để xóa hẳn.',
    playerAlreadyInQueue:
      '❌ Bạn đã ở trong hàng đợi này! Nhấp vào vai trò khác để chuyển đổi, hoặc nhấp ❌ Rời Đi để thoát.',
    playerInAnotherQueue:
      '❌ Bạn đã ở trong hàng đợi khác trong máy chủ này. Vui lòng rời khỏi hàng đợi đó trước.',
    playerNotInQueue:
      '❌ Bạn không ở trong hàng đợi. Nhấp vào nút vai trò để tham gia!',
    invalidChannel: '❌ Kênh không hợp lệ. Vui lòng chọn kênh văn bản.',
    missingPermissions: (permissions: string[]) =>
      `❌ Tôi thiếu các quyền sau:\n${permissions.map((p) => `• ${p}`).join('\n')}\n\nVui lòng cấp các quyền này và thử lại.`,
  },

  queueFullMessage: (queueType: string, mentions: string) =>
    `🎉 **Hàng Đợi ${queueType} Đã Đầy!**\n\n${mentions}\n\nĐội của bạn đã sẵn sàng! Chúc may mắn và chơi vui vẻ!`,

  commands: {
    setup: {
      description: 'Tạo hàng đợi cho các hoạt động Where Winds Meet',
      swordTrial: 'Tạo hàng đợi Thử Thách Kiếm (5 người chơi)',
      heroRealm: 'Tạo hàng đợi Cõi Anh Hùng (10 người chơi)',
      channelOption: 'Kênh cho hàng đợi (mặc định: kênh hiện tại)',
    },
    reset: {
      description: 'Xóa tất cả người chơi khỏi hàng đợi',
      queueTypeOption: 'Hàng đợi nào cần xóa',
    },
    close: {
      description: 'Xóa hoàn toàn hàng đợi',
      queueTypeOption: 'Hàng đợi nào cần đóng',
    },
    language: {
      description: 'Thay đổi ngôn ngữ bot',
      languageOption: 'Chọn ngôn ngữ',
    },
  },

  queueTypes: {
    swordTrial: 'Thử Thách Kiếm',
    heroRealm: 'Cõi Anh Hùng',
  },
};
