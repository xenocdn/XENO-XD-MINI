const { kord, prefix, wtype, config, getData, storeData } = require('../lib/kord_core')
const fs = require("fs")
const path = require("path")
const edb = require("../core/edb")
if (config().MONGODB_URI) {
    edb.connect(config().MONGODB_URI)
}
const stored = path.join(__dirname, '..', 'core', 'store')

const econCheck = async (chat) => {
    const edata = await getData("econ") || []
    return edata.includes(chat)
}

const fmt = (n) => Number(n).toLocaleString('en-US')


kord({
    cmd: "economy|econ",
    desc: "manage economy commands",
    fromMe: wtype,
    type: "economy"
}, async (m, text) => {
    try {
        if (!config().MONGODB_URI) {
            return await m.send("```You need to set MONGODB_URI in your config\nExample: setvar MONGODB_URI=your_mongodb_url```")
        }
        if (config().MONGODB_URI) {
    await edb.connect(config().MONGODB_URI)
    }
        var edata = await getData("econ") || []
        const chat = m.chat
        if (text && text.toLowerCase() === "off") {
            if (!edata.includes(chat)) return await m.send("```💎 Economy is already off here bro```")
            edata = edata.filter(id => id !== chat)
            await storeData("econ", edata)
            return await m.send("```📉 Economy deactivated. Everyone's broke now.```")
        }
        if (edata.includes(chat)) return await m.send("```💎 Economy is already running here!```")
        edata.push(chat)
        await storeData("econ", edata)
        return await m.send("```📈 Economy activated! Time to get rich (or broke trying).```")
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "bal|wallet",
    desc: "[economy] shows user's balance",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here. Use 'economy on' to start.```")
        let targetUser = m.quoted?.sender || m.mentionedJid?.[0] || m.sender
        if (!targetUser) return m.send("```❌ Could not identify a user.```")
        const b = await edb.balance(targetUser, m.chat)
        const name = targetUser === m.sender ? "YOUR" : "TARGET'S"
        const broke = b.wallet + b.bank === 0 ? "\n╠ 😂 Absolutely BROKE" : ""
        const rich = b.wallet + b.bank > 1000000 ? "\n╠ 👑 Millionaire Status!" : ""
        return await m.send(`\`\`\`╔════════════════╗
╠ 💰 ${name} BALANCE   ╣
╠════════════════╝
╠ 💎 Wallet: ₹${fmt(b.wallet)}
╠ 🏦 Bank: ₹${fmt(b.bank)}/₹${fmt(b.bankCapacity)}
╠ 💵 Net Worth: ₹${fmt(b.wallet + b.bank)}${broke}${rich}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "daily",
    desc: "[economy] claim daily coins",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const d = await edb.daily(m.sender, m.chat, 1001)
        if (d.cd) {
            return await m.send(`\`\`\`⭕ Already claimed today! Patience is a virtue 😤
⏱️ Come back in: ${d.cdL}\`\`\``)
        }
        const newBal = await edb.balance(m.sender, m.chat)
        const streakMsg = d.streak >= 7 ? "🔥 You're on FIRE!" : d.streak >= 3 ? "⭐ Keep it up!" : "💪 Good start!"
        return await m.send(`\`\`\`╔════════════════╗
╠ 🎁 DAILY CLAIMED  ╣
╠════════════════╝
╠ 💰 Claimed: ₹${fmt(d.amount)}
╠ 💎 Wallet: ₹${fmt(newBal.wallet)}
╠ 🔥 Streak: ${d.streak} day(s)
╠ ${streakMsg}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "dep|deposit",
    desc: "[economy] deposit money to bank",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        if (!text) return await m.send("```⚠️ Usage: deposit <amount|all>```")
        const amount = text.toLowerCase() === "all" ? "all" : text
        const result = await edb.deposit(m.sender, m.chat, amount)
        if (result.invalid) return await m.send("```❌ That's not a valid amount bro```")
        if (result.noten) return await m.send("```💸 Your wallet's too empty for that!```")
        if (result.full) return await m.send("```🏦 Bank's full! Spend some money first ya hoarder 😂```")
        const newBal = await edb.balance(m.sender, m.chat)
        return await m.send(`\`\`\`╔════════════════╗
╠ 🏦 DEPOSITED!    ╣
╠════════════════╝
╠ 💰 Deposited: ₹${fmt(result.amount)}
╠ 💎 Wallet: ₹${fmt(newBal.wallet)}
╠ 🏦 Bank: ₹${fmt(newBal.bank)}/₹${fmt(newBal.bankCapacity)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "with|withdraw",
    desc: "[economy] withdraw money from bank",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        if (!text) return await m.send("```⚠️ Usage: withdraw <amount|all>```")
        const amount = text.toLowerCase() === "all" ? "all" : text
        const result = await edb.withdraw(m.sender, m.chat, amount)
        if (result.noten) return await m.send("```💸 Not enough in the bank! Did you spend it already?```")
        if (result.invalid) return await m.send("```❌ Invalid amount```")
        const newBal = await edb.balance(m.sender, m.chat)
        return await m.send(`\`\`\`╔════════════════╗
╠ 💸 WITHDRAWN!    ╣
╠════════════════╝
╠ 💰 Withdrawn: ₹${fmt(result.amount)}
╠ 💎 Wallet: ₹${fmt(newBal.wallet)}
╠ 🏦 Bank: ₹${fmt(newBal.bank)}/₹${fmt(newBal.bankCapacity)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "give|pay|transfer",
    desc: "[economy] give money to someone",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        if (!m.quoted && !m.mentions[0]) return await m.send("```⚠️ Reply to or mention someone with an amount```")
        let target = m.quoted ? m.quoted.sender : m.mentions[0]
        let amount = parseInt(text.match(/\d+/))
        if (!target || isNaN(amount) || amount <= 0) return await m.send("```❌ Provide a valid user and amount```")
        if (target === m.sender) return await m.send("```😂 You cannot pay yourself lmao```")
        const result = await edb.transfer(m.sender, target, m.chat, amount)
        if (result.insufficient) return await m.send("```💸 You're too broke for that transaction!```")
        const senderBal = await edb.balance(m.sender, m.chat)
        return await m.send(`\`\`\`╔════════════════╗
╠ 💸 KA-CHING! 💸  ╣
╠════════════════╝
╠ 💰 Sent: ₹${fmt(amount)}
╠ 👤 To: @${target.split("@")[0]}
╠ 💎 Your Balance: ₹${fmt(senderBal.wallet)}
╚════════════════\`\`\``, { mentions: [target] })
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "work",
    desc: "[economy] work to earn money",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const result = await edb.work(m.sender, m.chat)
        if (result.cd) return await m.send(`\`\`\`😴 You're still recovering from work bro
⏱️ Rest for: ${result.cdL}\`\`\``)
        const jobs = [
            { title: "Software Developer", flavor: "Fixed bugs for 8 hours straight ☕" },
            { title: "Food Delivery", flavor: "Dodged 3 dogs and 1 angry uncle 🏍️" },
            { title: "Teacher", flavor: "Survived 40 kids asking dumb questions 📚" },
            { title: "Doctor", flavor: "Told 10 people to drink more water 💊" },
            { title: "Chef", flavor: "Burned the first batch but nailed the second 🍳" },
            { title: "Streamer", flavor: "Got 3 viewers including your mom 🎮" },
            { title: "Security Guard", flavor: "Slept on the job. Still got paid. 💂" },
        ]
        const job = jobs[Math.floor(Math.random() * jobs.length)]
        return await m.send(`\`\`\`╔════════════════╗
╠ 💼 SHIFT DONE!   ╣
╠════════════════╝
╠ 👷 Job: ${job.title}
╠ 📝 ${job.flavor}
╠ 💰 Earned: ₹${fmt(result.amount)}
╠ ⏱️ Cooldown: 1 Hour
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "rob",
    desc: "[economy] attempt to rob someone",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        if (!m.quoted && !m.mentions[0]) return await m.send("```⚠️ Reply to or mention someone to rob```")
        const target = m.quoted ? m.quoted.sender : m.mentions[0]
        if (target === m.sender) return await m.send("```😂 You cannot rob yourself bro that's just sad```")
        const result = await edb.rob(m.sender, m.chat, target)
        if (result.cd) return await m.send(`\`\`\`🚨 Lay low! Police are looking for you
⏱️ Wait: ${result.cdL}\`\`\``)
        if (result.lowbal) return await m.send("```💸 Target is too broke to rob (min ₹500). Pick a richer victim 😂```")
        if (result.success) {
            const escapes = ["Ran through the market", "Disguised as a coconut vendor", "Used a getaway rickshaw", "Jumped on a moving bus"]
            const escape = escapes[Math.floor(Math.random() * escapes.length)]
            return await m.send(`\`\`\`╔════════════════╗
╠ 😈 SUCCESSFUL ROB ╣
╠════════════════╝
╠ 💰 Stolen: ₹${fmt(result.amount)}
╠ 👤 From: @${target.split("@")[0]}
╠ 🏃 ${escape}!
╚════════════════\`\`\``, { mentions: [target] })
        }
        const excuses = ["Tripped on your shoelace", "Sneezed at the wrong time", "Target screamed louder than expected", "Your mask fell off"]
        const excuse = excuses[Math.floor(Math.random() * excuses.length)]
        return await m.send(`\`\`\`╔════════════════╗
╠ 🚨 GOT CAUGHT!   ╣
╠════════════════╝
╠ 💸 Fine: ₹${fmt(result.fine)}
╠ 😬 ${excuse}
╠ 👮 Police said "not today"
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "lb|leaderboard|top",
    desc: "[economy] show richest users",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const count = parseInt(text) || 10
        const topUsers = await edb.lb(m.chat, count)
        if (topUsers.length === 0) return await m.send("```📊 Nobody has any money yet! Use some commands to get started.```")
        let msg = "```╔════════════════╗\n╠ 🏆 RICH LIST      ╣\n╠════════════════╝\n"
        let mentions = []
        topUsers.forEach((user, i) => {
            const medal = ["🥇", "🥈", "🥉"][i] || `${i + 1}.`
            const net = user.wallet + user.bank
            const tag = net > 500000 ? " 👑" : net > 100000 ? " 💎" : ""
            msg += `╠ ${medal} @${user.userID.split("@")[0]}: ₹${fmt(net)}${tag}\n`
            mentions.push(user.userID)
        })
        msg += "╚════════════════```"
        return await m.send(msg, { mentions })
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "rich|richest",
    desc: "[economy] show richest user",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const topUsers = await edb.lb(m.chat, 1)
        if (topUsers.length === 0) return await m.send("```📊 No users in economy yet.```")
        const richest = topUsers[0]
        const total = richest.wallet + richest.bank
        return await m.send(`\`\`\`╔════════════════╗
╠ 👑 TOP BALLER    ╣
╠════════════════╝
╠ 👤 @${richest.userID.split("@")[0]}
╠ 💰 Net Worth: ₹${fmt(total)}
╠ 💎 Wallet: ₹${fmt(richest.wallet)}
╠ 🏦 Bank: ₹${fmt(richest.bank)}
╠ 😤 Unmatched. Untouchable.
╚════════════════\`\`\``, { mentions: [richest.userID] })
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "poor|poorest|broke",
    desc: "[economy] show poorest user",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const allUsers = await edb.getallUsers(m.chat)
        if (allUsers.length === 0) return await m.send("```📊 No users in economy yet.```")
        const poorest = allUsers.sort((a, b) => (a.wallet + a.bank) - (b.wallet + b.bank))[0]
        const total = poorest.wallet + poorest.bank
        const roasts = ["touch grass and get a job", "beg is literally a command", "have you tried working?", "the poverty is real"]
        const roast = roasts[Math.floor(Math.random() * roasts.length)]
        return await m.send(`\`\`\`╔════════════════╗
╠ 💀 MOST BROKE    ╣
╠════════════════╝
╠ 👤 @${poorest.userID.split("@")[0]}
╠ 💰 Net Worth: ₹${fmt(total)}
╠ 💎 Wallet: ₹${fmt(poorest.wallet)}
╠ 🏦 Bank: ₹${fmt(poorest.bank)}
╠ 💬 Someone tell them to ${roast}
╚════════════════\`\`\``, { mentions: [poorest.userID] })
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "shop",
    desc: "[economy] view available items",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const shop = await edb.getShop()
        let msg = "```╔════════════════╗\n╠ 🛒 ITEM SHOP     ╣\n╠════════════════╝\n"
        shop.forEach((item, i) => msg += `╠ ${i + 1}. ${item.name} — ₹${fmt(item.price)}\n╠    📝 ${item.description}\n╠\n`)
        msg += `╚════════════════\`\`\`\n_Use ${prefix}buy <item name or number>_`
        return await m.send(msg)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "buy",
    desc: "[economy] buy items from shop",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        if (!text) return await m.send("```⚠️ Usage: buy <item name or number>```")
        const result = await edb.buyItem(m.sender, m.chat, text)
        if (result.notfound) return await m.send("```❌ That item doesn't exist in the shop bro```")
        if (result.insufficient) return await m.send("```💸 You can't afford that. Go touch some grass and earn more.```")
        return await m.send(`\`\`\`╔════════════════╗
╠ 🛒 PURCHASED!    ╣
╠════════════════╝
╠ 🎁 Item: ${result.item.name}
╠ 💰 Paid: ₹${fmt(result.item.price)}
╠ 💎 Remaining: ₹${fmt(result.newBalance)}
╠ 📦 Check inventory to flex
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "inv|inventory",
    desc: "[economy] view your inventory",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const inv = await edb.getInventory(m.sender, m.chat)
        if (inv.length === 0) return await m.send("```📦 Your inventory is empty. Go buy something!```")
        let msg = "```╔════════════════╗\n╠ 📦 MY STASH      ╣\n╠════════════════╝\n"
        inv.forEach((item, i) => msg += `╠ ${i + 1}. ${item.name} x${item.quantity}\n`)
        msg += "╚════════════════```"
        return await m.send(msg)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "beg",
    desc: "[economy] beg for money",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const result = await edb.beg(m.sender, m.chat)
        if (result.cd) return await m.send(`\`\`\`🙏 You just begged. Have some dignity and wait!
⏱️ Wait: ${result.cdL}\`\`\``)
        if (result.success) {
            const donors = ["A generous uncle", "An old lady with too much kindness", "A businessman feeling guilty", "A random passerby", "Someone who felt bad for you 💀"]
            const donor = donors[Math.floor(Math.random() * donors.length)]
            return await m.send(`\`\`\`╔════════════════╗
╠ 🙏 BEGGING WIN   ╣
╠════════════════╝
╠ 👤 ${donor}
╠ 💰 Tossed you: ₹${fmt(result.amount)}
╠ 😮 Be grateful bro
╚════════════════\`\`\``)
        }
        const rejections = [
            "Someone told you to get a job 💀",
            "A kid laughed at you and walked away",
            "They pretended to be on a call",
            "Got ignored completely. Painful.",
        ]
        return await m.send(`\`\`\`😂 ${rejections[Math.floor(Math.random() * rejections.length)]}
You got nothing. L.\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "crime",
    desc: "[economy] commit a crime",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const result = await edb.crime(m.sender, m.chat, text)
        if (result.cd) return await m.send(`\`\`\`🚨 You're laying low. Cops are watching!
⏱️ Wait: ${result.cdL}\`\`\``)
        if (result.invalidCrime) return await m.send("```❌ Not a valid crime. Try: pickpocket, shoplift, break in, heist```")
        if (result.success) {
            return await m.send(`\`\`\`╔════════════════╗
╠ 😈 CRIME SUCCESS ╣
╠════════════════╝
╠ 🎯 You pulled off: ${result.crimeName}
╠ 💰 Earned: ₹${fmt(result.amount)}
╠ 😎 Slick. Very slick.
╚════════════════\`\`\``)
        }
        return await m.send(`\`\`\`╔════════════════╗
╠ 🚨 CRIME FAILED  ╣
╠════════════════╝
╠ ❌ Tried to: ${result.crimeName}
╠ 👮 Cops said no
╠ 💸 Fine: ₹${fmt(result.fine)}
╠ 🤡 Next time, plan better
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "loan",
    desc: "[economy] take a loan",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        if (!text) return await m.send("```⚠️ Usage: loan <amount>\n💡 Min: ₹1000, Max: ₹50000```")
        const amount = parseInt(text)
        const result = await edb.loan(m.sender, m.chat, amount)
        if (result.tooLow) return await m.send("```❌ Minimum loan is ₹1000. We don't do charity.```")
        if (result.tooHigh) return await m.send("```❌ Max loan is ₹50000. We're not a bank.```")
        if (result.hasLoan) return await m.send(`\`\`\`⭕ Pay off your current loan of ₹${fmt(result.loanAmount)} first!\nUse: payloan <amount>\`\`\``)
        if (result.cd) return await m.send(`\`\`\`⭕ Loan cooldown active\n⏱️ Come back in: ${result.cdL}\`\`\``)
        return await m.send(`\`\`\`╔════════════════╗
╠ 💳 LOAN APPROVED ╣
╠════════════════╝
╠ 💰 You got: ₹${fmt(result.amount)}
╠ 📈 Interest: ${result.interest}%
╠ 💸 You owe: ₹${fmt(result.totalOwed)}
╠ ⚠️ Don't run from your debt
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "payloan",
    desc: "[economy] pay back loan",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        if (!text) return await m.send("```⚠️ Usage: payloan <amount|all>```")
        const result = await edb.payLoan(m.sender, m.chat, text)
        if (result.noLoan) return await m.send("```✅ You have no loan. Clean record! 🎉```")
        if (result.insufficient) return await m.send("```💸 Not enough in wallet to pay that off```")
        if (result.invalid) return await m.send("```❌ Invalid amount```")
        if (result.fullPaid) {
            return await m.send(`\`\`\`╔════════════════╗
╠ ✅ DEBT FREE! 🎉  ╣
╠════════════════╝
╠ 💰 Paid: ₹${fmt(result.amount)}
╠ 🏆 Loan fully cleared!
╠ 😤 No more stress
╚════════════════\`\`\``)
        }
        return await m.send(`\`\`\`╔════════════════╗
╠ 💳 PAYMENT MADE  ╣
╠════════════════╝
╠ 💰 Paid: ₹${fmt(result.amount)}
╠ 💸 Still owe: ₹${fmt(result.remaining)}
╠ 💪 Keep going!
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "slots",
    desc: "[economy] play slot machine",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const bet = parseInt(text)
        if (isNaN(bet) || bet <= 0) return await m.send("```⚠️ Usage: slots <amount>\n💡 Min bet: ₹100```")
        const result = await edb.slots(m.sender, m.chat, bet)
        if (result.invalid) return await m.send("```❌ Minimum bet is ₹100```")
        if (result.insufficient) return await m.send("```💸 Not enough in wallet!```")
        if (result.cd) return await m.send(`\`\`\`⭕ Slots on cooldown\n⏱️ Wait: ${result.cdL}\`\`\``)
        const display = result.result.join("  ")
        const isJackpot = result.result[0] === result.result[1] && result.result[1] === result.result[2]
        const header = isJackpot ? "🎰 JACKPOT!!!! 🎰" : result.winnings >= 0 ? "🎰 YOU WON!" : "🎰 SO CLOSE..."
        const comment = isJackpot ? "UNBELIEVABLE! Screenshot that!" : result.winnings >= 0 ? "Lucky duck! 🍀" : "The house always wins 😈"
        return await m.send(`\`\`\`╔════════════════╗
╠ ${header}  ╣
╠════════════════╝
╠    ${display}
╠ 💰 Bet: ₹${fmt(bet)}
╠ ${result.winnings >= 0 ? '🎉 Won' : '💸 Lost'}: ₹${fmt(Math.abs(result.winnings))}
╠ 💵 Balance: ₹${fmt(result.newBalance)}
╠ ${comment}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "sell",
    desc: "[economy] sell inventory items",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        if (!text) return await m.send("```⚠️ Usage: sell <item name> [quantity]```")
        const args = text.split(" ")
        const quantity = !isNaN(args[args.length - 1]) ? parseInt(args.pop()) : 1
        const itemName = args.join(" ")
        const result = await edb.sellItem(m.sender, m.chat, itemName, quantity)
        if (result.noItems) return await m.send("```📦 Your inventory is empty bro```")
        if (result.notfound) return await m.send("```❌ You don't own that item```")
        if (result.insufficient) return await m.send(`\`\`\`❌ You only have ${result.has} of that. Selling air?\`\`\``)
        return await m.send(`\`\`\`╔════════════════╗
╠ 💰 SOLD!         ╣
╠════════════════╝
╠ 📦 Item: ${result.itemName} x${result.quantity}
╠ 💵 Got: ₹${fmt(result.sellPrice)} (60% value)
╠ 💰 Balance: ₹${fmt(result.newBalance)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "hunt",
    desc: "[economy] go hunting",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const result = await edb.hunt(m.sender, m.chat)
        if (result.cd) return await m.send(`\`\`\`🏹 You need to rest! Even hunters take breaks
⏱️ Come back in: ${result.cdL}\`\`\``)
        const prey = [
            { name: "Rabbit 🐰", desc: "Tiny but sold well" },
            { name: "Wild Deer 🦌", desc: "Impressive catch!" },
            { name: "Boar 🐗", desc: "Almost gored you" },
            { name: "Bear 🐻", desc: "HOW?! That's insane" },
            { name: "Pheasant 🦃", desc: "Classic shot" },
        ]
        const caught = prey[Math.floor(Math.random() * prey.length)]
        return await m.send(`\`\`\`╔════════════════╗
╠ 🏹 HUNT SUCCESS! ╣
╠════════════════╝
╠ 🎯 Caught: ${caught.name}
╠ 📝 ${caught.desc}
╠ 💰 Sold for: ₹${fmt(result.amount)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "mine",
    desc: "[economy] go mining",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const result = await edb.mine(m.sender, m.chat)
        if (result.cd) return await m.send(`\`\`\`⛏️ Your pickaxe is broken. Give it time!
⏱️ Come back in: ${result.cdL}\`\`\``)
        const ores = [
            { name: "Coal ⚫", desc: "Common but it pays" },
            { name: "Iron ⚪", desc: "Solid find" },
            { name: "Gold 🟡", desc: "Now we're talking!" },
            { name: "Diamond 💎", desc: "RARE! Lucky you!" },
            { name: "Emerald 💚", desc: "Ooh shiny" },
        ]
        const found = ores[Math.floor(Math.random() * ores.length)]
        return await m.send(`\`\`\`╔════════════════╗
╠ ⛏️ MINED!        ╣
╠════════════════╝
╠ 💎 Found: ${found.name}
╠ 📝 ${found.desc}
╠ 💰 Sold for: ₹${fmt(result.amount)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "fish",
    desc: "[economy] go fishing",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const result = await edb.fish(m.sender, m.chat)
        if (result.cd) return await m.send(`\`\`\`🎣 The fish aren't biting yet. Be patient!
⏱️ Come back in: ${result.cdL}\`\`\``)
        const catches = [
            { name: "Tiny Fish 🐟", desc: "Better than nothing" },
            { name: "Rare Koi 🐠", desc: "Collector's item!" },
            { name: "Old Boot 👢", desc: "Not exactly dinner..." },
            { name: "Tuna 🐋", desc: "Big haul!" },
            { name: "Trash Bag 🗑️", desc: "You're a hero for cleaning the river" },
        ]
        const caught = catches[Math.floor(Math.random() * catches.length)]
        return await m.send(`\`\`\`╔════════════════╗
╠ 🎣 CAUGHT!       ╣
╠════════════════╝
╠ 🐠 Catch: ${caught.name}
╠ 📝 ${caught.desc}
╠ 💰 Sold for: ₹${fmt(result.amount)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "use",
    desc: "[economy] use an item",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        if (!text) return await m.send("```⚠️ Usage: use <item name>```")
        const result = await edb.useItem(m.sender, m.chat, text)
        if (result.notfound) return await m.send("```❌ You don't have that item in your stash```")
        return await m.send(`\`\`\`╔════════════════╗
╠ ✨ ITEM USED!    ╣
╠════════════════╝
╠ 🎁 Item: ${result.item.name}
╠ ⚡ Effect: ${result.effect}
╠ 📦 Left: ${result.remaining}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "gift",
    desc: "[economy] gift items to someone",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        if (!m.quoted && !m.mentions[0]) return await m.send("```⚠️ Reply to or mention someone to gift them```")
        const target = m.quoted ? m.quoted.sender : m.mentions[0]
        if (target === m.sender) return await m.send("```😂 You can't gift yourself. That's just... sad.```")
        const args = text.replace(/@\d+/g, '').trim().split(" ")
        const quantity = !isNaN(args[args.length - 1]) ? parseInt(args.pop()) : 1
        const itemName = args.join(" ")
        if (!itemName) return await m.send("```❌ What item are you gifting? Specify a name!```")
        const result = await edb.giftItem(m.sender, m.chat, target, itemName, quantity)
        if (result.notfound) return await m.send("```❌ That item isn't in your inventory```")
        if (result.insufficient) return await m.send("```❌ You don't have enough of that item```")
        return await m.send(`\`\`\`╔════════════════╗
╠ 🎁 GIFTED!       ╣
╠════════════════╝
╠ 🎁 Item: ${result.item.name} x${quantity}
╠ 👤 To: @${target.split("@")[0]}
╠ 💝 How generous!
╚════════════════\`\`\``, { mentions: [target] })
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "streak",
    desc: "[economy] check daily streak",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const streak = await edb.getStreak(m.sender, m.chat)
        let status = "🌱 Beginner (just started)"
        if (streak.count >= 30) status = "🏆 Legendary (you live here)"
        else if (streak.count >= 14) status = "💎 Diamond (dedicated)"
        else if (streak.count >= 7) status = "🔥 On Fire (keep it up!)"
        else if (streak.count >= 3) status = "⭐ Rising (getting there)"
        return await m.send(`\`\`\`╔════════════════╗
╠ 📅 STREAK CHECK  ╣
╠════════════════╝
╠ 🔥 Streak: ${streak.count} day(s)
╠ 🏅 Status: ${status}
╠ 💰 Daily Bonus: +${streak.bonus}%
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "gamble",
    desc: "[economy] gamble your money",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const amount = parseInt(text)
        if (!amount) return await m.send("```⚠️ Usage: gamble <amount>```")
        const result = await edb.gamble(m.sender, m.chat, amount)
        if (result.cd) return await m.send(`\`\`\`⭕ Cooldown! Touch some grass before gambling again
⏱️ Wait: ${result.cdL}\`\`\``)
        if (result.invalid) return await m.send("```⚠️ Enter a valid amount bro```")
        if (result.insufficient) return await m.send("```💸 Not enough money. Beg first 🙏```")
        if (result.win) {
            const wins = ["You absolute legend!", "Even you can't believe it", "Did you use cheat codes?"]
            return await m.send(`\`\`\`╔════════════════╗
╠ 🎉 BIG WIN! 🎉   ╣
╠════════════════╝
╠ 💰 Won: ₹${fmt(result.amount)}
╠ 💵 Balance: ₹${fmt(result.newBalance)}
╠ 🍀 ${wins[Math.floor(Math.random() * wins.length)]}
╚════════════════\`\`\``)
        }
        const losses = ["Bro really said hold my wallet 💀", "Maybe stick to begging?", "The casino thanks you 😈"]
        return await m.send(`\`\`\`╔════════════════╗
╠ 😢 L. MASSIVE L. ╣
╠════════════════╝
╠ 💸 Lost: ₹${fmt(result.amount)}
╠ 💵 Balance: ₹${fmt(result.newBalance)}
╠ 😂 ${losses[Math.floor(Math.random() * losses.length)]}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "coinflip",
    desc: "[economy] flip a coin and bet",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const args = text.split(" ")
        if (args.length < 2) return await m.send("```⚠️ Usage: coinflip <heads/tails> <amount>```")
        const choice = args[0].toLowerCase()
        const amount = parseInt(args[1])
        if (!amount) return await m.send("```⚠️ Enter a valid bet amount```")
        const result = await edb.coinflip(m.sender, m.chat, choice, amount)
        if (result.cd) return await m.send(`\`\`\`⭕ Wait before flipping again\n⏱️ Wait: ${result.cdL}\`\`\``)
        if (result.invalidChoice) return await m.send("```⚠️ Choose 'heads' or 'tails' only```")
        if (result.invalid) return await m.send("```⚠️ Enter a valid amount```")
        if (result.insufficient) return await m.send("```💸 Can't afford that bet```")
        const coinEmoji = result.result === 'heads' ? '🪙' : '💿'
        if (result.win) {
            return await m.send(`\`\`\`╔════════════════╗
╠ ${coinEmoji} CORRECT! WINNER ╣
╠════════════════╝
╠ 🎯 Landed: ${result.result.toUpperCase()}
╠ ✅ You picked: ${choice.toUpperCase()}
╠ 💰 Won: ₹${fmt(result.amount)}
╠ 💵 Balance: ₹${fmt(result.newBalance)}
╚════════════════\`\`\``)
        }
        return await m.send(`\`\`\`╔════════════════╗
╠ ${coinEmoji} WRONG! NEXT TIME ╣
╠════════════════╝
╠ 🎯 Landed: ${result.result.toUpperCase()}
╠ ❌ You picked: ${choice.toUpperCase()}
╠ 💸 Lost: ₹${fmt(result.amount)}
╠ 💵 Balance: ₹${fmt(result.newBalance)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

// ─── NEW COMMANDS ───────────────────────────────────────────────────

kord({
    cmd: "networth|nw",
    desc: "[economy] check total net worth",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        let targetUser = m.quoted?.sender || m.mentionedJid?.[0] || m.sender
        const b = await edb.balance(targetUser, m.chat)
        const inv = await edb.getInventory(targetUser, m.chat)
        const invValue = inv.reduce((sum, item) => sum + (item.price * item.quantity * 0.6), 0)
        const total = b.wallet + b.bank + invValue
        const tier = total >= 1000000 ? "👑 Millionaire" : total >= 500000 ? "💎 Elite" : total >= 100000 ? "🔥 Wealthy" : total >= 10000 ? "📈 Doing alright" : "💀 Broke era"
        const isSelf = targetUser === m.sender
        return await m.send(`\`\`\`╔════════════════╗
╠ 💼 NET WORTH     ╣
╠════════════════╝
╠ 💎 Wallet: ₹${fmt(b.wallet)}
╠ 🏦 Bank: ₹${fmt(b.bank)}
╠ 📦 Items: ₹${fmt(Math.floor(invValue))}
╠ 💰 Total: ₹${fmt(Math.floor(total))}
╠ 🏷️ Status: ${tier}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "flip|doubleornothing|don",
    desc: "[economy] double or nothing — 50/50 with all your wallet",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const b = await edb.balance(m.sender, m.chat)
        if (b.wallet <= 0) return await m.send("```💀 You have nothing to bet. Go beg first.```")
        const result = await edb.gamble(m.sender, m.chat, b.wallet)
        if (result.insufficient) return await m.send("```💸 Not enough money!```")
        if (result.win) {
            return await m.send(`\`\`\`╔════════════════╗
╠ 🚀 DOUBLED UP!   ╣
╠════════════════╝
╠ 💰 Started with: ₹${fmt(b.wallet)}
╠ 🎉 Now have: ₹${fmt(result.newBalance)}
╠ 😤 Absolute legend behavior
╚════════════════\`\`\``)
        }
        return await m.send(`\`\`\`╔════════════════╗
╠ 💀 WIPED OUT     ╣
╠════════════════╝
╠ 💸 Lost everything: ₹${fmt(b.wallet)}
╠ 😭 Wallet: ₹${fmt(result.newBalance)}
╠ 🤡 Bro really said YOLO
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "heist",
    desc: "[economy] organize a group heist (reply multiple users)",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const mentions = m.mentionedJid || []
        const crew = [m.sender, ...mentions.filter(u => u !== m.sender)].slice(0, 4)
        if (crew.length < 2) return await m.send("```⚠️ Mention at least 1 partner for the heist!```")
        const targets = ["National Bank 🏦", "Museum 🏛️", "Casino Vault 🎰", "Jewelry Store 💍", "Government Treasury 🏛️"]
        const target = targets[Math.floor(Math.random() * targets.length)]
        const success = Math.random() < (0.3 + crew.length * 0.1)
        const totalLoot = Math.floor(Math.random() * 50000) + 10000
        const perShare = Math.floor(totalLoot / crew.length)
        let memberLines = ""
        let mentionsList = []
        for (const member of crew) {
            const tag = `@${member.split("@")[0]}`
            if (success) {
                await edb.give(member, m.chat, perShare).catch(() => {})
                memberLines += `╠ ${tag}: +₹${fmt(perShare)}\n`
            } else {
                const fine = Math.floor(Math.random() * 1000) + 200
                await edb.deduct(member, m.chat, fine).catch(() => {})
                memberLines += `╠ ${tag}: -₹${fmt(fine)} (caught)\n`
            }
            mentionsList.push(member)
        }
        if (success) {
            return await m.send(`\`\`\`╔════════════════╗
╠ 🎯 HEIST SUCCESS  ╣
╠════════════════╝
╠ 🏴‍☠️ Target: ${target}
╠ 💰 Total Loot: ₹${fmt(totalLoot)}
╠ 👥 Crew Shares:
${memberLines}╚════════════════\`\`\``, { mentions: mentionsList })
        }
        return await m.send(`\`\`\`╔════════════════╗
╠ 🚨 HEIST FAILED   ╣
╠════════════════╝
╠ 🏴‍☠️ Target: ${target}
╠ 👮 Whole crew got caught!
╠ 💸 Fines issued:
${memberLines}╚════════════════\`\`\``, { mentions: mentionsList })
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "blackjack|bj",
    desc: "[economy] play blackjack",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const bet = parseInt(text)
        if (isNaN(bet) || bet < 100) return await m.send("```⚠️ Usage: blackjack <amount>\n💡 Min bet: ₹100```")
        const b = await edb.balance(m.sender, m.chat)
        if (b.wallet < bet) return await m.send("```💸 Not enough in wallet for that bet!```")
        const cards = ['2','3','4','5','6','7','8','9','10','J','Q','K','A']
        const values = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':10,'Q':10,'K':10,'A':11}
        const deal = () => cards[Math.floor(Math.random() * cards.length)]
        const handValue = (hand) => {
            let val = hand.reduce((s, c) => s + values[c], 0)
            let aces = hand.filter(c => c === 'A').length
            while (val > 21 && aces > 0) { val -= 10; aces-- }
            return val
        }
        const playerHand = [deal(), deal()]
        const dealerHand = [deal(), deal()]
        let pVal = handValue(playerHand)
        let dVal = handValue(dealerHand)
        // Simple auto-play: dealer hits until 17+
        while (dVal < 17) { dealerHand.push(deal()); dVal = handValue(dealerHand) }
        const pStr = playerHand.join(' ')
        const dStr = dealerHand.join(' ')
        let outcome, delta
        if (pVal > 21) { outcome = "BUST"; delta = -bet }
        else if (dVal > 21) { outcome = "DEALER BUST — YOU WIN"; delta = bet }
        else if (pVal > dVal) { outcome = "YOU WIN"; delta = bet }
        else if (pVal === dVal) { outcome = "PUSH (TIE)"; delta = 0 }
        else { outcome = "DEALER WINS"; delta = -bet }
        if (delta > 0) await edb.give(m.sender, m.chat, delta)
        else if (delta < 0) await edb.deduct(m.sender, m.chat, Math.abs(delta))
        const newBal = await edb.balance(m.sender, m.chat)
        return await m.send(`\`\`\`╔════════════════╗
╠ 🃏 BLACKJACK     ╣
╠════════════════╝
╠ 🧑 You: ${pStr} (${pVal})
╠ 🤖 Dealer: ${dStr} (${dVal})
╠ 🏁 ${outcome}
╠ ${delta >= 0 ? `💰 Won: ₹${fmt(delta)}` : `💸 Lost: ₹${fmt(Math.abs(delta))}`}
╠ 💵 Balance: ₹${fmt(newBal.wallet)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "dice|roll",
    desc: "[economy] roll dice and bet on the outcome",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const args = (text || "").split(" ")
        const guess = parseInt(args[0])
        const bet = parseInt(args[1])
        if (isNaN(guess) || guess < 1 || guess > 6 || isNaN(bet) || bet < 100) {
            return await m.send("```⚠️ Usage: dice <1-6> <amount>\nGuess the dice roll! Win = 5x your bet\n💡 Min bet: ₹100```")
        }
        const b = await edb.balance(m.sender, m.chat)
        if (b.wallet < bet) return await m.send("```💸 Not enough in wallet!```")
        const rolled = Math.floor(Math.random() * 6) + 1
        const diceFace = ['⚀','⚁','⚂','⚃','⚄','⚅'][rolled - 1]
        const win = rolled === guess
        if (win) {
            const payout = bet * 5
            await edb.give(m.sender, m.chat, payout - bet)
            const nb = await edb.balance(m.sender, m.chat)
            return await m.send(`\`\`\`╔════════════════╗
╠ 🎲 DICE — WIN!   ╣
╠════════════════╝
╠ ${diceFace} Rolled: ${rolled}
╠ ✅ You guessed: ${guess}
╠ 💰 Won: ₹${fmt(payout)} (5x!)
╠ 💵 Balance: ₹${fmt(nb.wallet)}
╚════════════════\`\`\``)
        }
        await edb.deduct(m.sender, m.chat, bet)
        const nb = await edb.balance(m.sender, m.chat)
        return await m.send(`\`\`\`╔════════════════╗
╠ 🎲 DICE — MISS   ╣
╠════════════════╝
╠ ${diceFace} Rolled: ${rolled}
╠ ❌ You guessed: ${guess}
╠ 💸 Lost: ₹${fmt(bet)}
╠ 💵 Balance: ₹${fmt(nb.wallet)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "rps",
    desc: "[economy] rock paper scissors bet",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const args = (text || "").split(" ")
        const choice = args[0]?.toLowerCase()
        const bet = parseInt(args[1])
        const valid = ['rock', 'paper', 'scissors', 'r', 'p', 's']
        const expand = { r: 'rock', p: 'paper', s: 'scissors' }
        const pick = expand[choice] || choice
        if (!valid.includes(choice) || isNaN(bet) || bet < 100) {
            return await m.send("```⚠️ Usage: rps <rock/paper/scissors> <amount>\n💡 Min bet: ₹100```")
        }
        const b = await edb.balance(m.sender, m.chat)
        if (b.wallet < bet) return await m.send("```💸 Not enough in wallet!```")
        const options = ['rock', 'paper', 'scissors']
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' }
        const botPick = options[Math.floor(Math.random() * 3)]
        let result
        if (pick === botPick) result = 'tie'
        else if ((pick === 'rock' && botPick === 'scissors') || (pick === 'paper' && botPick === 'rock') || (pick === 'scissors' && botPick === 'paper')) result = 'win'
        else result = 'lose'
        if (result === 'win') {
            await edb.give(m.sender, m.chat, bet)
            const nb = await edb.balance(m.sender, m.chat)
            return await m.send(`\`\`\`╔════════════════╗
╠ ✊ RPS — YOU WIN  ╣
╠════════════════╝
╠ 🧑 You: ${emojis[pick]} ${pick}
╠ 🤖 Bot: ${emojis[botPick]} ${botPick}
╠ 💰 Won: ₹${fmt(bet)}
╠ 💵 Balance: ₹${fmt(nb.wallet)}
╚════════════════\`\`\``)
        } else if (result === 'tie') {
            const nb = await edb.balance(m.sender, m.chat)
            return await m.send(`\`\`\`╔════════════════╗
╠ ✊ RPS — TIE!    ╣
╠════════════════╝
╠ 🧑 You: ${emojis[pick]} ${pick}
╠ 🤖 Bot: ${emojis[botPick]} ${botPick}
╠ 🤝 No money lost or won
╠ 💵 Balance: ₹${fmt(nb.wallet)}
╚════════════════\`\`\``)
        }
        await edb.deduct(m.sender, m.chat, bet)
        const nb = await edb.balance(m.sender, m.chat)
        return await m.send(`\`\`\`╔════════════════╗
╠ ✊ RPS — YOU LOST ╣
╠════════════════╝
╠ 🧑 You: ${emojis[pick]} ${pick}
╠ 🤖 Bot: ${emojis[botPick]} ${botPick}
╠ 💸 Lost: ₹${fmt(bet)}
╠ 💵 Balance: ₹${fmt(nb.wallet)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "tax",
    desc: "[economy] pay your 'taxes' (forced donation to random rich user)",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const b = await edb.balance(m.sender, m.chat)
        if (b.wallet < 500) return await m.send("```💸 You're too broke to tax. The government doesn't want your ₹12.```")
        const taxRate = 0.1
        const taxed = Math.floor(b.wallet * taxRate)
        const topUsers = await edb.lb(m.chat, 3)
        const recipient = topUsers.find(u => u.userID !== m.sender)
        if (!recipient) {
            await edb.deduct(m.sender, m.chat, taxed)
            return await m.send(`\`\`\`💸 Tax collected: ₹${fmt(taxed)}. The government disappeared with it.\`\`\``)
        }
        await edb.deduct(m.sender, m.chat, taxed)
        await edb.give(recipient.userID, m.chat, taxed)
        return await m.send(`\`\`\`╔════════════════╗
╠ 🏛️ TAX TIME!     ╣
╠════════════════╝
╠ 💸 You paid: ₹${fmt(taxed)} (10%)
╠ 👑 Given to: @${recipient.userID.split("@")[0]}
╠ 😭 The rich get richer
╚════════════════\`\`\``, { mentions: [recipient.userID] })
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "bankrob",
    desc: "[economy] solo bank heist — high risk high reward",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        const result = await edb.crime(m.sender, m.chat, "heist")
        if (result.cd) return await m.send(`\`\`\`🚨 Still cooling down from last crime\n⏱️ Wait: ${result.cdL}\`\`\``)
        const banks = ["SBI 🏦", "Axis Bank 💳", "HDFC Vault 🔐", "RBI Reserve 🏛️"]
        const bank = banks[Math.floor(Math.random() * banks.length)]
        const success = Math.random() < 0.25
        if (success) {
            const loot = Math.floor(Math.random() * 20000) + 5000
            await edb.give(m.sender, m.chat, loot)
            const nb = await edb.balance(m.sender, m.chat)
            return await m.send(`\`\`\`╔════════════════╗
╠ 🏦 BANK ROBBED!  ╣
╠════════════════╝
╠ 🎯 Target: ${bank}
╠ 💰 Looted: ₹${fmt(loot)}
╠ 🏃 Vanished without a trace
╠ 💵 Balance: ₹${fmt(nb.wallet)}
╚════════════════\`\`\``)
        }
        const fine = Math.floor(Math.random() * 5000) + 1000
        await edb.deduct(m.sender, m.chat, fine)
        const nb = await edb.balance(m.sender, m.chat)
        return await m.send(`\`\`\`╔════════════════╗
╠ 🚔 ARRESTED!     ╣
╠════════════════╝
╠ 🎯 Target: ${bank}
╠ 👮 Armed response in 2 mins
╠ 💸 Bail: ₹${fmt(fine)}
╠ 💵 Balance: ₹${fmt(nb.wallet)}
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})

kord({
    cmd: "profile|econprofile",
    desc: "[economy] view full economy profile",
    fromMe: wtype,
    type: "economy",
}, async (m, text) => {
    try {
        if (!await econCheck(m.chat)) return await m.send("```💎 Economy is not active here.```")
        let targetUser = m.quoted?.sender || m.mentionedJid?.[0] || m.sender
        const b = await edb.balance(targetUser, m.chat)
        const streak = await edb.getStreak(targetUser, m.chat)
        const inv = await edb.getInventory(targetUser, m.chat)
        const invValue = Math.floor(inv.reduce((sum, item) => sum + (item.price * item.quantity * 0.6), 0))
        const net = b.wallet + b.bank + invValue
        const tier = net >= 1000000 ? "👑 Millionaire" : net >= 500000 ? "💎 Elite" : net >= 100000 ? "🔥 Wealthy" : net >= 10000 ? "📈 Average" : "💀 Broke"
        const isSelf = targetUser === m.sender
        const label = isSelf ? "MY PROFILE" : `${targetUser.split("@")[0]}'S PROFILE`
        return await m.send(`\`\`\`╔════════════════╗
╠ 👤 ${label}
╠════════════════╝
╠ 💎 Wallet: ₹${fmt(b.wallet)}
╠ 🏦 Bank: ₹${fmt(b.bank)}/${b.bankCapacity}
╠ 📦 Items: ${inv.length} type(s) (~₹${fmt(invValue)})
╠ 💰 Net Worth: ₹${fmt(net)}
╠ 🏷️ Status: ${tier}
╠ 🔥 Daily Streak: ${streak.count} day(s)
╠ 💹 Streak Bonus: +${streak.bonus}%
╚════════════════\`\`\``)
    } catch (e) {
        console.log("cmd error", e)
        return await m.sendErr(e)
    }
})
