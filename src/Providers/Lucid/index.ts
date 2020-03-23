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
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import {
  ProviderToken,
  LucidProviderUser,
  LucidProviderConfig,
  LucidProviderContract,
} from '@ioc:Adonis/Addons/Auth'

/**
 * Lucid provider uses Lucid models to lookup a user.
 */
export class LucidProvider implements LucidProviderContract<LucidProviderUser> {
  private hooks = new Hooks()
  private connection?: string | QueryClientContract

  /**
   * Token model property names
   */
  private tokenTypeColumn = 'type'
  private tokenValueColumn = 'value'
  private tokenIsRevokedColumn = 'isRevoked'
  private userIdColumn = 'userId'
  private expiresOnColumn = 'expires_on'

  constructor (private config: LucidProviderConfig<LucidProviderUser>) {
  }

  /**
   * The models options for constructing
   * a query
   */
  private getModelOptions () {
    if (this.connection) {
      return typeof (this.connection) === 'string'
        ? { connection: this.connection }
        : { client: this.connection }
    }

    return this.config.connection ? { connection: this.config.connection } : {}
  }

  /**
   * Returns query instance for the user model
   */
  private getModelQuery () {
    return this.config.model.query(this.getModelOptions())
  }

  /**
   * Returns query instance for the user tokens
   */
  private getTokensQuery (user: InstanceType<LucidProviderUser>, value: string, type: string) {
    return user
      .related('tokens')
      .query()
      .where(this.tokenValueColumn, value)
      .where(this.tokenTypeColumn, type)
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
  public before (event: 'findUser', callback: (query: any) => Promise<void>): this {
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
   * Returns a user instance using the primary key value
   */
  public async findById (id: string | number) {
    const query = this.getModelQuery()
    await this.hooks.exec('before', 'findUser', query)

    const user = await query.where(this.config.identifierKey, id).first()
    if (!user) {
      return null
    }

    await this.hooks.exec('after', 'findUser', user)
    return user
  }

  /**
   * Returns a user instance using a specific token type and value
   */
  public async findByToken (userId: string | number, { value, type }: ProviderToken) {
    const modelInstance = new this.config.model()

    /**
     * We create an instance of the tokens model by accessing the relatedModel directly, since
     * the actual relationship query builder expects the `user.id` to exists.
     *
     * However, in our case, we do not have the user instance and we instead want to find the user
     * from the token.
     */
    const token = await modelInstance
      .related('tokens').relation
      .relatedModel()
      .query(this.getModelOptions())
      .where(this.userIdColumn, userId)
      .where(this.tokenValueColumn, value)
      .where(this.tokenTypeColumn, type)
      .where(this.tokenIsRevokedColumn, false)
      .where((builder) => {
        builder
          .whereNull(this.expiresOnColumn)
          .orWhere(this.expiresOnColumn, '>', DateTime.utc().toSQLDate())
      })
      .first()

    if (!token) {
      return null
    }

    return this.findById(token.userId)
  }

  /**
   * Returns the user instance by searching the uidValue against
   * their defined uids.
   */
  public async findByUid (uidValue: string) {
    const query = this.config.model.query(this.getModelOptions())
    await this.hooks.exec('before', 'findUser', query)

    this.config.uids.forEach((uid) => (query.orWhere(uid, uidValue)))

    const user = await query.first()
    if (!user) {
      return null
    }

    await this.hooks.exec('after', 'findUser', user)
    return user
  }

  /**
   * Store token for a given user
   */
  public async createToken (user: InstanceType<LucidProviderUser>, token: ProviderToken) {
    const tokenInstance = await user.related('tokens').create({
      [this.tokenValueColumn]: token.value,
      [this.tokenTypeColumn]: token.type,
      [this.tokenIsRevokedColumn]: false,
      ...(token.expiresOn) ? { [this.expiresOnColumn]: token.expiresOn.toSQLDate() } : {},
    })

    await this.hooks.exec('after', 'createToken', user, tokenInstance)
  }

  /**
   * Revoke token for a given user
   */
  public async revokeToken (user: InstanceType<LucidProviderUser>, token: ProviderToken) {
    await this.getTokensQuery(user, token.value, token.type).update({ is_revoked: true })
    await this.hooks.exec('after', 'revokeToken', user, token)
  }

  /**
   * Update token value and expiry for a pre-existing token
   */
  public async updateToken (user: InstanceType<LucidProviderUser>,oldValue: string, token: ProviderToken) {
    await this.getTokensQuery(user, oldValue, token.type)
      .update({
        token_value: token.value,
        ...(token.expiresOn ? { expires_on: token.expiresOn.toSQLDate() } : {}),
      })

    await this.hooks.exec('after', 'updateToken', user, oldValue, token)
  }

  /**
   * Purge expired or revoked tokens for a given user and type.
   */
  public async purgeTokens (user: InstanceType<LucidProviderUser>, type: string) {
    await user.related('tokens')
      .query()
      .where(this.tokenTypeColumn, type)
      .where((builder) => {
        builder
          .where(this.expiresOnColumn, '<', DateTime.utc().toSQLDate())
          .orWhere(this.tokenIsRevokedColumn, true)
      })
      .del()
  }
}
