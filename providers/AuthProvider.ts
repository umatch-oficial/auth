/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Auth provider to register the auth binding
 */
export default class AuthProvider {
  constructor(protected application: ApplicationContract) {}
  public static needsApplication = true

  /**
   * Register auth binding
   */
  public register() {
    this.application.container.singleton('Adonis/Addons/Auth', () => {
      const authConfig = this.application.container
        .resolveBinding('Adonis/Core/Config')
        .get('auth', {})
      const { AuthManager } = require('../src/AuthManager')
      return new AuthManager(this.application, authConfig)
    })
  }

  /**
   * Sharing the auth object with HTTP context
   */
  protected registerAuthWithHttpContext() {
    this.application.container.withBindings(
      ['Adonis/Core/HttpContext', 'Adonis/Addons/Auth'],
      (HttpContext, Auth) => {
        HttpContext.getter(
          'auth',
          function auth() {
            return Auth.getAuthForRequest(this)
          },
          true
        )
      }
    )
  }

  /**
   * Sharing auth with all the templates
   */
  protected shareAuthWithViews() {
    this.application.container.withBindings(
      ['Adonis/Core/Server', 'Adonis/Core/View'],
      (Server) => {
        Server.hooks.before(async (ctx) => {
          ctx['view'].share({ auth: ctx.auth })
        })
      }
    )
  }

  /**
   * Register test bindings
   */
  protected registerTestBindings() {
    this.application.container.withBindings(
      ['Japa/Preset/ApiRequest', 'Japa/Preset/ApiClient', 'Adonis/Addons/Auth'],
      (ApiRequest, ApiClient, Auth) => {
        const { defineTestsBindings } = require('../src/Bindings/Tests')
        return defineTestsBindings(ApiRequest, ApiClient, Auth)
      }
    )
  }

  /**
   * Hook into boot to register auth macro
   */
  public async boot() {
    this.registerAuthWithHttpContext()
    this.shareAuthWithViews()
    this.registerTestBindings()
  }
}
