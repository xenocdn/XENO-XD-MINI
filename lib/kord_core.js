const { cmd, commands } = require('../command');

function kord(info, func) {
    if (!info.cmd) return;
    const patternStr = info.cmd.split('|')[0]; // take the first if it's a regex like "img|image"
    
    cmd({
        pattern: patternStr,
        desc: info.desc || "Imported Kord Command",
        category: info.type || "kord",
        filename: __filename,
        react: info.react || "✅"
    }, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
        const fakeM = {
            send: async (text, options, type) => {
                if (typeof text === "string" && (text.startsWith("http") || text.startsWith("data:"))) {
                    // It might be an image/media
                    if (type === "image" || options?.image) {
                        return conn.sendMessage(from, { image: { url: text }, caption: options?.caption || "" }, { quoted: mek });
                    }
                    if (type === "audio") {
                        return conn.sendMessage(from, { audio: { url: text }, mimetype: 'audio/mpeg' }, { quoted: mek });
                    }
                    if (type === "video") {
                        return conn.sendMessage(from, { video: { url: text }, caption: options?.caption || "" }, { quoted: mek });
                    }
                }
                return conn.sendMessage(from, { text: String(text) }, { quoted: mek });
            },
            sendErr: async (e) => reply("Error: " + String(e)),
            react: async (r) => {
                try {
                    await conn.sendMessage(from, { react: { text: r, key: mek.key } });
                } catch (e) {}
            },
            quoted: m.quoted ? { text: m.quoted.text || m.quoted.caption || m.quoted.body, audio: !!m.quoted.audio, video: !!m.quoted.video } : null,
            client: conn,
            chat: from,
            user: { jid: conn.user.id },
            pushName: pushname,
            axios: require("axios")
        };
        
        try {
            const res = await func(fakeM, q);
            if (res) return res;
        } catch (e) {
            console.log(e);
            reply("Error in Kord command: " + e);
        }
    });
}

const coreDummy = new Proxy({
    kord,
    wtype: false,
    prefix: ".",
    commands: commands
}, {
    get: function(target, prop) {
        if (prop in target) {
            return target[prop];
        }
        return async (...args) => "Function '" + prop + "' is a Kord core function and not fully ported to XENO yet.";
    }
});

module.exports = coreDummy;
