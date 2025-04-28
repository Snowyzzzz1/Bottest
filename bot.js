
// Full merged bot.js with skill equip included

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const zones = JSON.parse(fs.readFileSync('./data/zones.json', 'utf8'));
const mobs = JSON.parse(fs.readFileSync('./data/mobs.json', 'utf8'));
const items = JSON.parse(fs.readFileSync('./data/items.json', 'utf8'));
const skills = JSON.parse(fs.readFileSync('./data/skills.json', 'utf8'));
const { generateBattleImage } = require('./utils/imageGenerator');

let player = {
  name: "Hero",
  level: 100,
  xp: 0,
  gold: 0,
  baseStats: { atk: 0, hp: 100, crt: 0 },
  currentHP: 100,
  inventory: { "sword_paper": 1, "small_potion_atk": 2 },
  equipment: { weapon: "sword_paper", armor: null, accessory: null },
  skills: ["cyclone", null, null],
  skillCooldowns: [0, 0, 0]
};

function xpToNextLevel(level) {
  return Math.floor(25 * Math.pow(1.25, level - 1));
}

function getEquippedStat(stat) {
  let total = 0;
  for (let slot of ["weapon", "armor", "accessory"]) {
    let id = player.equipment[slot];
    if (id) total += items[id][stat] || 0;
  }
  return total;
}

const statCaps = {
  atk: 1000,
  hp: 1100,
  crt: 100
};

function getTotalStat(stat) {
  const base = player.baseStats[stat] || 0;
  const gear = getEquippedStat(stat);
  const max = statCaps[stat] ?? Infinity;
  return Math.min(base + gear, max);
}

function generateBattleEmbed(mob) {
  return new EmbedBuilder()
    .setTitle(`⚔️ Battle vs ${mob.name}`)
    .setDescription(`**${mob.name} HP:** ${mob.currentHP}/${mob.health}
**Your HP:** ${player.currentHP}/${getTotalStat("hp")}`)
    .setColor(0xe74c3c);
}

function battleActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('battle_action_attack').setLabel('🗡️ Attack').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('battle_action_skill').setLabel('✨ Use Skill').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('battle_action_run').setLabel('🏃 Run').setStyle(ButtonStyle.Secondary)
  );
}

// =========== Skill Equip Functions (Merged In) ===========

function getAvailableSkills(type, level) {
  return Object.entries(skills)
    .filter(([_, s]) => s.type === type && s.level <= level)
    .map(([id, s]) => ({
      label: `${s.name} (Lvl ${s.level})`,
      value: id
    }));
}

function getSkillEmbed(skillId) {
  const skill = skills[skillId];
  return new EmbedBuilder()
    .setTitle(skill.name)
    .setDescription(skill.description)
    .setColor(0x2ecc71)
    .setImage(`attachment://${skillId}.png`);
}

function getSkillSlotRow(playerLevel) {
  const buttons = [
    { id: 0, label: 'Slot 1', req: 1 },
    { id: 1, label: 'Slot 2', req: 20 },
    { id: 2, label: 'Slot 3', req: 120 }
  ].map(btn =>
    new ButtonBuilder()
      .setCustomId(`equip_slot_${btn.id}`)
      .setLabel(btn.label)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(playerLevel < btn.req)
  );

  return new ActionRowBuilder().addComponents(buttons);
}

async function handleSkillEquip(interaction, player) {
  let type = 'attack';

  const updateSkillList = async () => {
    const available = getAvailableSkills(type, player.level);

    if (available.length === 0) {
      const denialEmbed = new EmbedBuilder()
        .setTitle('No Skills Available')
        .setDescription(`You don't have any ${type} skills available at your level.`)
        .setColor(0xff0000)
        .setImage('attachment://denial.png');

      const backButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('back_menu')
          .setLabel('🔙 Back to Menu')
          .setStyle(ButtonStyle.Secondary)
      );

      const denialImage = new AttachmentBuilder('assets/icons/denial.png', { name: 'denial.png' });

      return interaction.update({
        content: `<@${interaction.user.id}>`,
        embeds: [denialEmbed],
        files: [denialImage],
        components: [backButton]
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Skill List - ${type.toUpperCase()} Skills`)
      .setColor(type === 'attack' ? 0xe74c3c : 0x3498db)
      .setDescription('Select a skill to view its details.')
      .setImage(`attachment://${type}.png`);

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_skill')
        .setPlaceholder('Choose a skill...')
        .addOptions(available)
    );

    const switchType = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('switch_skill_type')
        .setLabel(`Switch to ${type === 'attack' ? 'Support' : 'Attack'} Skills`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('back_menu')
        .setLabel('🔙 Back to Menu')
        .setStyle(ButtonStyle.Secondary)
    );

    try {
      await interaction.update({
        content: `<@${interaction.user.id}>`,
        embeds: [embed],
        files: [`assets/skillIcons/${type}.png`],
        components: [menu, switchType]
      });
    } catch (err) {
      console.error("Failed to update interaction (probably expired):", err);
    }
  };

  const collector = interaction.channel.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.customId === 'return_to_skill_menu') {
      await updateSkillList();
    }
    if (i.customId === 'switch_skill_type') {
      type = type === 'attack' ? 'support' : 'attack';
      await updateSkillList();
    }
    if (i.customId === 'select_skill') {
      const skillId = i.values[0];
      const embed = getSkillEmbed(skillId);
      const row = getSkillSlotRow(player.level);

      await i.update({
        content: `<@${interaction.user.id}>`,
        embeds: [embed],
        files: [`assets/skillIcons/${skillId}.png`],
        components: [row]
      });

      const slotCollector = i.channel.createMessageComponentCollector({
        filter: b => b.user.id === interaction.user.id && b.customId.startsWith('equip_slot_'),
        max: 1,
        time: 30000
      });

      slotCollector.on('collect', async b => {
        const slot = parseInt(b.customId.split('_')[2]);
        player.skills[slot] = skillId;

        const confirm = new EmbedBuilder()
          .setTitle(`Equipped ${skills[skillId].name} to Slot ${slot + 1}`)
          .setColor(0x2ecc71)
          .setImage(`attachment://${skillId}.png`);

        const confirmButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('return_to_skill_menu')
            .setLabel('↩️ Back to Skill Menu')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('back_menu')
            .setLabel('🔙 Back to Main Menu')
            .setStyle(ButtonStyle.Secondary)
        );

        await b.update({
          content: `<@${interaction.user.id}>`,
          embeds: [confirm],
          files: [`assets/skillIcons/${skillId}.png`],
          components: [confirmButtons]
        });
      });
    }
  });

  await updateSkillList();
}

// =============== (rest of your bot code continues here) ===============

