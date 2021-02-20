/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { DateTime } from 'luxon'
import { ProviderTokenContract } from '@ioc:Adonis/Addons/Auth'

/**
 * Token returned and accepted by the token providers
 */
export class ProviderToken implements ProviderTokenContract {
  /**
   * Expiry date
   */
  public expiresAt?: DateTime

  /**
   * All other token details
   */
  public meta?: any

  constructor(
    public name: string,
    public tokenHash: string,
    public userId: string | number,
    public type: string
  ) {}
}
