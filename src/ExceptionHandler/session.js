'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const sessionHandler = exports = module.exports = {}

/**
 * UserNotFoundException will flash the request data
 * back with an error message only when request
 * is not json.
 *
 * @method
 *
 * @param  {Boolean} isJSON
 * @param  {Object}  options.request
 * @param  {Object}  options.response
 * @param  {Object}  options.session
 * @param  {Object}  options.auth
 *
 * @return {void}
 */
sessionHandler.UserNotFoundException = async function (isJSON, { request, response, session, auth }) {
  const error = [{ field: auth.uidField, message: `Cannot find user with provided ${auth.uidField}` }]

  if (!isJSON) {
    session.withErrors(error).flashAll()
    await session.commit()
    response.redirect('back')
    return
  }

  response.send(error)
}

/**
 * PasswordMisMatchException will flash the request data
 * back with an error message only when request
 * is not json.
 *
 * @method
 *
 * @param  {Boolean} isJSON
 * @param  {Object}  options.request
 * @param  {Object}  options.response
 * @param  {Object}  options.session
 * @param  {Object}  options.auth
 *
 * @return {void}
 */
sessionHandler.PasswordMisMatchException = async function (isJSON, { request, response, session, auth }) {
  const error = [{ field: auth.passwordField, message: 'Invalid user password' }]

  if (!isJSON) {
    session.withErrors(error).flashExcept([auth.passwordField])
    await session.commit()
    response.redirect('back')
    return
  }

  response.send(error)
}
