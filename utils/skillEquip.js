const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const skills = JSON.parse(fs.readFileSync('./data/skills.json', 'utf8'));

function getSkillList(type, playerLevel) {
  return Object.entries(skills)
    .filter(([id, skill]) => skill.type === type && playerLevel >= skill.level)
    .map(([id, skill]) => ({
      label: `${skill.name} (Lvl ${skill.level})`,
      value: id
    }));
}

function createSkillEmbed(skillId) {
  const skill = skills[skillId];
  const embed = new EmbedBuilder()
    .setTitle(skill.name)
    .setDescription(skill.description)
    .setColor(skill.type === 'attack' ? 0xe74c3c : 0x3498db)
    .setImage(`attachment://${skillId}.png`)
    .setFooter({ text: `Cooldown: ${skill.cooldown} | Takes Turn: ${skill.takesTurn ? "Yes" : "No"}` });

  return embed;
}

async function handleSkillEquip(interaction, player) {
  let currentType = 'attack';

  const sendSkillTypeMenu = async () => {
    const embed = new EmbedBuilder()
      .setTitle('Choose Skill Type')
      .setColor(currentType === 'attack' ? 0xe74c3c : 0x3498db)
      .setImage(`attachment://${currentType}.png`)
      .setDescription('Select the type of skill you want to equip.');

    const typeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('type_attack').setLabel('Attack').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('type_support').setLabel('Support').setStyle(ButtonStyle.Primary)
    );

    const skillOptions = getSkillList(currentType, player.level);

    const skillSelect = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_skill')
        .setPlaceholder('Choose a skill')
        .addOptions(skillOptions)
    );

    await interaction.update({
      content: '',
      embeds: [embed],
      files: [new AttachmentBuilder(`./assets/skillsIcons/${currentType}.png`)],
      components: [skillSelect, typeRow]
    });
  };

  const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

  collector.on('collect', async btn => {
    if (btn.customId === 'type_attack') {
      currentType = 'attack';
      await sendSkillTypeMenu();
    } else if (btn.customId === 'type_support') {
      currentType = 'support';
      await sendSkillTypeMenu();
    }
  });

  const skillCollector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60_000 });

  skillCollector.on('collect', async select => {
    const skillId = select.values[0];
    const skill = skills[skillId];
    const embed = createSkillEmbed(skillId);

    const equipRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`equip_slot_0_${skillId}`)
        .setLabel('Slot 1')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`equip_slot_1_${skillId}`)
        .setLabel('Slot 2')
        .setStyle(player.level >= 20 ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(player.level < 20),
      new ButtonBuilder()
        .setCustomId(`equip_slot_2_${skillId}`)
        .setLabel('Slot 3')
        .setStyle(player.level >= 120 ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(player.level < 120)
    );

    await select.update({
      content: '',
      embeds: [embed],
      files: [new AttachmentBuilder(`./assets/skillsIcons/${skillId}.png`)],
      components: [equipRow]
    });
  });

  const equipCollector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

  equipCollector.on('collect', async btn => {
    const [_, __, slotIndex, skillId] = btn.customId.split('_');
    const index = parseInt(slotIndex);

    if ((index === 1 && player.level < 20) || (index === 2 && player.level < 120)) {
      return btn.reply({ content: "You don't meet the level requirement for this slot.", ephemeral: true });
    }

    player.skills[index] = skillId;

    await btn.update({
      content: `✅ Equipped **${skills[skillId].name}** to Slot ${index + 1}!`,
      embeds: [],
      files: [],
      components: []
    });
  });

  await sendSkillTypeMenu();
}

module.exports = { handleSkillEquip };
