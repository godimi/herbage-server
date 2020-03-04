import * as RSS from 'rss'
import Post, { PostPublicFields } from '../../models/Post'
import Router = require('koa-router')

const router = new Router()

router.get(
  '/',
  async (ctx): Promise<void> => {
    const feed = new RSS({
      title: '디대숲',
      description: '한국디지털미디어고등학교 대나무숲',
      pubDate: new Date(),
      feed_url: 'https://api.bamboo.dimigo.dev/rss',
      site_url: 'https://bamboo.dimigo.dev'
    })

    const posts = await Post.getList()
    const recentPosts = posts.map(
      (post): PostPublicFields => post.getPublicFields()
    )
    recentPosts.forEach((post): void => {
      const paragraphs = post.content
        .split('\n')
        .map((v): string => (v ? `<p>${replaceLtGt(v)}</p>` : ''))
      let content = ''
      paragraphs.forEach((p): void => {
        content += p
      })
      const publishedDate = new Date(post.createdAt)
      feed.item({
        title: post.title || '',
        url: `https://bamboo.dimigo.dev/post/${post.number}`,
        description: post.tag,
        date: publishedDate,
        guid: post.id.toString(),
        custom_elements: [
          { link: `https://bamboo.dimigo.dev/post/${post.number}` },
          {
            'content:encoded': `
            <!doctype html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta property="op:version" content="1.0.1" />
              </head>
              <body>
                <article>
                  <header>
                    <h1>#${post.number}번째코드</h1>
                    ${post.title ? `<h2>${replaceLtGt(post.title)}</h2>` : ''}
                    <h3 class="op-kicker">${post.tag}</h3>
                    <figure><img src="https://i.postimg.cc/wBJRKDty/bamboocover.jpg" /></figure>
                    <time class="op-published" datetime=${publishedDate.toISOString()}>
                      ${timeText(publishedDate)}
                    </time>
                  </header>
                  ${content}
                </article>
              </body>
            </html>`
          }
        ]
      })
    })
    ctx.type = 'text/xml'
    ctx.status = 200
    ctx.body = feed.xml()
  }
)

const replaceLtGt = (text: string): string => {
  return text.replace('<', '&lt;').replace('>', '&gt;')
}

const timeText = (date: Date): string => {
  let hours = date.getUTCHours() + 9
  if (hours > 23) hours -= 24
  let text = `${date.getFullYear()}년 ${date.getMonth()}월 ${date.getDate()}일 `
  if (hours < 6) text += '새벽'
  else if (hours < 11) text += '아침'
  else if (hours < 14) text += '점심'
  else if (hours < 15) text += '오후'
  else if (hours < 20) text += '저녁'
  else if (hours < 24) text += '밤'
  return text
}

export default router
