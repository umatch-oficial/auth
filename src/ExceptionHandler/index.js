'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const debug = require('debug')('adonis:auth')

const handlers = {
  session: require('./session'),
  basic: require('./basic')
}

module.exports = function (Exception) {
  /**
   * Handling UserNotFoundException. If there is no scheme specific
   * handler, a plain exception is thrown.
   */
  Exception.handle('UserNotFoundException', async (error, ctx) => {
    debug('binding exception handler for UserNotFoundException')

    const isJSON = ctx.request.accepts(['html', 'json']) === 'json'
    const handler = handlers[ctx.auth.scheme]

    if (handler && typeof (handler.UserNotFoundException) === 'function') {
      debug('found %s handler for UserNotFoundException', ctx.auth.scheme)
      await handler.UserNotFoundException(isJSON, ctx, error)
      return
    }

    ctx.response.status(error.status || 500).send(error)
  })

  /**
   * Handling password mismatch exception. If there is no scheme specific
   * handler, a plain exception is thrown.
   */
  Exception.handle('PasswordMisMatchException', async (error, ctx) => {
    debug('binding exception handler for PasswordMisMatchException')

    const isJSON = ctx.request.accepts(['html', 'json']) === 'json'
    const handler = handlers[ctx.auth.scheme]

    if (handler && typeof (handler.PasswordMisMatchException) === 'function') {
      debug('found %s handler for PasswordMisMatchException', ctx.auth.scheme)
      await handler.PasswordMisMatchException(isJSON, ctx, error)
      return
    }

    ctx.response.status(error.status || 500).send(error)
  })

  /**
   * Handling invalid login exception. If there is no scheme specific
   * handler, a plain exception is thrown.
   */
  Exception.handle('InvalidLoginException', async (error, ctx) => {
    debug('binding exception handler for InvalidLoginException')

    const isJSON = ctx.request.accepts(['html', 'json']) === 'json'
    const handler = handlers[ctx.auth.scheme]

    if (handler && typeof (handler.InvalidLoginException) === 'function') {
      debug('found %s handler for InvalidLoginException', ctx.auth.scheme)
      await handler.InvalidLoginException(isJSON, ctx, error)
      return
    }

    ctx.response.status(error.status || 500).send(error)
  })
}
