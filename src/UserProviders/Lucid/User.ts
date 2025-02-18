/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Exception } from '@poppinss/utils'
import { inject } from '@adonisjs/core/build/standalone'
import type { HashContract } from '@ioc:Adonis/Core/Hash'
import type {
  LucidProviderModel,
  ProviderUserContract,
  LucidProviderConfig,
} from '@ioc:Adonis/Addons/Auth'

/**
 * Lucid works a bridge between the provider and the guard
 */
@inject([null, null, 'Adonis/Core/Hash'])
export class LucidUser<User extends LucidProviderModel>
  implements ProviderUserContract<InstanceType<User>>
{
  constructor(
    public user: InstanceType<User> | null,
    private config: LucidProviderConfig<User>,
    private hash: HashContract
  ) {}

  /**
   * Returns the value of the user id
   */
  public getId() {
    return this.user ? this.user[this.config.identifierKey] : null
  }

  /**
   * Verifies the user password
   */
  public async verifyPassword(plainPassword: string): Promise<boolean> {
    if (!this.user) {
      throw new Exception('Cannot "verifyPassword" for non-existing user')
    }

    /**
     * Ensure user has password
     */
    if (!this.user.password) {
      throw new Exception('Auth user object must have a password in order to call "verifyPassword"')
    }

    const hasher = this.config.hashDriver ? this.hash.use(this.config.hashDriver) : this.hash
    return hasher.verify(this.user!.password, plainPassword)
  }

  /**
   * Returns the user remember me token or null
   */
  public getRememberMeToken() {
    return this.user ? this.user.rememberMeToken || null : null
  }

  /**
   * Updates user remember me token
   */
  public setRememberMeToken(token: string) {
    if (!this.user) {
      throw new Exception('Cannot set "rememberMeToken" on non-existing user')
    }
    this.user.rememberMeToken = token
  }
}
