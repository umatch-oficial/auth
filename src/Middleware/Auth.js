'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const debug = require('debug')('adonis:auth')

class Auth {
  constructor (Config) {
    const authenticator = Config.get('auth.authenticator')
    this.scheme = Config.get(`auth.${authenticator}.scheme`, null)
  }

  /**
   * Authenticate the user using one of the defined
   * schemes or the default scheme
   *
   * @method handle
   *
   * @param  {Object}   options.auth
   * @param  {Function} next
   *
   * @return {void}
   */
  async handle ({ auth, view }, next, schemes) {
    let lastError = null
    schemes = _.castArray(Array.isArray(schemes) && schemes.length ? schemes : this.scheme)

    debug('attempting to authenticate via %j scheme(s)', schemes)

    /**
     * Loop over all the defined schemes and wait until use is logged
     * via anyone
     */
    for (const scheme of schemes) {
      try {
        const authenticator = auth.authenticator(scheme)
        await authenticator.check()

        debug('authenticated using %s scheme', scheme)

        /**
         * Swapping the main authentication instance with the one using which user
         * logged in.
         */
        auth.authenticatorInstance = authenticator

        lastError = null
        break
      } catch (error) {
        debug('authentication failed using %s scheme', scheme)
        lastError = error
      }
    }

    /**
     * If there is an error from all the schemes
     * then throw it back
     */
    if (lastError) {
      throw lastError
    }

    /**
     * For compatibility with the old API
     */
    auth.current = auth.authenticatorInstance

    /**
     * Sharing user with the view
     */
    if (view && typeof (view.share) === 'function') {
      view.share({
        auth: {
          user: auth.current.user
        }
      })
    }

    await next()
  }
}

module.exports = Auth
