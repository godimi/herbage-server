import { Context } from 'koa'
import * as createError from 'http-errors'
import * as jwt from 'jsonwebtoken'

/**
 * if options.continue is true, even if client isn't an admin,
 * it will just call next function with accessable ctx.isAdmin to recognize whether client is an admin.
 *
 * @param options
 */
export default function authMiddleware(
  options: { continue: boolean } = { continue: true }
): (ctx: Context, next: () => Promise<unknown>) => Promise<void> {
  return async (ctx: Context, next: () => Promise<unknown>): Promise<void> => {
    if (ctx.header.authorization == null) {
      if (options.continue) {
        ctx.state.isAdmin = false
        await next()
        return
      } else throw new createError.Unauthorized()
    }
    try {
      jwt.verify(
        ctx.header.authorization.replace('Bearer ', ''),
        process.env.JWT_SECRET ?? 'secret'
      )
      ctx.state.isAdmin = true
    } catch (err) {
      ctx.state.isAdmin = false
    }

    const isAdmin = ctx.state.isAdmin as boolean

    if (!isAdmin && !options.continue) throw new createError.Unauthorized()

    await next()
  }
}
