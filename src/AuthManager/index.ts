/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { Exception } from '@poppinss/utils'
import { IocContract } from '@adonisjs/fold'

import {
  AuthConfig,
  GuardsList,
  ProviderContract,
  SessionGuardConfig,
  LucidProviderConfig,
  AuthManagerContract,
  ExtendGuardCallback,
  DatabaseProviderConfig,
  ExtendProviderCallback,
} from '@ioc:Adonis/Addons/Auth'

import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Auth } from '../Auth'

/**
 * Auth manager to manage guards and providers object. The extend API can
 * be used to add custom guards and providers
 */
export class AuthManager implements AuthManagerContract {
  /**
   * Extended set of providers
   */
  private extendedProviders: Map<string, ExtendProviderCallback> = new Map()

  /**
   * Extend set of guards
   */
  private extendedGuards: Map<string, ExtendGuardCallback> = new Map()

  constructor (private container: IocContract, private config: AuthConfig) {
  }

  /**
   * Verifies and returns an instance of the event emitter
   */
  private getEmitter () {
    const hasEmitter = this.container.hasBinding('Adonis/Core/Event')
    if (!hasEmitter) {
      throw new Exception('"Adonis/Core/Event" is required by the auth provider')
    }

    return this.container.use('Adonis/Core/Event')
  }

  /**
   * Lazily makes an instance of the lucid provider
   */
  private makeLucidProvider (config: LucidProviderConfig<any>) {
    return new (require('../Providers/Lucid').LucidProvider)(this.container, config)
  }

  /**
   * Lazily makes an instance of the database provider
   */
  private makeDatabaseProvider (config: DatabaseProviderConfig) {
    const Database = this.container.use('Adonis/Lucid/Database')
    return new (require('../Providers/Database').DatabaseProvider)(this.container, config, Database)
  }

  /**
   * Returns an instance of the extended provider
   */
  private makeExtendedProvider (config: any) {
    const providerCallback = this.extendedProviders.get(config.driver)
    if (!providerCallback) {
      throw new Exception(`Invalid provider "${config.driver}"`)
    }

    return providerCallback(this.container, config)
  }

  /**
   * Makes instance of a provider based upon the driver value
   */
  private makeProviderInstance (providerConfig: any) {
    if (!providerConfig || !providerConfig.driver) {
      throw new Exception('Invalid auth config, missing "provider" or "provider.driver" property')
    }

    switch (providerConfig.driver) {
      case 'lucid':
        return this.makeLucidProvider(providerConfig)
      case 'database':
        return this.makeDatabaseProvider(providerConfig)
      default:
        return this.makeExtendedProvider(providerConfig)
    }
  }

  /**
   * Returns an instance of the session guard
   */
  private makeSessionGuard (
    mapping: string,
    config: SessionGuardConfig<any>,
    provider: ProviderContract<any>,
    ctx: HttpContextContract,
  ) {
    const { SessionGuard } = require('../Guards/Session')
    return new SessionGuard(mapping, config, this.getEmitter(), provider, ctx)
  }

  /**
   * Returns an instance of the extended guard
   */
  private makeExtendedGuard (
    mapping: string,
    config: any,
    provider: ProviderContract<any>,
    ctx: HttpContextContract,
  ) {
    const guardCallback = this.extendedGuards.get(config.driver)
    if (!guardCallback) {
      throw new Exception(`Invalid guard driver "${config.driver}" property`)
    }

    return guardCallback(this.container, mapping, config, provider, ctx)
  }

  /**
   * Makes guard instance for the defined driver inside the
   * mapping config.
   */
  private makeGuardInstance (
    mapping: string,
    mappingConfig: any,
    provider: ProviderContract<any>,
    ctx: HttpContextContract,
  ) {
    if (!mappingConfig || !mappingConfig.driver) {
      throw new Exception('Invalid auth config, missing "driver" property')
    }

    switch (mappingConfig.driver) {
      case 'session':
        return this.makeSessionGuard(mapping, mappingConfig, provider, ctx)
      default:
        return this.makeExtendedGuard(mapping, mappingConfig, provider, ctx)
    }
  }

  /**
   * Make an instance of a given mapping for the current HTTP request.
   */
  public makeMapping (ctx: HttpContextContract, mapping: keyof GuardsList) {
    const mappingConfig = this.config[mapping]
    const provider = this.makeProviderInstance(mappingConfig.provider)
    return this.makeGuardInstance(mapping, mappingConfig, provider, ctx)
  }

  /**
   * Returns an instance of the auth class for the current request
   */
  public getAuthForRequest (ctx: HttpContextContract) {
    return new Auth(this, ctx)
  }

  /**
   * Extend auth by adding custom providers and guards
   */
  public extend (type: 'provider', name: string, callback: ExtendProviderCallback): void
  public extend (type: 'guard', name: string, callback: ExtendGuardCallback): void
  public extend (
    type: 'provider' | 'guard',
    name: string,
    callback: ExtendProviderCallback | ExtendGuardCallback,
  ) {
    if (type === 'provider') {
      this.extendedProviders.set(name, callback as ExtendProviderCallback)
    }

    if (type === 'guard') {
      this.extendedGuards.set(name, callback as ExtendGuardCallback)
    }
  }
}
