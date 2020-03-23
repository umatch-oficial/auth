/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { DateTime } from 'luxon'
import { Hooks } from '@poppinss/hooks'
import { Exception } from '@poppinss/utils'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import {
  ProviderToken,
  DatabaseProviderUser,
  DatabaseProviderConfig,
  DatabaseProviderContract,
} from '@ioc:Adonis/Addons/Auth'

/**
 * Database provider to lookup users
 */
export class DatabaseProvider implements DatabaseProviderContract<DatabaseProviderUser> {
  /**
   * Hooks reference
   */
  private hooks = new Hooks()

  /**
   * Custom connection or query client
   */
  private connection?: string | QueryClientContract

  /**
   * Token table property names
   */
  private tokenTypeColumn = 'token_type'
  private tokenValueColumn = 'token_value'
  private tokenIsRevokedColumn = 'is_revoked'
  private tokenUserIdColumn = 'user_id'
  private tokenExpiresOnColumn = 'expires_on'

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
   * Returns the query builder instance for the users table
   */
  private getUserQueryBuilder () {
    return this.getQueryClient().from(this.config.usersTable)
  }

  /**
   * Returns the query builder instance for the tokens table
   */
  private getTokensQueryBuilder (value: string, type: string) {
    return this.getQueryClient()
      .from(this.config.tokensTable)
      .where(this.tokenValueColumn, value)
      .where(this.tokenTypeColumn, type)
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
   * Define before hooks. Check interface for exact type information
   */
  public before (event: string, callback: (query: any) => Promise<void>): this {
    this.hooks.add('before', event, callback)
    return this
  }

  /**
   * Define after hooks. Check interface for exact type information
   */
  public after (event: string, callback: (...args: any[]) => Promise<void>): this {
    this.hooks.add('after', event, callback)
    return this
  }

  /**
   * Returns the user row using the primary key
   */
  public async findById (id: string | number) {
    const query = this.getUserQueryBuilder()
    await this.hooks.exec('before', 'findUser', query)

    const user = await query.where(this.config.identifierKey, id).first()
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
  public async findByToken (userId: number | string, token: ProviderToken) {
    const query = this.getUserQueryBuilder()
    await this.hooks.exec('before', 'findUser', query)

    const tokensSubQuery = this
      .getTokensQueryBuilder(token.value, token.type)
      .select(this.tokenUserIdColumn)
      .where(this.tokenIsRevokedColumn, false)
      .where(this.tokenUserIdColumn, userId)
      .where((builder) => {
        builder
          .whereNull(this.tokenExpiresOnColumn)
          .orWhere(this.tokenExpiresOnColumn, '>', DateTime.utc().toSQLDate())
      })
      .limit(1)

    const user = await query.where(this.config.identifierKey, tokensSubQuery).first()
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
    const query = this.getUserQueryBuilder()
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
  public async createToken (user: DatabaseProviderUser, token: ProviderToken) {
    this.ensureUserHasId(user)

    const tokenRow = {
      [this.tokenValueColumn]: token.value,
      [this.tokenTypeColumn]: token.type,
      [this.tokenIsRevokedColumn]: false,
      [this.tokenUserIdColumn]: user[this.config.identifierKey],
      ...(token.expiresOn ? { [this.tokenExpiresOnColumn]: token.expiresOn.toSQLDate() } : {}),
    }

    const insertQuery = this.getQueryClient().table(this.config.tokensTable)
    const [id] = await insertQuery.returning('id').insert(tokenRow)

    await this.hooks.exec('after', 'createToken', user, { id, ...tokenRow })
  }

  /**
   * Revoke token for a given user
   */
  public async revokeToken (user: DatabaseProviderUser, token: ProviderToken) {
    this.ensureUserHasId(user)

    await this
      .getTokensQueryBuilder(token.value, token.type)
      .where(this.tokenUserIdColumn, user[this.config.identifierKey])
      .update({ [this.tokenIsRevokedColumn]: true })

    await this.hooks.exec('after', 'revokeToken', user, token)
  }

  /**
   * Update existing token value and expiry date
   */
  public async updateToken (user: DatabaseProviderUser, oldValue: string, token: ProviderToken) {
    this.ensureUserHasId(user)

    await this
      .getTokensQueryBuilder(oldValue, token.type)
      .where(this.tokenUserIdColumn, user[this.config.identifierKey])
      .update({
        [this.tokenValueColumn]: token.value,
        ...(token.expiresOn ? { [this.tokenExpiresOnColumn]: token.expiresOn.toSQLDate() } : {}),
      })

    await this.hooks.exec('after', 'updateToken', user, oldValue, token)
  }

  /**
   * Purge revoked or expired tokens
   */
  public async purgeTokens (user: DatabaseProviderUser, type: string) {
    this.ensureUserHasId(user)

    await this
      .getQueryClient()
      .from(this.config.tokensTable)
      .where(this.tokenUserIdColumn, user[this.config.identifierKey])
      .where(this.tokenTypeColumn, type)
      .where((builder) => {
        builder
          .where(this.tokenExpiresOnColumn, '<', DateTime.utc().toSQLDate())
          .orWhere(this.tokenIsRevokedColumn, true)
      })
      .del()
  }
}
