/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { Exception } from '@poppinss/utils'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

/**
 * Exception raised when unable to authenticate user session
 */
export class AuthenticationException extends Exception {
  public guard: string
  public redirectTo: string = '/login'

  /**
   * Raise exception with message and redirect url
   */
  constructor (message: string, code: string, redirectTo?: string) {
    super(message, 401, code)
    if (redirectTo) {
      this.redirectTo = redirectTo
    }
  }

  /**
   * Send response as an array of errors
   */
  protected respondWithJson (ctx: HttpContextContract) {
    ctx.response.status(this.status).send({
      errors: [{
        message: this.message,
      }],
    })
  }

  /**
   * Flash error message and redirect the user back
   */
  protected respondWithRedirect (ctx: HttpContextContract) {
    if (!ctx.session) {
      return ctx.response.status(this.status).send(this.message)
    }

    ctx.session.flashExcept(['_csrf'])
    ctx.session.flash('auth', { error: this.message })
    ctx.response.redirect(this.redirectTo, true)
  }

  /**
   * Send response as an array of errors formatted as per JSONAPI spec
   */
  protected respondWithJsonAPI (ctx: HttpContextContract) {
    ctx.response.status(this.status).send({
      errors: [
        {
          code: this.code,
          title: this.message,
          source: null,
        },
      ],
    })
  }

  /**
   * Missing session or unable to lookup user from session
   */
  public static invalidSession (guard: string) {
    const error = new this('Invalid session', 'E_INVALID_AUTH_SESSION')
    error.guard = guard
    return error
  }

  /**
   * Missing/Invalid token or unable to lookup user from the token
   */
  public static invalidToken (guard: string) {
    const error = new this('Invalid API Token', 'E_INVALID_API_TOKEN')
    error.guard = guard
    return error
  }

  /**
   * Self handle exception and attempt to make the best response based
   * upon the type of request
   */
  public async handle (_: AuthenticationException, ctx: HttpContextContract) {
    if (ctx.request.ajax()) {
      this.respondWithJson(ctx)
      return
    }

    switch (ctx.request.accepts(['html', 'application/vnd.api+json', 'json'])) {
      case 'html':
      case null:
        this.respondWithRedirect(ctx)
        break
      case 'json':
        this.respondWithJson(ctx)
        break
      case 'application/vnd.api+json':
        this.respondWithJsonAPI(ctx)
        break
    }
  }
}
