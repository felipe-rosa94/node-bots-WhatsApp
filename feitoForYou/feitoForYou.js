const wa = require('@open-wa/wa-automate')
const axios = require('axios')
const fs = require('fs')
const BASE_URL = ''

console.log('Bot Feito For You')

wa.create().then(client => start(client))

wa.ev.on('qr.**', async qrcode => {
    const imageBuffer = Buffer.from(qrcode.replace('data:image/png;base64,', ''), 'base64')
    fs.writeFileSync('feitoForyou.png', imageBuffer)
})

function start(client) {
    client.onMessage(async message => {
        await chat(client, message)
    })
}

let flavors = ['Oreo', 'Morango', 'Danoninho', 'Limão cremoso', 'Ouro branco', 'Napolitano']

const welcome = (pushname) => `👋 Olá! ${pushname},
*Bem vindo ao WhatsApp da Feito For You*
Gostaria do Menu ?\nDigite o número correspondente:\n

1 Sim
2 Não`

const bye = `Ok, até mais`

let chooseOne = () => {
    let s = `*Escolha um ?*\nDigite o número correspondente:\n`
    for (let i = 0; i < flavors.length; i++) {
        s += `\n${(i + 1)} ${flavors[i]}`
    }
    return s
}

let amount = `*Quantos você gostaria ?*`

let IDidNotUnderstand = `*Desculpe, não entendi*`

let completion = `*Deseja finalizar ou pedir mais um ?*\nDigite o número correspondente:

1 Finalizar
2 Pedir`

let confirmation = arrayOrders => {
    let s = `*Confirmar pedido*\nDigite o número correspondente:\n\nVocê pediu:\n`
    arrayOrders.forEach(i => {
        s += `\n${i.flavor}, Qtd: ${i.amount}`
    })
    return s + `\n\n1 Confirmar\n2 Adicionar\n3 Refazer`
}

let choose = (arrayOrders) => {
    let s = ''
    arrayOrders.forEach(i => {
        s += `\n${i.flavor}, Qtd: ${i.amount}`
    })
    return s
}

let phone = from => {
    return from.substring(2, from.length - 5)
}

let viewOrder = arrayOrders => `🥳 *Obrigado por fazer seu pedido*

Dentro de alguns minutos, um dos nossos representantes
vai entrar em contato para combinar a entrega e o pagamento

Você pediu: ${choose(arrayOrders)}

Caso tenha alguma dúvida,
pode entra em contato com Ueliton (51) 9 9133-6555.
    
Desejamos um ótimo dia

_Ass: *Feito For You*_ 😊`

let sendOrder = (arrayOrders, pushname, from) => `*Pedido Recebido*

Nome: ${pushname}

Telefone: ${phone(from)}

Pedido:
${choose(arrayOrders)}`

let warningTimeout = `😭 😢 Seu antigo pedido foi encerrado por inatividade, mas não se preocupe, pode fazer outro`

