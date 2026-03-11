const { Client, GatewayIntentBits } = require("discord.js");
const {
joinVoiceChannel,
createAudioPlayer,
createAudioResource,
VoiceConnectionStatus,
entersState
} = require("@discordjs/voice");

const play = require("play-dl");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GEMINI_KEY = process.env.GEMINI_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildVoiceStates
]
});

let connection;
let player = createAudioPlayer();
let queue = [];
let voiceChannel;

client.once("ready", () => {
console.log(`Bot online: ${client.user.tag}`);
});

function connectVoice(channel) {

voiceChannel = channel;

connection = joinVoiceChannel({
channelId: channel.id,
guildId: channel.guild.id,
adapterCreator: channel.guild.voiceAdapterCreator
});

connection.subscribe(player);

connection.on(VoiceConnectionStatus.Disconnected, async () => {

console.log("Voice disconnect... reconnecting");

try {
await entersState(connection, VoiceConnectionStatus.Signalling, 5000);
await entersState(connection, VoiceConnectionStatus.Connecting, 5000);
} catch {
connectVoice(voiceChannel);
}

});

}

async function playMusic() {

if (queue.length === 0) return;

const url = queue[0];

const stream = await play.stream(url);

const resource = createAudioResource(stream.stream, {
inputType: stream.type
});

player.play(resource);

}

player.on("idle", () => {

queue.shift();
playMusic();

});

async function askAI(text) {

const result = await model.generateContent(text);
const response = await result.response;

return response.text();

}

client.on("messageCreate", async (msg) => {

if (msg.author.bot) return;

if (msg.content === "!join") {

if (!msg.member.voice.channel)
return msg.reply("Masuk voice channel dulu");

connectVoice(msg.member.voice.channel);

msg.reply("Bot masuk voice");

}

if (msg.content.startsWith("!play")) {

const url = msg.content.split(" ")[1];

if (!url) return msg.reply("Masukkan link YouTube");

queue.push(url);

if (queue.length === 1) playMusic();

msg.reply("Ditambahkan ke playlist 🎵");

}

if (msg.content === "!skip") {

player.stop();
msg.reply("Music di skip");

}

if (msg.content === "!queue") {

if (queue.length === 0) return msg.reply("Playlist kosong");

msg.reply(queue.join("\n"));

}

if (msg.content.toLowerCase().includes("bot")) {

const question = msg.content;

const answer = await askAI(question);

msg.reply(answer);

}

});

client.login(DISCORD_TOKEN);
