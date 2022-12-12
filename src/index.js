console.log("Loading...");
const { autoRoles, roleMenus } = require("../config.json");
const {
		Message, GatewayIntentBits, Client, User, Guild, GuildMember, GuildChannel, TextChannel, ChannelType, GuildBasedChannel,
		ButtonBuilder, ActionRowBuilder, ButtonStyle
	} = require("discord.js");
const client = new Client({ intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent ] });
require("dotenv").config();
async function updateAutoRole(g) {
	try {
		if (!g) return;
		await g.fetch();
		if (g.partial) return;
		for (let i in autoRoles) {
			if (autoRoles[i].guildID == g.guild.id) {
				let has = g.roles.cache.has(autoRoles[i].roleID);
				if (g.pending || g.user.bot) {
					if (has)
						await g.roles.remove(autoRoles[i].roleID);
				} else {
					if (!has)
						await g.roles.add(autoRoles[i].roleID);
				}
			}
		}
	} catch (err) {
		console.error(err);
	}
}
function convertComponents(e) {
	if (e.length > 25) throw "max of 25 components";
	if (e.length <= 0) return [];
	let rows = [];
	while (e.length > 0) {
		let components = e.splice(0, 5);
		rows.push(new ActionRowBuilder().addComponents(components));
	}
	return rows;
}
client.once("ready", async () => {
	console.log("Ready!", client.user.tag, client.user.id);
	for (let i in roleMenus) {
		try {
			let guild = await client.guilds.fetch(roleMenus[i].guildID);
			let channel = await guild.channels.fetch(roleMenus[i].channelID);
			if (channel.type == 0) {
				let buttons = await Promise.all(roleMenus[i].roles.map(async e => {
					let role = await guild.roles.fetch(e.id);
					let b = new ButtonBuilder().setCustomId("rm" + roleMenus[i].id + "_" + role.id).setStyle(e.style).setLabel(role.name);
					if (e.emoji) b = b.setEmoji(e.emoji);
					return b;
				}));
				await Promise.all((await channel.messages.fetch({ limit: 10 })).filter(m => m.deletable && m.author.id == client.user.id).map(async e => e.delete()));
				await channel.send({
					...roleMenus[i].message,
					components: convertComponents(buttons)
				});
			} else {
				console.error(channel.id, "is not a text channel");
			}
		} catch (err) {
			console.error(err);
		}
	}
	client.on("interactionCreate", async (i) => {
		try {
			if (i.user.bot || !i.guild || !i.member) return;
			if (i.isButton()) {
				let id = i.customId;
				if (!id.startsWith("rm")) return;
				for (let j in roleMenus) {
					let r = roleMenus[j];
					if (r.guildID != i.guild.id) continue;
					let pre = "rm" + r.id + "_";
					if (!id.startsWith(pre)) continue;
					let c = false;
					let roleID = id.substring(pre.length);
					let text = "";
					for (let k in r.roles) {
						if (r.roles[k].id == roleID) {
							c = true;
							if (!r.onlyOne) break;
						} else if (r.onlyOne) {
							if (i.member.roles.cache.has(r.roles[k].id)) {
								await i.member.roles.remove(r.roles[k].id);
								text += `Removed <@&${r.roles[k].id}> role\n`;
							}
						}
					}
					if (!c) break;
					let has = i.member.roles.cache.has(roleID);
					await i.member.roles[has ? "remove" : "add"](roleID);
					text += `${(has ? "Removed" : "Added")} <@&${roleID}> role`;
					await i.reply({
						ephemeral: true,
						content: text,
						allowedMentions: {
							users: [],
							roles: [],
							repliedUser: false
						}
					});
					break;
				}
			}
		} catch (err) {
			console.error(err);
		}
	});
	client.on("guildMemberAdd", async (g) => {
		await updateAutoRole(g);
	});
	client.on("guildMemberUpdate", async (gOld, g) => {
		await updateAutoRole(g);
	});
});
client.login(process.env.TOKEN);
console.log("Logging in...");
