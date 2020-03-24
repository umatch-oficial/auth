/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { IocContract } from '@adonisjs/fold'
import { HttpContextConstructorContract } from '@ioc:Adonis/Core/HttpContext'
import { AuthManager } from '../src/AuthManager'

/**
 * Auth provider to register the auth binding
 */
export default class AuthProvider {
  constructor (protected container: IocContract) {
  }

  /**
   * Register auth binding
   */
  public register () {
    this.container.singleton('Adonis/Addons/AuthManager', () => {
      const authConfig = this.container.use('Adonis/Core/Config').get('auth')
      return new AuthManager(this.container, authConfig)
    })

    /**
     * The main binding which returns the provider users that others can
     * extend to define their own.
     */
    this.container.singleton('Adonis/Addons/Auth', () => {
      return {
        LucidUser: require('../src/Providers/Lucid/User').LucidUser,
        DatabaseUser: require('../src/Providers/Database/User').DatabaseUser,
      }
    })
  }

  /**
   * Hook into boot to register auth macro
   */
  public async boot () {
    this.container.with(
      ['Adonis/Core/HttpContext', 'Adonis/Addons/AuthManager'],
      (HttpContext: HttpContextConstructorContract, Auth: AuthManager) => {
        HttpContext.getter('auth', function auth () {
          return Auth.getAuthForRequest(this)
        }, true)
      },
    )
  }
}