const chat = async (client, message) => {
    try {
        const {body, from, sender: {pushname}} = message
        const response = await checkConversation(from, client)
        if (!response) {
            await client.sendText(from, welcome(pushname))
            saveConversation(from, body, true)
        } else {
            let {_id, user, conversation, step, order, arrayOrders} = response

            if ((step === 0) && (cleanAccents(body) === '1' || cleanAccents(body) === 'sim')) {

                // /home/felipe/util/node/api-bots/src/bots/feitoForYou/menu.png
                // C:/projects/trunk/node/api/src/bots/feitoForYou/menu.png

                await client.sendImage(from, 'C:/projects/trunk/node/api/src/bots/feitoForYou/menu.png', 'menu.png', '')
                await client.sendText(from, chooseOne())
                saveConversation(user, body, false, conversation, 1, _id)
                return
            } else if ((step === 0) && (cleanAccents(body) === '2' || cleanAccents(body) === 'nao')) {
                await client.sendText(from, bye)
                deleteConversation(user)
                return
            } else if (step === 0) {
                await client.sendText(from, IDidNotUnderstand)
                return
            }

            if (step === 1) {
                let order
                let flavor
                let array = []
                flavors.forEach(i => {
                    array.push(cleanAccents(i))
                })
                let index = array.indexOf(cleanAccents(body))
                if (index !== -1) {
                    flavor = flavors[index]
                } else {
                    if (isNaN(parseInt(body - 1))) {
                        await client.sendText(from, IDidNotUnderstand)
                        return
                    }
                    flavor = flavors[parseInt(body - 1)]
                    if (flavor === undefined) {
                        await client.sendText(from, IDidNotUnderstand)
                        return
                    }
                }
                order = {
                    flavor: flavor
                }
                await client.sendText(from, amount)
                saveConversation(user, body, false, conversation, 2, _id, order, arrayOrders)
                return
            }

            if (step === 2) {
                if (isNaN(body)) {
                    await client.sendText(from, IDidNotUnderstand)
                    return
                }
                order.amount = body
                arrayOrders.push(order)
                await client.sendText(from, completion)
                saveConversation(user, body, false, conversation, 3, _id, order, arrayOrders)
                return
            }

            if (step === 3) {
                if (cleanAccents(body) === '1' || cleanAccents(body) === 'finalizar') {
                    await client.sendText(from, confirmation(arrayOrders))
                    saveConversation(user, body, false, conversation, 4, _id, order, arrayOrders)
                    return
                } else if (cleanAccents(body) === '2' || cleanAccents(body) === 'pedir') {
                    await client.sendText(from, chooseOne())
                    saveConversation(user, body, false, conversation, 1, _id, order, arrayOrders)
                    return
                } else {
                    await client.sendText(from, IDidNotUnderstand)
                    return
                }
            }

            if (step === 4) {
                if (cleanAccents(body) === '1' || cleanAccents(body) === 'confirmar') {
                    await client.sendText(from, viewOrder(arrayOrders))
                    await client.sendText('555193031434@c.us', sendOrder(arrayOrders, pushname, from))
                    saveOrder(arrayOrders, pushname, from)
                    deleteConversation(user)
                } else if (cleanAccents(body) === '2' || cleanAccents(body) === 'adicionar') {
                    await client.sendText(from, chooseOne())
                    saveConversation(user, body, false, conversation, 1, _id, order, arrayOrders)
                } else if (cleanAccents(body) === '3' || cleanAccents(body) === 'refazer') {
                    await client.sendText(from, chooseOne())
                    saveConversation(user, body, false, conversation, 1, _id, null, [])
                }
            }
        }
    } catch (e) {
        console.log(e.message)
    }
}

const saveOrder = (arrayOrders, pushname, from) => {
    let order = {
        name: pushname,
        phone: phone(from),
        dateTime: dateTime(),
        orders: arrayOrders,
        key: key()
    }
    let config = {
        method: 'post',
        url: `${BASE_URL}/mongodb/ordersFeitoForYou/`,
        headers: {
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(order)
    }
    axios(config)
}

const saveConversation = (from, body, firstConversation = false, array = [], step = 0, id = null, order = null, arrayOrders = []) => {
    array.push(body)
    let conversation = {
        user: from,
        expire: expireConversation(),
        conversation: array,
        step: step,
        order: order,
        arrayOrders: arrayOrders
    }
    let config
    if (firstConversation) {
        config = {
            method: 'post',
            url: `${BASE_URL}/mongodb/chatFeitoForYou/`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(conversation)
        }
    } else {
        config = {
            method: 'put',
            url: `${BASE_URL}/mongodb/chatFeitoForYou/?id=${id}`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(conversation)
        }
    }
    axios(config)
}

const deleteConversation = user => {
    let config = {
        method: 'delete',
        url: `${BASE_URL}/mongodb/chatFeitoForYou/?user=${user}`,
        headers: {
            'Content-Type': 'application/json'
        }
    }
    axios(config)
}

const checkConversation = async (from, client) => {
    let config = {
        method: 'get',
        url: `${BASE_URL}/mongodb/chatFeitoForYou/?user=${from}`
    }
    const {data: {returnCode, data}} = await axios(config)
    if (!returnCode) return 'ERRO'
    return (data.length === 0) ? false : checkConversationDate(data, client)
}

const checkConversationDate = async (data, client) => {
    const {user, expire} = data[0]
    if (currentTime() > expire) {
        deleteConversation(user)
        await client.sendText(user, warningTimeout)
        return false
    } else {
        return data[0]
    }
}

const currentTime = () => {
    let date = new Date()
    return date.getTime()
}

const expireConversation = () => {
    let date = new Date()
    date.setMinutes(date.getMinutes() + 2)
    return date.getTime()
}

const dateTime = () => {
    let date = new Date()
    return `${date.getDate()}/${(date.getMonth() + 1)} ${date.getHours()}-${date.getMinutes()}`
}

const key = () => {
    let date = new Date()
    return date.getTime()
}

const cleanAccents = text => {
    text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    text = text.trim()
    return text.toLowerCase()
}
