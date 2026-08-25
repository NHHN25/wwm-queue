import type { Client } from 'discord.js';

/**
 * Minimal Discord stand-ins.
 *
 * The Guild War code only ever touches a narrow slice of discord.js: fetching
 * a channel, sending a message, fetching and editing that message. Faking that
 * slice lets the whole scheduler run end to end in-process, with no gateway,
 * no token and no rate limits.
 */

export interface SentMessage {
  channelId: string;
  content: string;
  embeds: unknown[];
  components: unknown[];
  allowedMentions?: { users?: string[] };
  id: string;
}

export interface EditedMessage {
  messageId: string;
  embeds: unknown[];
  components: unknown[];
}

export class FakeChannel {
  readonly sent: SentMessage[] = [];
  readonly edits: EditedMessage[] = [];

  constructor(
    public readonly id: string,
    private readonly bus: FakeDiscord
  ) {}

  isTextBased(): boolean {
    return true;
  }

  async send(payload: any): Promise<{ id: string }> {
    const id = this.bus.nextMessageId();

    const message: SentMessage = {
      channelId: this.id,
      content: typeof payload === 'string' ? payload : (payload.content ?? ''),
      embeds: payload.embeds ?? [],
      components: payload.components ?? [],
      allowedMentions: payload.allowedMentions,
      id,
    };

    this.sent.push(message);
    this.bus.allSent.push(message);
    this.bus.messageChannels.set(id, this);

    return { id };
  }

  get messages() {
    return {
      fetch: async (messageId: string) => {
        if (!this.bus.messageChannels.has(messageId)) {
          throw new Error(`Unknown message ${messageId}`);
        }

        return {
          id: messageId,
          edit: async (payload: any) => {
            const edit: EditedMessage = {
              messageId,
              embeds: payload.embeds ?? [],
              components: payload.components ?? [],
            };

            this.edits.push(edit);
            this.bus.allEdits.push(edit);

            return edit;
          },
        };
      },
    };
  }
}

/**
 * A fake Discord client plus the record of everything it was asked to do
 */
export class FakeDiscord {
  readonly channels = new Map<string, FakeChannel>();
  readonly messageChannels = new Map<string, FakeChannel>();
  readonly allSent: SentMessage[] = [];
  readonly allEdits: EditedMessage[] = [];

  private messageCounter = 0;

  constructor(private readonly guildName = 'Test Guild') {}

  nextMessageId(): string {
    this.messageCounter++;
    return `msg-${this.messageCounter}`;
  }

  channel(id: string): FakeChannel {
    let channel = this.channels.get(id);

    if (!channel) {
      channel = new FakeChannel(id, this);
      this.channels.set(id, channel);
    }

    return channel;
  }

  /**
   * Forget every recorded send and edit, keeping channels and message ids
   */
  reset(): void {
    this.allSent.length = 0;
    this.allEdits.length = 0;

    for (const channel of this.channels.values()) {
      channel.sent.length = 0;
      channel.edits.length = 0;
    }
  }

  asClient(guildId = 'guild-1'): Client {
    const guild = { id: guildId, name: this.guildName };

    return {
      channels: {
        fetch: async (id: string) => this.channels.get(id) ?? this.channel(id),
      },
      guilds: {
        cache: new Map([[guildId, guild]]),
        fetch: async () => guild,
      },
    } as unknown as Client;
  }
}

/**
 * Recorded reply from a faked interaction
 */
export interface RecordedReply {
  kind: 'reply' | 'update' | 'editReply' | 'deferReply' | 'deferUpdate' | 'followUp';
  content?: string;
  ephemeral?: boolean;
  embeds?: unknown[];
  components?: unknown[];
}

/**
 * Shared reply-recording behaviour for faked interactions
 */
class FakeInteractionBase {
  readonly replies: RecordedReply[] = [];
  replied = false;
  deferred = false;

  constructor(
    public readonly customId: string,
    public readonly user: { id: string; username: string },
    public readonly guildId: string,
    public readonly client: Client,
    public readonly channelId = 'channel-1'
  ) {}

  private record(kind: RecordedReply['kind'], payload: any): void {
    this.replies.push({
      kind,
      content: typeof payload === 'string' ? payload : payload?.content,
      ephemeral: payload?.ephemeral,
      embeds: payload?.embeds,
      components: payload?.components,
    });
  }

  async reply(payload: any): Promise<void> {
    this.record('reply', payload);
    this.replied = true;
  }

  async update(payload: any): Promise<void> {
    this.record('update', payload);
    this.replied = true;
  }

  async editReply(payload: any): Promise<void> {
    this.record('editReply', payload);
  }

  async deferReply(payload: any): Promise<void> {
    this.record('deferReply', payload);
    this.deferred = true;
  }

  async deferUpdate(): Promise<void> {
    this.record('deferUpdate', {});
    this.deferred = true;
  }

  async followUp(payload: any): Promise<void> {
    this.record('followUp', payload);
  }

  /**
   * Text of the last reply, for assertions
   */
  lastContent(): string | undefined {
    return this.replies[this.replies.length - 1]?.content;
  }
}

export class FakeButtonInteraction extends FakeInteractionBase {}

export class FakeSelectInteraction extends FakeInteractionBase {
  constructor(
    customId: string,
    user: { id: string; username: string },
    guildId: string,
    client: Client,
    public readonly values: string[]
  ) {
    super(customId, user, guildId, client);
  }
}

/**
 * Build a fake button interaction typed loosely enough for the handlers
 */
export function fakeButton(
  customId: string,
  userId: string,
  username: string,
  client: Client,
  guildId = 'guild-1'
): FakeButtonInteraction {
  return new FakeButtonInteraction(customId, { id: userId, username }, guildId, client);
}

/**
 * Build a fake select-menu interaction
 */
export function fakeSelect(
  customId: string,
  userId: string,
  username: string,
  client: Client,
  values: string[],
  guildId = 'guild-1'
): FakeSelectInteraction {
  return new FakeSelectInteraction(
    customId,
    { id: userId, username },
    guildId,
    client,
    values
  );
}
