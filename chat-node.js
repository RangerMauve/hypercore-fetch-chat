import Chat from './hypercore-fetch-chat.js'
import makeFetch from 'hypercore-fetch'
import createEventSource from '@rangermauve/fetch-event-source'
import readline from 'readline'
import minimist from 'minimist'

const DEFAULT_HOSTNAME = 'hyper://blog.mauve.moe'
const DEFAULT_USERNAME = 'Anonymous'

// Runs by default
export async function then () {
  const {
    hostname = DEFAULT_HOSTNAME,
    username = DEFAULT_USERNAME
  } = minimist(process.argv.slice(2))

  logSystem(`Connecting to ${hostname} as ${username}`)

  const fetch = await makeFetch({
    persist: false
  })

  const { EventSource } = createEventSource(fetch)

  const chat = new Chat(hostname, {
    fetch,
    EventSource,
    username
  })

  chat.addEventListener('text', onText)
  chat.addEventListener('identity', onIdentity)

  const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  reader.setPrompt('')

  reader.on('close', async () => {
    logSystem('Shutting down')
    await chat.close()
    await fetch.close()
    logSystem('Closed')
  })

  await chat.open()

  logSystem('Connected')

  for await (const line of reader) {
    await chat.sendText(line)
  }

  function onText (e) {
    const { username, fromID, content } = e
    reader.write(null, { ctrl: true, name: 'u' })
    console.log(`${formatUser(username, fromID)}: ${content}`)
  }

  function onIdentity (e) {
    const { username, fromID } = e
    reader.write(null, { ctrl: true, name: 'u' })
    logSystem(`new user ${formatUser(username, fromID)}`)
  }

  function logSystem (message) {
    console.log('SYSTEM:', message)
  }
}

function formatUser (username, fromID) {
  return `${username}@${fromID.slice(0, 8)}`
}
