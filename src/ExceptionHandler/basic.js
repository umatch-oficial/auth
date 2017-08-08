'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const basicAuthHandler = exports = module.exports = {}

/**
 * When a user is not found in basic auth, we show them
 * basic auth prompt to re-enter the credentails and
 * return json error when response expects json
 *
 * @method
 *
 * @param  {Boolean} isJSON
 * @param  {Object}  ctx.request
 * @param  {Object}  ctx.auth
 *
 * @return {void}
 */
basicAuthHandler.UserNotFoundException = async function (isJSON, { response, auth }) {
  response.status(401)

  if (!isJSON) {
    response.setHeader('WWW-Authenticate', 'Basic realm="example"')
    response.send('Access denied')
    return
  }

  const error = [{ field: auth.uidField, message: `Cannot find user with provided ${auth.uidField}` }]
  response.send(error)
}

/**
 * Password mismatch exception the same way as
 * the UserNotFoundException unless it's a
 * JSON request.
 *
 * @method
 *
 * @param  {Boolean} isJSON
 * @param  {Object}  ctx.response
 * @param  {Object}  ctx.auth
 *
 * @return {void}
 */
basicAuthHandler.PasswordMisMatchException = async function (isJSON, { response, auth }) {
  response.status(401)

  if (!isJSON) {
    response.setHeader('WWW-Authenticate', 'Basic realm="example"')
    response.send('Access denied')
    return
  }

  const error = [{ field: auth.passwordField, message: 'Invalid user password' }]
  response.send(error)
}

/**
 * InvalidLoginException the same way as the
 * UserNotFoundException unless it's a
 * JSON request.
 *
 * @method
 *
 * @param  {Boolean} isJSON
 * @param  {Object}  ctx.response
 * @param  {Object}  ctx.auth
 *
 * @return {void}
 */
basicAuthHandler.InvalidLoginException = async function (isJSON, { response, auth }) {
  response.status(401)

  if (!isJSON) {
    response.setHeader('WWW-Authenticate', 'Basic realm="example"')
    response.send('Access denied')
    return
  }

  const error = [{ field: 'null', message: 'Basic auth header is missing' }]
  response.send(error)
}
