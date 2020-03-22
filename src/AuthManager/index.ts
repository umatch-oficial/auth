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
  ProvidersContract,
  AuthenticatorsList,
  LucidProviderConfig,
  SessionDriverConfig,
  AuthManagerContract,
  DatabaseProviderConfig,
  ExtendedProviderCallback,
  ExtendedAuthenticatorCallback,
} from '@ioc:Adonis/Addons/Auth'

import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { Auth } from '../Auth'

/**
 * Auth manager to instantiate authentication driver objects
 */
export class AuthManager implements AuthManagerContract {
  /**
   * Extended set of providers
   */
  private extendedProviders: Map<string, ExtendedProviderCallback> = new Map()

  /**
   * Extend set of authenticators
   */
  private extendAuthenticators: Map<string, ExtendedAuthenticatorCallback> = new Map()

  constructor (private config: AuthConfig, private container: IocContract) {
  }

  /**
   * Makes an instance of lucid provider
   */
  private makeLucidProvider (config: LucidProviderConfig<any>) {
    return new (require('../Providers/Lucid').LucidProvider)(config)
  }

  /**
   * Makes an instance of database provider
   */
  private makeDatabaseProvider (config: DatabaseProviderConfig) {
    const Database = this.container.use('Adonis/Lucid/Database')
    return new (require('../Providers/Database').DatabaseProvider)(config, Database)
  }

  /**
   * Returns an instance of an extended provider
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

    if (providerConfig.driver === 'lucid') {
      return this.makeLucidProvider(providerConfig)
    }

    if (providerConfig.driver === 'database') {
      return this.makeDatabaseProvider(providerConfig)
    }

    return this.makeExtendedProvider(providerConfig)
  }

  /**
   * Returns an instance of the session driver
   */
  private makeSessionDriver (
    mapping: string,
    config: SessionDriverConfig<any>,
    provider: ProvidersContract<any>,
    ctx: HttpContextContract,
  ) {
    const emitter = this.container.use('Adonis/Core/Emitter')
    const appKey = this.container.use('Adonis/Core/Config').get('app.appKey')
    return new (require('../Drivers/Session').SessionDriver)(mapping, config, appKey, emitter, provider, ctx)
  }

  /**
   * Returns an instance of the extended authenticator
   */
  private makeExtendedAuthenticator (
    mapping: string,
    config: any,
    provider: ProvidersContract<any>,
    ctx: HttpContextContract,
  ) {
    const authenticatorCallback = this.extendAuthenticators.get(config.driver)
    if (!authenticatorCallback) {
      throw new Exception(`Invalid authenticator driver "${config.driver}" property`)
    }
    return authenticatorCallback(this.container, mapping, config, ctx, provider)
  }

  /**
   * Makes authenticator instance for the defined driver inside the
   * mapping config.
   */
  private makeAuthenticatorInstance (
    mapping: string,
    mappingConfig: any,
    provider: ProvidersContract<any>,
    ctx: HttpContextContract,
  ) {
    if (!mappingConfig || !mappingConfig.driver) {
      throw new Exception('Invalid auth config, missing "driver" property')
    }

    if (mappingConfig.driver === 'session') {
      return this.makeSessionDriver(mapping, mappingConfig, provider, ctx)
    }

    return this.makeExtendedAuthenticator(mapping, mappingConfig, provider, ctx)
  }

  /**
   * Returns the name of the default mapping
   */
  public getDefaultMappingName () {
    return this.config.authenticator
  }

  /**
   * Make an instance of a given mapping for the current HTTP request.
   */
  public makeMapping (ctx: HttpContextContract, mapping?: keyof AuthenticatorsList) {
    mapping = mapping || this.config.authenticator
    const mappingConfig = this.config.authenticators[mapping]
    const provider = this.makeProviderInstance(mappingConfig.provider)
    return this.makeAuthenticatorInstance(mapping, mappingConfig, provider, ctx)
  }

  /**
   * Returns an instance of the auth class for the current request
   */
  public getAuthForRequest (ctx: HttpContextContract) {
    return new Auth(this, ctx)
  }

  /**
   * Extend auth by adding custom providers and authenticators
   */
  public extend (type: 'provider', name: string, callback: ExtendedProviderCallback): void
  public extend (type: 'authenticator', name: string, callback: ExtendedAuthenticatorCallback): void
  public extend (
    type: 'provider' | 'authenticator',
    name: string,
    callback: ExtendedProviderCallback | ExtendedAuthenticatorCallback,
  ) {
    if (type === 'provider') {
      this.extendedProviders.set(name, callback as ExtendedProviderCallback)
    }

    if (type === 'authenticator') {
      this.extendAuthenticators.set(name, callback as ExtendedAuthenticatorCallback)
    }
  }
}
