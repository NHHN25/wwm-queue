import {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { getGuildTranslations } from '../localization/index.js';
import { ROLE_CONFIGS, TEAM_CONFIGS } from '../utils/constants.js';
import type { GuildWarTeam, PlayerRole } from '../types/index.js';
import { Queue } from '../models/Queue.js';
import { createQueueEmbed, createDisabledButtons } from '../utils/embeds.js';
import { createJoinButtons } from './queueButtons.js';
import { cancelQueueTimer } from '../utils/timerManager.js';
import { StringSelectMenuInteraction } from 'discord.js';

// Cache to store user selections
export const guildWarSelections = new Map<string, { team?: GuildWarTeam; role?: PlayerRole; timestamp: number }>();

export async function handleJoinGuildWarButton(interaction: ButtonInteraction) {
  const guildId = interaction.guildId || '';
  const t = getGuildTranslations(guildId);

  // Create Team Select Menu
  const teamSelect = new StringSelectMenuBuilder()
    .setCustomId('gw_team_select')
    .setPlaceholder(t.guildWar.selectTeamPlaceholder)
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel(t.guildWar.teamJungler)
        .setEmoji(TEAM_CONFIGS.jungler.emoji)
        .setValue('jungler'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.guildWar.teamOffense)
        .setEmoji(TEAM_CONFIGS.offense.emoji)
        .setValue('offense'),
      new StringSelectMenuOptionBuilder()
        .setLabel(t.guildWar.teamDefense)
        .setEmoji(TEAM_CONFIGS.defense.emoji)
        .setValue('defense'),
    ]);

  // Create Role Select Menu
  const roleSelect = new StringSelectMenuBuilder()
    .setCustomId('gw_role_select')
    .setPlaceholder(t.guildWar.selectRolePlaceholder)
    .addOptions([
      new StringSelectMenuOptionBuilder()
        .setLabel(ROLE_CONFIGS.tank.displayName)
        .setEmoji(ROLE_CONFIGS.tank.emoji)
        .setValue('tank'),
      new StringSelectMenuOptionBuilder()
        .setLabel(ROLE_CONFIGS.healer.displayName)
        .setEmoji(ROLE_CONFIGS.healer.emoji)
        .setValue('healer'),
      new StringSelectMenuOptionBuilder()
        .setLabel(ROLE_CONFIGS.dps.displayName)
        .setEmoji(ROLE_CONFIGS.dps.emoji)
        .setValue('dps'),
    ]);

  // Create Submit Button
  const submitButton = new ButtonBuilder()
    .setCustomId(`gw_submit_${interaction.message.id}`) // Storing the main message id
    .setLabel(t.guildWar.submitJoin)
    .setStyle(ButtonStyle.Success);

  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(teamSelect);
  const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(roleSelect);
  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(submitButton);

  // Clear previous selections for the user
  guildWarSelections.set(interaction.user.id, { timestamp: Date.now() });

  await interaction.reply({
    components: [row1, row2, row3],
    ephemeral: true,
  });
}

export async function handleGuildWarSelectMenu(interaction: StringSelectMenuInteraction) {
  let state = guildWarSelections.get(interaction.user.id);
  // If no state exists (bot restarted or cache expired), just create a fresh one
  if (!state) {
    state = { timestamp: Date.now() };
    guildWarSelections.set(interaction.user.id, state);
  }

  if (interaction.customId === 'gw_team_select') {
    state.team = interaction.values[0] as GuildWarTeam;
  } else if (interaction.customId === 'gw_role_select') {
    state.role = interaction.values[0] as PlayerRole;
  }

  await interaction.deferUpdate();
}

export async function handleGuildWarSubmitButton(interaction: ButtonInteraction, messageId: string) {
  const t = getGuildTranslations(interaction.guildId || '');
  const state = guildWarSelections.get(interaction.user.id);

  if (!state || !state.team || !state.role) {
    await interaction.reply({
      content: '❌ Phải chọn cả team và role / Please select both a team and a role!',
      ephemeral: true,
    });
    return;
  }

  // Use the selections
  const { team, role } = state;
  
  // Forward to submission
  await handleGuildWarJoinSubmission(interaction, messageId, team, role);

  // Clear selections
  guildWarSelections.delete(interaction.user.id);
  
  // If the submission didn't reply directly (e.g. success), we clean up the dropdown UI
  if (!interaction.replied && !interaction.deferred) {
    await interaction.update({
      content: t.success.joinedQueue(ROLE_CONFIGS[role].displayName),
      components: [],
    });
  }
}

export async function handleGuildWarJoinSubmission(
  interaction: ButtonInteraction,
  messageId: string,
  team: GuildWarTeam,
  role: PlayerRole
) {
  const guildId = interaction.guildId || '';
  const userId = interaction.user.id;
  const username = interaction.user.username;
  const t = getGuildTranslations(guildId);

  // 1. Load queue
  const queue = Queue.load(messageId);

  if (!queue) {
    await interaction.reply({
      content: t.errors.queueNotFound,
      ephemeral: true,
    });
    return;
  }

  // 2. Add player
  const existingPlayer = queue.getPlayers().find((p) => p.userId === userId);
  let changed = false;
  let statusContent = '';

  if (existingPlayer) {
    if (existingPlayer.role === role && existingPlayer.team === team) {
      statusContent = t.errors.playerAlreadyInQueue;
    } else {
      // Only way to change role/team right now is remove then add
      queue.removePlayer(userId);
      queue.addPlayer(userId, username, role, team);
      changed = true;
    }
  } else {
    // Check if player is in another queue
    if (queue.getUserOtherQueue(userId)) {
       await interaction.reply({
         content: t.errors.playerInAnotherQueue,
         ephemeral: true,
       });
       return;
    }
    
    if (queue.isFull()) {
       await interaction.reply({
         content: t.errors.queueFull,
         ephemeral: true,
       });
       return;
    }

    queue.addPlayer(userId, username, role, team);
    changed = true;
  }

  // Check if we didn't change anything (because player already had exact same parameters and didn't fail earlier)
  if (!changed && statusContent) {
     await interaction.reply({ content: statusContent, ephemeral: true });
     return;
  }
  
  // 3. Update main embed
  const state = queue.getState();
  const guildName = interaction.guild?.name;
  const embed = createQueueEmbed(state, guildName, guildId);

  const channel = await interaction.client.channels.fetch(queue.getChannelId());
  if (channel?.isTextBased()) {
    const mainMessage = await channel.messages.fetch(queue.getMessageId());
    
    // Check if full to handle closing
    if (queue.isFull()) {
      cancelQueueTimer(messageId);
      queue.close();
      
      const closedState = queue.getState();
      const closedEmbed = createQueueEmbed(closedState, guildName, guildId);
      
      await mainMessage.edit({
        embeds: [closedEmbed],
        components: [createDisabledButtons(guildId)],
      });
      
      // We could send a full ping here if needed (via separate function or message send)
    } else {
      await mainMessage.edit({
        embeds: [embed],
        components: [createJoinButtons(queue.getQueueType(), guildId)],
      });
    }
  }
}
