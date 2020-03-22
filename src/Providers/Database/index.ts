/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { Hooks } from '@poppinss/hooks'
import { inject } from '@adonisjs/fold'
import { Exception } from '@poppinss/utils'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import {
  DatabaseProviderUser,
  DatabaseProviderConfig,
  DatabaseProviderContract,
} from '@ioc:Adonis/Addons/Auth'

/**
 * Database provider to lookup users
 */
@inject([null, 'Adonis/Lucid/Database'])
export class DatabaseProvider implements DatabaseProviderContract<DatabaseProviderUser> {
  /**
   * Hooks reference
   */
  private hooks = new Hooks()

  /**
   * Custom connection or query client
   */
  private connection?: string | QueryClientContract

  constructor (private config: DatabaseProviderConfig, private db: DatabaseContract) {
  }

  /**
   * Returns the query client for invoking queries
   */
  private getQueryClient () {
    if (this.connection) {
      return typeof (this.connection) === 'string'
        ? this.db.connection(this.connection)
        : this.connection
    }

    return this.db.connection(this.config.connection)
  }

  /**
   * Ensure "user.id" is always present
   */
  private ensureUserHasId (user: any): asserts user is DatabaseProviderUser {
    if (!user[this.config.identifierKey]) {
      throw new Exception(
        `Auth database provider expects "${this.config.usersTable}.${this.config.identifierKey}" to always exist`,
      )
    }
  }

  /**
   * Define custom connection
   */
  public setConnection (connection: string | QueryClientContract): this {
    this.connection = connection
    return this
  }

    /**
   * Define before hooks
   */
  public before (event: 'findUser', callback: (query: any) => Promise<void>): this {
    this.hooks.add('before', event, callback)
    return this
  }

  /**
   * Define after hooks
   */
  public after (
    event: 'findUser' | 'createToken' | 'revokeToken',
    callback: (user: any, value: any, type?: any) => Promise<void>,
  ): this {
    this.hooks.add('after', event, callback)
    return this
  }

  /**
   * Returns the user row using the primary key
   */
  public async findById (id: string | number) {
    const query = this.getQueryClient().query()
    await this.hooks.exec('before', 'findUser', query)

    const user = await query
      .from(this.config.usersTable)
      .where(this.config.identifierKey, id)
      .first()

    if (!user) {
      return null
    }

    this.ensureUserHasId(user)
    await this.hooks.exec('after', 'findUser', user)
    return user
  }

  /**
   * Returns a user row using a specific token type and value
   */
  public async findByToken (userId: number | string, value: string, type: string) {
    const tokensSubQuery = this.db
      .query()
      .select('user_id')
      .from(this.config.tokensTable)
      .where('token_value', value)
      .where('token_type', type)
      .where('is_revoked', false)
      .where('user_id', userId)
      .limit(1)

    const query = this.getQueryClient().query()
    await this.hooks.exec('before', 'findUser', query)

    const user = await query
      .from(this.config.usersTable)
      .where(this.config.identifierKey, tokensSubQuery)
      .first()

    if (!user) {
      return null
    }

    this.ensureUserHasId(user)
    await this.hooks.exec('after', 'findUser', user)
    return user
  }

  /**
   * Returns the user row by searching the uidValue against
   * their defined uids.
   */
  public async findByUid (uidValue: string) {
    const query = this.getQueryClient().query().from(this.config.usersTable)
    await this.hooks.exec('before', 'findUser', query)

    this.config.uids.forEach((uid) => query.orWhere(uid, uidValue))
    const user = await query.first()
    if (!user) {
      return null
    }

    this.ensureUserHasId(user)
    await this.hooks.exec('after', 'findUser', user)
    return user
  }

  /**
   * Store token for a given user
   */
  public async createToken (user: DatabaseProviderUser, value: string, type: string) {
    this.ensureUserHasId(user)

    const tokenRow = {
      token_value: value,
      token_type: type,
      is_revoked: false,
      user_id: user[this.config.identifierKey],
    }

    const [id] = await this
      .getQueryClient()
      .table(this.config.tokensTable)
      .returning('id')
      .insert(tokenRow)

    await this.hooks.exec('after', 'createToken', user, { id, ...tokenRow })
  }

  /**
   * Revoke token for a given user
   */
  public async revokeToken (user: DatabaseProviderUser, value: string, type: string) {
    this.ensureUserHasId(user)

    await this
      .getQueryClient()
      .query()
      .select('user_id')
      .from(this.config.tokensTable)
      .where('token_value', value)
      .where('token_type', type)
      .where('user_id', user[this.config.identifierKey])
      .update({ is_revoked: true })

    await this.hooks.exec('after', 'revokeToken', user, value, type)
  }
}
