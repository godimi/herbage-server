/* eslint-disable import/first */

require('dotenv-safe').config()

import { setGlobalOptions } from '@typegoose/typegoose'
setGlobalOptions({
  globalOptions: {
    useNewEnum: true
  }
})

import * as Koa from 'koa'
import * as logger from 'koa-logger'
import * as bodyParser from 'koa-bodyparser'
import * as json from 'koa-json'
import * as mongoose from 'mongoose'
import * as helmet from 'koa-helmet'
import * as cors from '@koa/cors'
import posts from './routes/posts'
import a1p4ca from './routes/a1p4ca'
import verify from './routes/verify'
import rss from './routes/rss'
import conditional = require('koa-conditional-get')
import etag = require('koa-etag')
import Router = require('koa-router')

mongoose
  .connect(process.env.MONGO_HOST || '', {
    useFindAndModify: false,
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true
  })
  .then((): void => console.log('MongoDB connected'))
  .catch((err: Error): void => console.log('Failed to connect MongoDB: ', err))

const app = new Koa()
const router = new Router()

app.use(cors())
app.use(helmet())
app.use(json())
app.use(conditional())
app.use(etag())
app.use(logger())
app.use(bodyParser())

app.use(
  async (ctx, next): Promise<void> => {
    try {
      await next()
      if (ctx.status >= 400) {
        ctx.throw(ctx.status, ctx.message)
      }
    } catch (err) {
      if (err.status) {
        ctx.status = err.status
        ctx.body = {
          error: err.message
        }
      } else {
        ctx.status = 500
        ctx.body = {
          error: 'Internal Server Error'
        }
        console.error(err)
        // TODO log error
      }
    }
  }
)

router.use('/posts', posts.routes(), posts.allowedMethods())
router.use('/a1p4ca', a1p4ca.routes(), a1p4ca.allowedMethods())
router.use('/verify', verify.routes(), verify.allowedMethods())
router.use('/rss', rss.routes(), rss.allowedMethods())

app.use(router.routes()).use(router.allowedMethods())

app.listen(3000, (): void => console.log('Server Starts!'))
