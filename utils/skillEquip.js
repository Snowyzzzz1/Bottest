// utils/handleSkillEquip.js
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const skills = require('../data/skills.json');
const fs = require('fs');

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
    .setColor(0x2ecc71) // green border
    .setImage(`attachment://${skillId}.png`);
}

function getSkillSlotRow(playerLevel) {
  const buttons = [
    { id: 0, label: 'Slot 1', req: 1 },
    { id: 1, label: 'Slot 2', req: 20 },
    { id: 2, label: 'Slot 3', req: 120 }
  ].map(btn => new ButtonBuilder()
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
    embeds: [denialEmbed],
    files: [denialImage],
    components: [backButton]
  });
}


    const embed = new EmbedBuilder()
      .setTitle(`Skill List - ${type.toUpperCase()} Skills`)
      .setColor(type === 'attack' ? 0xe74c3c : 0x3498db)
      .setThumbnail(`attachment://${type}.png`)
      .setDescription('Select a skill to view its details.');

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
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
      content: '',
      embeds: [embed],
      files: [`assets/skillIcons/${type}.png`],
      components: [menu, switchType]
    });
  };

  // Listener
  const collector = interaction.channel.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 60000
  });

  collector.on('collect', async i => {
    if (i.customId === 'switch_skill_type') {
      type = type === 'attack' ? 'support' : 'attack';
      await updateSkillList();
    }

    if (i.customId === 'select_skill') {
      const skillId = i.values[0];
      const embed = getSkillEmbed(skillId);
      const row = getSkillSlotRow(player.level);

      await i.update({
        embeds: [embed],
        files: [`assets/skillsIcons/${skillId}.png`],
        components: [row]
      });

      // Wait for slot equip
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

        await b.update({
          content: '',
          embeds: [confirm],
          files: [`assets/skillsIcons/${skillId}.png`],
          components: []
        });

        // Return to selector
        setTimeout(() => {
          updateSkillList();
        }, 1500);
      });
    }
  });

  await updateSkillList();
}

module.exports = {
  handleSkillEquip
};
