'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const proxyHandler = require('./proxyHandler')
const Authenticators = require('../Authenticators')
const Serializers = require('../Serializers')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:auth')
const NE = require('node-exceptions')
const Ioc = require('adonis-fold').Ioc
require('harmony-reflect')

class AuthManager {

  constructor (name, config, request, response) {
    this.config = config
    this.request = request
    this.response = response
    this.authenticatorInstance = this._getAuthenticator(name)
    return new Proxy(this, proxyHandler)
  }

  /**
   * returns an instance of authenticator with a
   * given serializer
   *
   * @param  {String}          name
   * @return {Object}
   *
   * @private
   */
  _getAuthenticator (name) {
    name = this._makeAuthenticatorName(name)
    const config = this.config.get(name)
    if (!config) {
      throw new NE.DomainException(`Cannot find authenticator for ${name}.`)
    }
    const serializer = this._getSerializer(config.serializer)
    logger.verbose('making instance of %s authenticator', name)
    return this._makeAuthenticator(config.scheme, serializer, config.options)
  }

  /**
   * returns configuration for a given authenticator
   * name.
   *
   * @param  {String}               name
   * @return {String}
   *
   * @private
   */
  _makeAuthenticatorName (name) {
    if (name === 'default') {
      name = this.config.get('auth.authenticator')
    }
    return `auth.${name}`
  }

  /**
   * returns the instance of serializer, made by IoC container.
   * @method _getSerializer
   * @param  {String}       serializer
   * @return {Object}
   *
   * @throws {DomainException} If cannot find given serializer
   *
   * @private
   */
  _getSerializer (serializer) {
    if (Serializers[serializer]) {
      return Ioc.make(Serializers[serializer])
    }
    throw new NE.DomainException(`Cannot find ${serializer} serializer.`)
  }

  /**
   * makes the authenticator instance by grabbing the authenticator
   * defined as a scheme inside the config file
   * @method _makeAuthenticator
   * @param  {String}           scheme
   * @param  {Object}           serializer
   * @param  {Object}           options
   * @return {Object}
   *
   * @throws {DomainException} If cannot find a given authenticator
   *
   * @private
   */
  _makeAuthenticator (scheme, serializer, options) {
    if (Authenticators[scheme]) {
      const schemeInstance = Ioc.make(Authenticators[scheme])
      schemeInstance.injections(serializer, this.request, this.response, options)
      return schemeInstance
    }
    throw new NE.DomainException(`Cannot find authenticator for ${scheme} scheme.`)
  }

  /**
   * returns a new instance of itself but with a different
   * authenticator.
   *
   * @param  {String} name
   * @return {Object}
   *
   * @public
   */
  authenticator (name) {
    return new AuthManager(name, this.config, this.request, this.response)
  }
}

module.exports = AuthManager
