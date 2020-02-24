import axios from 'axios'

export function sendMessage(content: string): void {
  axios.post(process.env.DISCORD_WEBHOOK || '', {
    content
  })
}
