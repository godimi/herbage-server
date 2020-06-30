import axios from 'axios'

export function sendMessage(content: string): void {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  axios.post(process.env.DISCORD_WEBHOOK ?? '', {
    content
  })
}
