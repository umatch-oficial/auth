/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { inject } from '@adonisjs/fold'
import { Exception } from '@poppinss/utils'
import { HashContract } from '@ioc:Adonis/Core/Hash'
import { DatabaseProviderUser, AuthenticatableContract, DatabaseProviderConfig } from '@ioc:Adonis/Addons/Auth'

/**
 * Authenticatable works a bridge between the provider and the authenticator
 */
@inject([null, null, 'Adonis/Core/Hash'])
export class Authenticatable implements AuthenticatableContract<DatabaseProviderUser> {
  /**
   * The primary key identifier
   */
  public static identifierKey () {
    return 'id'
  }

  constructor (
    public user: DatabaseProviderUser | null,
    private config: DatabaseProviderConfig,
    private hash: HashContract,
  ) {
  }

  /**
   * Returns the value of the user id
   */
  public getId () {
    return this.user ? this.user[this.config.identifierKey] : null
  }

  /**
   * Verifies the user password
   */
  public async verifyPassword (plainPassword: string): Promise<boolean> {
    const hasher = this.config.hashDriver ? this.hash.use(this.config.hashDriver) : this.hash
    return hasher.verify(this.user!.password, plainPassword)
  }

  /**
   * Returns the user remember me token or null
   */
  public getRememberMeToken () {
    return this.user ? (this.user.remember_me_token || null) : null
  }

  /**
   * Updates user remember me token
   */
  public setRememberMeToken (token: string) {
    if (!this.user) {
      throw new Exception('Cannot set "rememberMeToken" on non-existing user')
    }
    this.user.remember_me_token = token
  }
}
