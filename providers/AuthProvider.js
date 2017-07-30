'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ServiceProvider } = require('@adonisjs/fold')

class AuthProvider extends ServiceProvider {
  /**
   * Register auth provider under `Adonis/Src/Auth` namespace
   *
   * @method _registerAuth
   *
   * @return {void}
   *
   * @private
   */
  _registerAuth () {
    this.app.bind('Adonis/Src/Auth', () => require('../src/Auth'))
  }

  /**
   * Register auth manager under `Adonis/Src/Auth` namespace
   *
   * @method _registerAuthManager
   *
   * @return {void}
   *
   * @private
   */
  _registerAuthManager () {
    this.app.manager('Adonis/Src/Auth', require('../src/Auth/Manager'))
  }

  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    this._registerAuth()
    this._registerAuthManager()
  }

  /**
   * Attach context getter when all providers have
   * been registered
   *
   * @method boot
   *
   * @return {void}
   */
  boot () {
    const Context = this.app.use('Adonis/Src/Context')
    const Auth = this.app.use('Adonis/Src/Auth')
    const Config = this.app.use('Adonis/Src/Config')

    Context.getter('auth', function () {
      return new Auth({ request: this.request, response: this.response, session: this.session }, Config)
    }, true)
  }
}

module.exports = AuthProvider
