/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { Hooks } from '@poppinss/hooks'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import {
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
   * Returns a user instance using the primary key value
   */
  public async findById (id: string | number) {
    const query = this.config.model.query(this.getModelOptions())
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
  public async findByToken (userId: string | number, value: string, type: string) {
    const modelInstance = new this.config.model()

    /**
     * We create an instance of the tokens model by accessing the relatedModel directly, since
     * the actual relationship query builder expects the `user.id` to exists.
     *
     * However, in our case, we do not have the user id and we instead want to find the user
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
  public async createToken (user: InstanceType<LucidProviderUser>, value: string, type: string) {
    const token = await user.related('tokens').create({
      [this.tokenValueColumn]: value,
      [this.tokenTypeColumn]: type,
      [this.tokenIsRevokedColumn]: false,
    })

    await this.hooks.exec('after', 'createToken', user, token)
  }

  /**
   * Revoke token for a given user
   */
  public async revokeToken (user: InstanceType<LucidProviderUser>, value: string, type: string) {
    await user.related('tokens')
      .query()
      .where(this.tokenValueColumn, value)
      .where(this.tokenTypeColumn, type)
      .update({ is_revoked: true })

    await this.hooks.exec('after', 'revokeToken', user, value, type)
  }
}
