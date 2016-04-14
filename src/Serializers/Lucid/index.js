'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * NOTE
 * Bind the instance to the IoC container.
*/

const Ioc = require('adonis-fold').Ioc
const NE = require('node-exceptions')
const _ = require('lodash')

class LucidSerializer {

  /**
   * dependencies to be auto injected by the IoC container
   * @return {Array}
   * @private
   */
  static get inject () {
    return ['Adonis/Src/Hash']
  }

  constructor (Hash) {
    this.hash = Hash
  }

  /**
   * returns the model from the Ioc container if parameter
   * is a string, otherwise returns the actual binding.
   *
   * @param  {String|Object} model
   * @return {Object}
   * @throws Error when unable to find binding from the IoC container.
   *
   * @private
   */
  _getModel (model) {
    return typeof (model) === 'string' ? Ioc.use(model) : model
  }

  /**
   * returns the model instance by model primary key
   *
   * @param  {Number} id
   * @param  {Object} options   - Options defined as the config
   * @return {Object}
   *
   * @public
   */
  * findById (id, options) {
    const model = this._getModel(options.model)
    return yield model.find(id)
  }

  /**
   * returns model instance using the user credentials
   *
   * @param  {String} email
   * @param  {Object|Function} constraints  - Other query constraints to be passed
   *                                	       	on runtime.
   * @param  {Object} options   - Options defined as the config
   * @return {Object}
   *
   * @public
   */
  * findByCredentials (email, constraints, options) {
    const callback = _.isFunction(constraints) ? constraints : null
    const whereObject = _.isPlainObject(constraints) ? constraints : {}
    const model = this._getModel(options.model)

    whereObject[options.uid] = email
    const query = model.query().where(whereObject)
    if (callback) {
      query.andWhere(callback)
    }
    return yield query.first()
  }

  /**
   * validates user crendentials using the model instance and
   * the password. It makes use of Hash provider.
   *
   * @param  {Object} user
   * @param  {Object} credentials
   * @param  {Object} options
   * @return {Boolean}
   *
   * @throws Error when unable to verify user password.
   *
   * @public
   */
  * validateCredentials (user, credentials, options) {
    const model = this._getModel(options.model)
    if (user instanceof model === false) {
      throw new NE.InvalidArgumentException('validateCredentials requires an instance of valid Lucid model')
    }
    const actualPassword = user[options.password]
    const password = credentials[options.password]
    try {
      return yield this.hash.verify(password, actualPassword)
    } catch (e) {
      return false
    }
  }
}

module.exports = LucidSerializer
