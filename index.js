const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  VoiceConnectionStatus,
  AudioPlayerStatus,
  entersState
} = require("@discordjs/voice");

const play = require("play-dl");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const DISCORD_TOKEN = "";
const GEMINI_KEY = "";
 
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
let voiceChannel;

client.once("ready", () => {
  console.log("Bot online:", client.user.tag);
});

// Fungsi untuk join / reconnect voice tanpa deafen
async function reconnect() {
  if (!voiceChannel) return;

  connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false, // BOT TIDAK DEAFEN
    selfMute: false
  });

  connection.subscribe(player);

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    console.log("Voice disconnect, reconnect...");
    try {
      await entersState(connection, VoiceConnectionStatus.Signalling, 5000);
      await entersState(connection, VoiceConnectionStatus.Connecting, 5000);
    } catch {
      reconnect();
    }
  });
}

// Fungsi AI
async function askAI(text) {
  const result = await model.generateContent(text);
  const response = await result.response;
  return response.text();
}

// Event message
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.content === "!join") {
    if (!msg.member.voice.channel) return msg.reply("Masuk voice channel dulu");

    voiceChannel = msg.member.voice.channel;
    reconnect();
    msg.reply("Bot masuk voice");
  }

  if (msg.content.startsWith("!play")) {
    const url = msg.content.split(" ")[1];
    if (!url) return msg.reply("Masukkan link YouTube");

    const stream = await play.stream(url);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });
    player.play(resource);
    msg.reply("Memutar musik 🎵");
  }

  if (msg.content.toLowerCase().includes("bot")) {
    const question = msg.content;
    const answer = await askAI(question);
    msg.reply(answer);
  }
});

// Event player
player.on(AudioPlayerStatus.Idle, () => {
  console.log("Music selesai");
});

client.login(DISCORD_TOKEN);