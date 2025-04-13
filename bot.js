const { Client, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const zones = JSON.parse(fs.readFileSync('./data/zones.json', 'utf8'));
const mobs = JSON.parse(fs.readFileSync('./data/mobs.json', 'utf8'));
const items = JSON.parse(fs.readFileSync('./data/items.json', 'utf8'));

const { generateBattleImage } = require('./utils/imageGenerator');
const { AttachmentBuilder } = require('discord.js');

let player = {
  name: "Hero",
  level: 1,
  xp: 0,
  gold: 0,
  baseStats: { atk: 0, hp: 100, crt: 0 },
  currentHP: 100,
  inventory: { "sword_paper": 1, "small_potion_atk": 2 },
  equipment: { weapon: "sword_paper", armor: null, accessory: null },
  skills: [null, null, null],
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
    .setDescription(`**${mob.name} HP:** ${mob.currentHP}/${mob.health}\n**Your HP:** ${player.currentHP}/${getTotalStat("hp")}`)
    .setColor(0xe74c3c);
}

function battleActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('battle_action_attack').setLabel('🗡️ Attack').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('battle_action_skill').setLabel('✨ Use Skill').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('battle_action_run').setLabel('🏃 Run').setStyle(ButtonStyle.Secondary)
  );
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.content === '!start') {
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Welcome to Mini RPG SIM!')
      .setDescription(`**Welcome, <@${message.author.id}>!** This is an RPG experience inside Discord!\nThis game is inspired by **RPG Simulator** from Roblox.\nFight monsters, complete raids, collect pets, find runes, and explore more in updates.\n\nUse the button below to begin your journey!`)
      .setColor(0x00AE86)
      .setImage('https://media.discordapp.net/attachments/1361072957039841330/1361073013889433660/Screenshot_20250413_170948_Roblox.png?format=webp&quality=lossless&width=1063&height=684')
      .setFooter({ text: 'Prepare for battle!' });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('start_zones').setLabel('⚔️ Start Adventure').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('quit_game').setLabel('❌ Quit Game').setStyle(ButtonStyle.Danger)
    );

    await message.reply({ content: `<@${message.author.id}>`, embeds: [embed], components: [buttons] });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

  if (interaction.customId === 'start_zones') {
    const zoneOptions = Object.entries(zones).map(([name, zone]) => ({
      label: `${name} (${zone.levelReq}-${zone.maxLevel})`,
      value: name
    }));

    const embed = new EmbedBuilder()
      .setTitle('🌍 Zone Selector')
      .setDescription('Select a zone to enter!')
      .setImage("https://media.discordapp.net/attachments/1361072957039841330/1361077087124984050/image.png?format=webp&quality=lossless")
      .setColor(0xf1c40f);

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_zone')
        .setPlaceholder('Choose a zone...')
        .addOptions(zoneOptions)
    );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('back_menu').setLabel('🔙 Back to Menu').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('quit_game').setLabel('❌ Quit Game').setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [selectMenu, backButton]
    });
  }

  if (interaction.customId === 'select_zone') {
    const zoneName = interaction.values[0];
    const zone = zones[zoneName];

    const embed = new EmbedBuilder()
      .setTitle(`🌍 Entering ${zoneName}`)
      .setDescription(`**Level Range:** ${zone.levelReq} - ${zone.maxLevel}\n**Mobs:** ${zone.mobs.join(', ')}\n**Boss:** ${zone.boss}`)
      .setImage(zone.image)
      .setColor(0x3498db);

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('start_zones').setLabel('🔙 Back to Zone List').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('quit_game').setLabel('❌ Quit Game').setStyle(ButtonStyle.Danger)
    );

    const fightButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`fight_mob_${zoneName}`).setLabel('🧟 Fight Zone Mob').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`fight_boss_${zoneName}`).setLabel('🐉 Fight Zone Boss').setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [backButton, fightButtons]
    });
  }

  if (interaction.customId === 'back_menu') {
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Welcome to Mini RPG SIM!')
      .setDescription(`**Welcome, <@${interaction.user.id}>!** This is an RPG experience inside Discord!\nThis game is inspired by **RPG Simulator** from Roblox.\nFight monsters, complete raids, collect pets, find runes, and explore more in updates.\n\nUse the button below to begin your journey!`)
      .setColor(0x00AE86)
      .setImage('https://media.discordapp.net/attachments/1361072957039841330/1361073013889433660/Screenshot_20250413_170948_Roblox.png?format=webp&quality=lossless&width=1063&height=684')
      .setFooter({ text: 'Prepare for battle!' });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('start_zones').setLabel('⚔️ Start Adventure').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('quit_game').setLabel('❌ Quit Game').setStyle(ButtonStyle.Danger)
    );

    await interaction.update({
      content: `<@${interaction.user.id}>`,
      embeds: [embed],
      components: [buttons]
    });
  }

  if (interaction.customId === 'quit_game') {
    await interaction.update({
      content: `<@${interaction.user.id}> Your game session has ended. See you next time!`,
      embeds: [],
      components: []
    });
  }

  if (interaction.customId.startsWith('fight_mob_') || interaction.customId.startsWith('fight_boss_')) {
    const isBoss = interaction.customId.startsWith('fight_boss_');
    const zoneName = interaction.customId.split('_').slice(2).join('_');
    const zone = zones[zoneName];
    const mobData = isBoss ? mobs[zone.boss] : mobs[zone.mobs[Math.floor(Math.random() * zone.mobs.length)]];
    const mob = JSON.parse(JSON.stringify(mobData));
    mob.currentHP = mob.health;
    player.currentHP = getTotalStat("hp");

    const imgPath = await generateBattleImage(mob, zoneName);
    const attachment = new AttachmentBuilder(imgPath);
    await interaction.update({
     content: `⚔️ Battling ${mob.name}!`,
     embeds: [generateBattleEmbed(mob)],
     files: [attachment],
     components: [battleActionRow()]
    });
    
    client.battles = client.battles || {};
    client.battles[interaction.user.id] = { mob, zoneName, vuln: 0 };
  }

  if (interaction.customId.startsWith('battle_action_')) {
    const action = interaction.customId.split('_')[2];
    const battle = client.battles?.[interaction.user.id];
    if (!battle) return interaction.reply({ content: "No battle in progress!", ephemeral: true });

    const { mob, zoneName } = battle;

    if (action === 'attack') {
      let atk = getTotalStat("atk");
      if (battle.vuln > 0) atk = Math.floor(atk * 1.5);
      const crt = getTotalStat("crt");
      const crit = Math.random() * 100 < crt * 0.5;
      const dmg = crit ? atk * 3 : atk;

      mob.currentHP -= dmg;
      player.currentHP -= mob.damage;

      battle.vuln = Math.max(0, battle.vuln - 1);
      player.skillCooldowns = player.skillCooldowns.map(cd => cd > 0 ? cd - 1 : 0);

      let log = `You ${crit ? "**critically**" : ""} hit ${mob.name} for **${dmg}**!\n`;
      log += `${mob.name} hit you for **${mob.damage}**!`;

      if (mob.currentHP <= 0) {
        log += `\n🎉 You defeated ${mob.name}!`;
        delete client.battles[interaction.user.id];
        return interaction.update({
          content: log,
          embeds: [],
          components: []
        });
      }

      if (player.currentHP <= 0) {
        log += `\n💀 You were defeated by ${mob.name}.`;
        delete client.battles[interaction.user.id];
        return interaction.update({
          content: log,
          embeds: [],
          components: []
        });
      }

      await interaction.update({
        content: log,
        embeds: [generateBattleEmbed(mob)],
        components: [battleActionRow()]
      });
    }
  }
});

client.login(process.env.TOKEN);
