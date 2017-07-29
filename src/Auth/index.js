'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const AuthManager = require('./Manager')
const CE = require('../Exceptions')

/**
 * The proxy handler to proxy all authenticator
 * instance methods
 *
 * @type {Object}
 */
const proxyHandler = {
  get (target, name) {
    /**
     * if node is inspecting then stick to target properties
     */
    if (typeof (name) === 'symbol' || name === 'inspect') {
      return target[name]
    }

    /**
     * if value exists on target, return that
     */
    if (typeof (target[name]) !== 'undefined') {
      return target[name]
    }

    /**
     * Fallback to authenticator instance
     */
    return target.authenticatorInstance[name]
  }
}

/**
 * Auth class is used to set instance of a given
 * authenticator.
 *
 * @class Auth
 * @constructor
 */
class Auth {
  constructor (ctx, Config) {
    this._ctx = ctx
    this.Config = Config
    this.authenticatorInstance = this.authenticator()
    return new Proxy(this, proxyHandler)
  }

  /**
   * Returns an instance of a given scheme with
   * serializer instance
   *
   * @method authenticator
   *
   * @param  {String}      name
   *
   * @return {Scheme}
   */
  authenticator (name) {
    name = name || this.Config.get('auth.authenticator')
    const config = this.Config.get(`auth.${name}`)

    /**
     * Throws exception when config is defined or missing
     */
    if (!config || !_.size(config)) {
      throw CE.RuntimeException.missingConfig(`auth.${name}`)
    }

    /**
     * Throws exception if any of the required config keys are
     * missing
     */
    if (!_.every([config.serializer, config.scheme])) {
      throw CE.RuntimeException.invalidConfig(`auth.${name}`, ['serializer', 'scheme'])
    }

    /**
     * Configuring serializer
     */
    const serializerInstance = AuthManager.getSerializer(config.serializer)
    serializerInstance.setConfig(config)

    /**
     * Configuring scheme
     */
    const schemeInstance = AuthManager.getScheme(config.scheme)
    schemeInstance.setOptions(config, serializerInstance)
    schemeInstance.setCtx(this._ctx)

    return schemeInstance
  }
}

module.exports = Auth
