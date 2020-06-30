import * as Router from 'koa-router'
import * as createError from 'http-errors'
import axios from 'axios'
import { stringify } from 'querystring'

import Post, { PostStatus, PostPublicFields } from '../../models/Post'
import Verifier from '../../models/Verifier'
import authMiddleware from '../../middlewares/auth'
import validatorMiddleware from '../../middlewares/validator'
import { RequestQuery, NewPost, EditPost } from './types'
import { sendMessage } from '../../apis/discord'
import { generateThumbnail } from '../../tools/thumbGen'

const router = new Router()

router.get(
  '/',
  validatorMiddleware(RequestQuery, { where: 'query' }),
  authMiddleware(),
  async (ctx): Promise<void> => {
    const data = ctx.state.validator.data as RequestQuery
    const isAdmin = ctx.state.isAdmin as boolean

    if (ctx.header.authorization != null && !isAdmin) {
      throw new createError.Unauthorized()
    }

    const posts = await Post.getList(data.count, data.cursor, {
      admin: ctx.state.isAdmin,
      condition: isAdmin
        ? {
            status: data.status
          }
        : undefined
    })
    ctx.status = 200
    ctx.body = {
      posts: isAdmin
        ? posts.map((v): Record<keyof typeof v, unknown> => v.toJSON())
        : posts.map((v): PostPublicFields => v.getPublicFields()),
      cursor:
        posts.length > 0
          ? isAdmin
            ? posts[posts.length - 1].cursorId
            : posts[posts.length - 1].number
          : null,
      hasNext: posts.length === data.count
    }
  }
)

router.get(
  '/:number',
  async (ctx): Promise<void> => {
    const post = await Post.findOne({
      number: ctx.params.number
    })

    if (post == null) throw new createError.NotFound()

    if (post.status !== PostStatus.Accepted) throw new createError.NotFound()

    ctx.status = 200
    ctx.body = post.getPublicFields()
  }
)

router.get(
  '/hash/:hash',
  async (ctx): Promise<void> => {
    const post = await Post.findOne({ hash: ctx.params.hash })

    if (post == null) throw new createError.NotFound()

    ctx.status = 200
    ctx.body = post
  }
)

router.post(
  '/',
  validatorMiddleware(NewPost),
  async (ctx): Promise<void> => {
    const body = ctx.state.validator.data as NewPost

    const { success } = (
      await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        stringify({
          secret: process.env.RECAPTCHA_SECRET,
          response: body.captcha
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      )
    ).data

    if (success == null) {
      throw new createError.UnavailableForLegalReasons() // HTTP 451
    }

    const verifier = await Verifier.findOne({
      _id: Base64.decode(body.verifier.id)
    }).exec()

    if (verifier == null || !verifier.isCorrect(body.verifier.answer)) {
      throw new createError.UnavailableForLegalReasons() // HTTP 451
    }

    const result = await new Post({
      title: body.title,
      content: body.content,
      tag: body.tag
    }).save()

    // https://stackoverflow.com/questions/19199872/best-practice-for-restful-post-response
    ctx.status = 201
    ctx.set('Location', `/api/posts/${result.id as string}`)
    ctx.body = result.getAuthorFields()

    if (body.title !== 'test') {
      await sendMessage('새로운 제보다냥!')
    }
  }
)

router.patch(
  '/:id',
  authMiddleware({ continue: false }),
  validatorMiddleware(EditPost),
  async (ctx): Promise<void> => {
    const body = ctx.state.validator.data as EditPost

    let result

    const post = await Post.findById(ctx.params.id)
    if (post == null) throw new createError.NotFound()

    if (body.status != null) {
      switch (body.status) {
        case PostStatus.Accepted:
          if (post.number != null)
            throw new createError.UnavailableForLegalReasons()
          result = await post.setAccepted()
          await generateThumbnail(result)
          break
        case PostStatus.Rejected:
          if (body.reason == null) throw new createError.BadRequest()
          result = await post.setRejected(body.reason)
          break
        default:
          throw new createError.BadRequest()
      }
    } else {
      if (body.content == null && body.fbLink == null)
        throw new createError.BadRequest()
      result = await post.edit(body.content, body.fbLink)
    }
    ctx.status = 200
    ctx.body = result.toJSON()
  }
)

router.delete(
  '/:arg',
  authMiddleware(),
  async (ctx): Promise<void> => {
    const isAdmin = ctx.state.isAdmin as boolean
    const post = isAdmin
      ? await Post.findById(ctx.params.arg)
      : await Post.findOne({ hash: ctx.params.arg })
    if (post == null) throw new createError.NotFound()

    isAdmin ? await post.remove() : await post.setDeleted()

    if (!isAdmin) await sendMessage('제보 삭제 요청이다냥!')

    ctx.status = 200
  }
)

export default router
