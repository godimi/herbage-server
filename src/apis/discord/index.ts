import axios from 'axios'

export async function sendMessage(content: string): Promise<void> {
  await axios.post(process.env.DISCORD_WEBHOOK ?? '', {
    content
  })
}
