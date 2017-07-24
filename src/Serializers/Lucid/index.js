'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc } = require('@adonisjs/fold')

/**
 * Lucid serializers uses lucid model to validate
 * and fetch user details.
 *
 * @class LucidSerializer
 * @constructor
 */
class LucidSerializer {
  /* istanbul ignore next */
  /**
   * Dependencies to be injected by Ioc container
   *
   * @attribute inject
   *
   * @return {Array}
   */
  static get inject () {
    return ['Adonis/Src/Hash']
  }

  constructor (Hash) {
    this.Hash = Hash
    this._config = null
    this._Model = null
    this._queryCallback = null
  }

  /**
   * Returns an instance of the model query
   *
   * @method _getQuery
   *
   * @return {Object}
   *
   * @private
   */
  _getQuery () {
    const query = this._Model.query()
    if (typeof (this._queryCallback) === 'function') {
      this._queryCallback(query)
    }
    return query
  }

  /**
   * Setup config on the serializer instance. It
   * is import and needs to be done as the
   * first step before using the serializer.
   *
   * @method setConfig
   *
   * @param  {Object}  config
   */
  setConfig (config) {
    this._config = config
    this._Model = ioc.make(this._config.model)
  }

  /**
   * Returns the primary key for the
   * model. It is used to set the
   * session key
   *
   * @method primaryKey
   *
   * @return {String}
   */
  get primaryKey () {
    return this._Model.primaryKey
  }

  /**
   * Add runtime constraints to the query builder. It
   * is helpful when auth has extra constraints too
   *
   * @method query
   *
   * @param  {Function} callback
   *
   * @chainable
   */
  query (callback) {
    this._queryCallback = callback
    return this
  }

  /**
   * Returns a user instance using the primary
   * key
   *
   * @method findById
   *
   * @param  {Number|String} id
   *
   * @return {User|Null}  The model instance or `null`
   */
  async findById (id) {
    return this._getQuery().where(this.primaryKey, id).first()
  }

  /**
   * Finds a user using the uid field
   *
   * @method findByUid
   *
   * @param  {String}  uid
   *
   * @return {Model|Null} The model instance or `null`
   */
  async findByUid (uid) {
    return this._getQuery().where(this._config.uid, uid).first()
  }

  /**
   * Finds a user using the rememeber token
   *
   * @method findByRememberToken
   *
   * @param  {String}  token
   *
   * @return {Model|Null} The model instance or `null`
   */
  async findByRememberToken (token) {
    return this._getQuery().where('remember_me_token', token).first()
  }

  /**
   * Validates the password field on the user model instance
   *
   * @method validateCredentails
   *
   * @param  {Model}            user
   * @param  {String}            password
   *
   * @return {Boolean}
   */
  async validateCredentails (user, password) {
    if (!user || !user[this._config.password]) {
      return false
    }
    return this.Hash.verify(password, user[this._config.password])
  }

  /**
   * Save remeber token for the user
   *
   * @method saveRememberToken
   *
   * @param  {Object}          user
   * @param  {String}          token
   *
   * @return {void}
   */
  async saveRememberToken (user, token) {
    user.remember_me_token = token
    await user.save()
  }
}

module.exports = LucidSerializer
