/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { Hooks } from '@poppinss/hooks'
import { IocContract } from '@adonisjs/fold'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import {
  LucidProviderModel,
  LucidProviderConfig,
  ProviderUserContract,
  LucidProviderContract,
} from '@ioc:Adonis/Addons/Auth'

import { LucidUser } from './User'

/**
 * Lucid provider uses Lucid models to lookup a users
 */
export class LucidProvider implements LucidProviderContract<LucidProviderModel> {
  /**
   * Hooks reference
   */
  private hooks = new Hooks()

  /**
   * Custom connection or query client
   */
  private connection?: string | QueryClientContract

  constructor (private container: IocContract, private config: LucidProviderConfig<LucidProviderModel>) {
  }

  /**
   * The models options for constructing a query
   */
  private getModelOptions () {
    if (typeof (this.connection) === 'string') {
      return { connection: this.connection }
    }

    if (this.connection) {
      return { client: this.connection }
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
   * Executes the query to find the user, calls the registered hooks
   * and wraps the result inside [[ProviderUserContract]]
   */
  private async findUser (query: ReturnType<LucidProviderModel['query']>) {
    await this.hooks.exec('before', 'findUser', query)

    const user = await query.first()
    if (user) {
      await this.hooks.exec('after', 'findUser', user)
    }

    return this.getUserFor(user)
  }

  /**
   * Returns an instance of the [[ProviderUser]] by wrapping lucid model
   * inside it
   */
  public getUserFor (user: InstanceType<LucidProviderModel> | null) {
    return this.container.make((this.config.user || LucidUser) as any, [user, this.config])
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
    return this.findUser(query.where(this.config.identifierKey, id))
  }

  /**
   * Returns a user instance using a specific token type and value
   */
  public async findByToken (id: string | number, value: string) {
    const query = this.getModelQuery()
    return this.findUser(query.where(this.config.identifierKey, id).where('rememberMeToken', value))
  }

  /**
   * Returns the user instance by searching the uidValue against
   * their defined uids.
   */
  public async findByUid (uidValue: string) {
    const query = this.getModelQuery()
    this.config.uids.forEach((uid) => (query.orWhere(uid, uidValue)))
    return this.findUser(query)
  }

  /**
   * Updates the user remember me token
   */
  public async updateRememberMeToken (
    authenticatable: ProviderUserContract<InstanceType<LucidProviderModel>>,
  ) {
    await authenticatable.user!.save()
  }
}
