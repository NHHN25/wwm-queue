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

  const response = await interaction.reply({
    components: [row1, row2, row3],
    ephemeral: true,
  });

  try {
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 60000,
    });

    let selectedTeam: GuildWarTeam | null = null;
    let selectedRole: PlayerRole | null = null;

    collector.on('collect', async (i) => {
      try {
        if (i.isStringSelectMenu()) {
          if (i.customId === 'gw_team_select') {
            selectedTeam = i.values[0] as GuildWarTeam;
            await i.deferUpdate();
          } else if (i.customId === 'gw_role_select') {
            selectedRole = i.values[0] as PlayerRole;
            await i.deferUpdate();
          }
        } else if (i.isButton()) {
          if (i.customId.startsWith('gw_submit')) {
            if (!selectedTeam || !selectedRole) {
              await i.reply({
                content: '❌ Phải chọn cả team và role / Please select both a team and a role!',
                ephemeral: true,
              });
              return;
            }

            // We have both, process join!
            await handleGuildWarJoinSubmission(i, interaction.message.id, selectedTeam, selectedRole);
            
            // Clean up ephemeral message
            await i.update({
              content: t.success.joinedQueue(ROLE_CONFIGS[selectedRole].displayName),
              components: [],
            });
            
            collector.stop('submitted');
          }
        }
      } catch (err) {
        console.error('Collector error:', err);
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          content: '⏱️ Request timed out.',
          components: [],
        }).catch(err => console.error('Failed to cleanup timed out interaction:', err));
      }
    });

  } catch (err) {
    console.error('Failed to create collector:', err);
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
