import * as RSS from 'rss'
import Post, { PostPublicFields } from '../../models/Post'
import Router = require('koa-router')

const router = new Router()

const feed = new RSS({
  title: '디대숲',
  description: '한국디지털미디어고등학교 대나무숲',
  pubDate: new Date(),
  feed_url: 'https://api.bamboo.dimigo.dev/rss',
  site_url: 'https://bamboo.dimigo.dev'
})

router.get(
  '/',
  async (ctx): Promise<void> => {
    const posts = await Post.getList()
    const recentPosts = posts.map(
      (post): PostPublicFields => post.getPublicFields()
    )
    // .filter(
    //   (post): boolean =>
    //     post.createdAt > new Date().getTime() - 60 * 60 * 1000
    // )
    recentPosts.forEach((post): void => {
      feed.item({
        title: post.title || '',
        url: `https://bamboo.dimigo.dev/post/${post.number}`,
        description: post.tag,
        date: new Date(post.createdAt + 9 * 60 * 60 * 1000),
        guid: post.id.toString(),
        custom_elements: [
          { link: `https://bamboo.dimigo.dev/post/${post.number}` },
          {
            'content:encoded': `<!doctype html><html><head><meta charset="utf-8"></head><body><article><header><h1>#${
              post.number
            }번째코드</h1><h2>${post.title || ''}</h2><h3 class="op-kicker">${
              post.tag
            }</h3></header><p>${post.content}</p></article></body></html>`
          }
        ]
      })
    })
    ctx.type = 'text/xml'
    ctx.status = 200
    ctx.body = feed.xml()
  }
)

export default router
