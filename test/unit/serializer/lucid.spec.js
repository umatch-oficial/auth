'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global it, describe, context, before */
const chai = require('chai')
const sinon = require('sinon-es6')
const expect = chai.expect
const LucidSerializer = require('../../../src/Serializers').Lucid
const ms = require('ms')
require('co-mocha')
const Hash = {
  verify: function * () {
    return true
  }
}

class DummyModel {
  constructor () {
    this.password = 'bar'
  }
  static * find () {}
  static query () {
    return this
  }
  static where () {
    return this
  }
  static andWhere () {
    return this
  }
  apiTokens () {
    return hasMany
  }
  static * first () {}
}

const hasMany = {
  save: function * (values) {
    return values
  },
  query: function () {
    return this
  },
  whereIn: function () {
    return this
  },
  whereNotIn: function () {
    return this
  },
  update: function * () {}
}

class TokenModel {
  static query () {
    return this
  }
  static where () {
    return this
  }
  static andWhere () {
    return this
  }
  static with () {
    return this
  }
  static * first () {}
}

const configOptions = {
  serializer: 'Lucid',
  model: DummyModel,
  scheme: 'session',
  uid: 'email',
  password: 'password'
}

describe('Serializers', function () {
  context('Lucid', function () {
    before(function () {
      this.lucid = new LucidSerializer(Hash)
    })

    it('should be return the model using _getModel method', function () {
      const model = this.lucid._getModel(configOptions.model)
      expect(model).deep.equal(DummyModel)
    })

    it('should call the model find method when findById has been called', function * () {
      sinon.spy(DummyModel, 'find')
      yield this.lucid.findById(1, configOptions)
      expect(DummyModel.find.calledOnce).to.equal(true)
      expect(DummyModel.find.calledWith(1)).to.equal(true)
      DummyModel.find.restore()
    })

    it('should call the model query builder where method when findByCredentials has been called', function * () {
      sinon.spy(DummyModel, 'query')
      sinon.spy(DummyModel, 'where')
      sinon.spy(DummyModel, 'first')
      yield this.lucid.findByCredentials('foo@bar.com', configOptions)
      expect(DummyModel.query.calledOnce).to.equal(true)
      expect(DummyModel.where.calledOnce).to.equal(true)
      expect(DummyModel.where.calledWith('email', 'foo@bar.com')).to.equal(true)
      expect(DummyModel.first.calledOnce).to.equal(true)
      DummyModel.query.restore()
      DummyModel.where.restore()
      DummyModel.first.restore()
    })

    it('should pass extra constraints to query builder where method when defined', function * () {
      sinon.spy(DummyModel, 'query')
      sinon.spy(DummyModel, 'where')
      sinon.spy(DummyModel, 'andWhere')
      sinon.spy(DummyModel, 'first')
      const altConfig = {
        serializer: 'Lucid',
        model: DummyModel,
        scheme: 'session',
        uid: 'email',
        password: 'password',
        query: {age: 22}
      }
      yield this.lucid.findByCredentials('foo@bar.com', altConfig)
      expect(DummyModel.where.calledOnce).to.equal(true)
      expect(DummyModel.andWhere.calledOnce).to.equal(true)
      expect(DummyModel.where.calledWith('email', 'foo@bar.com')).to.equal(true)
      expect(DummyModel.andWhere.calledWith({age: 22})).to.equal(true)
      DummyModel.query.restore()
      DummyModel.where.restore()
      DummyModel.andWhere.restore()
      DummyModel.first.restore()
    })

    it('should pass extra callback to query builder when constraints are defined as an function', function * () {
      sinon.spy(DummyModel, 'query')
      sinon.spy(DummyModel, 'where')
      sinon.spy(DummyModel, 'andWhere')
      sinon.spy(DummyModel, 'first')
      const altConfig = {
        serializer: 'Lucid',
        model: DummyModel,
        scheme: 'session',
        uid: 'email',
        password: 'password',
        query: function () {}
      }
      yield this.lucid.findByCredentials('foo@bar.com', altConfig)
      expect(DummyModel.where.calledOnce).to.equal(true)
      expect(DummyModel.where.calledWith('email', 'foo@bar.com')).to.equal(true)
      expect(DummyModel.andWhere.calledOnce).to.equal(true)
      DummyModel.query.restore()
      DummyModel.where.restore()
      DummyModel.andWhere.restore()
      DummyModel.first.restore()
    })

    it('should return false when user is null', function * () {
      const isValid = yield this.lucid.validateCredentials(null, {}, configOptions)
      expect(isValid).to.equal(false)
    })

    it('should return false when user does not have password property', function * () {
      const isValid = yield this.lucid.validateCredentials('foo', {}, configOptions)
      expect(isValid).to.equal(false)
    })

    it('should try to verify the user password', function * () {
      sinon.spy(Hash, 'verify')
      yield this.lucid.validateCredentials(new DummyModel(), 'foo', configOptions)
      expect(Hash.verify.calledOnce).to.equal(true)
      expect(Hash.verify.calledWith('foo', 'bar')).to.equal(true)
    })

    it('should find a user by it\'s token', function * () {
      const newOptions = {
        model: TokenModel
      }
      sinon.spy(TokenModel, 'query')
      sinon.spy(TokenModel, 'where')
      sinon.spy(TokenModel, 'with')
      sinon.spy(TokenModel, 'first')
      yield this.lucid.findByToken('my-token', newOptions)
      expect(TokenModel.query.calledOnce).to.equal(true)
      expect(TokenModel.where.calledOnce).to.equal(true)
      expect(TokenModel.with.calledOnce).to.equal(true)
      expect(TokenModel.first.calledOnce).to.equal(true)
      expect(TokenModel.where.calledWith('token', 'my-token')).to.equal(true)
      expect(TokenModel.with.calledWith('user')).to.equal(true)
      TokenModel.query.restore()
      TokenModel.where.restore()
      TokenModel.with.restore()
      TokenModel.first.restore()
    })

    it('should return false when token is null', function * () {
      const newOptions = {
        model: TokenModel
      }
      const isValid = yield this.lucid.validateToken(null, newOptions)
      expect(isValid).to.equal(false)
    })

    it('should return false when token does not have get method', function * () {
      const newOptions = {
        model: TokenModel
      }
      const isValid = yield this.lucid.validateToken('foo', newOptions)
      expect(isValid).to.equal(false)
    })

    it('should return false when token get method returns a falsy value', function * () {
      const newOptions = {
        model: TokenModel
      }
      const isValid = yield this.lucid.validateToken({get: function () {}}, newOptions)
      expect(isValid).to.equal(false)
    })

    it('should return true when token has a forever key with positive value', function * () {
      const newOptions = {
        model: TokenModel
      }
      const isValid = yield this.lucid.validateToken({get: function () { return 'something' }, forever: true}, newOptions)
      expect(isValid).to.equal(true)
    })

    it('should return true when token expiry date time is greater than current date time', function * () {
      const newOptions = {
        model: TokenModel
      }
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const tokenInstance = {
        get: function () { return 'something' },
        toJSON: function () {
          return { expiry: futureDate }
        }
      }
      const isValid = yield this.lucid.validateToken(tokenInstance, newOptions)
      expect(isValid).to.equal(true)
    })

    it('should return false when token expiry date time is lesser than current date time', function * () {
      const newOptions = {
        model: TokenModel
      }
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() - 1)
      const tokenInstance = {
        get: function () { return 'something' },
        toJSON: function () {
          return { expiry: futureDate }
        }
      }
      const isValid = yield this.lucid.validateToken(tokenInstance, newOptions)
      expect(isValid).to.equal(false)
    })

    it('should create expiry date for a given token', function () {
      const today = new Date()
      today.setDate(today.getDate() + 3)
      const expiry = this.lucid._getTokenExpiryDate(ms('3d'))
      expect(expiry.getDate()).to.equal(today.getDate())
    })

    it('should save token using user model instance', function * () {
      const newOptions = {
        model: TokenModel
      }
      const dummyModel = new DummyModel()
      sinon.spy(dummyModel, 'apiTokens')
      sinon.spy(hasMany, 'save')
      yield this.lucid.saveToken(dummyModel, 120102, newOptions)
      expect(dummyModel.apiTokens.calledOnce).to.equal(true)
      expect(hasMany.save.calledOnce).to.equal(true)
      expect(hasMany.save.calledWith(new TokenModel({token: 120102, forever: true, expiry: null, is_revoked: false}))).to.equal(true)
      dummyModel.apiTokens.restore()
      hasMany.save.restore()
    })

    it('should return saved token using user model instance', function * () {
      const newOptions = {
        model: TokenModel
      }
      const dummyModel = new DummyModel()
      const token = yield this.lucid.saveToken(dummyModel, 120102, newOptions)
      expect(token instanceof TokenModel).to.equal(true)
    })

    it('should save token using user model instance and set proper expiry date', function * () {
      const newOptions = {
        model: TokenModel
      }
      const dummyModel = new DummyModel()
      const today = new Date()
      today.setDate(today.getDate() + 3)
      sinon.spy(dummyModel, 'apiTokens')
      sinon.spy(hasMany, 'save')
      yield this.lucid.saveToken(dummyModel, 120102, newOptions, ms('3d'))
      expect(dummyModel.apiTokens.calledOnce).to.equal(true)
      expect(hasMany.save.calledOnce).to.equal(true)
      expect(hasMany.save.calledWith(new TokenModel({token: 120102, forever: false, expiry: today, is_revoked: false}))).to.equal(true)
      dummyModel.apiTokens.restore()
      hasMany.save.restore()
    })

    it('should revoke all of the tokens for a user', function * () {
      const dummyModel = new DummyModel()
      const today = new Date()
      today.setDate(today.getDate() + 3)
      sinon.spy(dummyModel, 'apiTokens')
      sinon.spy(hasMany, 'update')
      yield this.lucid.revokeTokens(dummyModel)
      expect(dummyModel.apiTokens.calledOnce).to.equal(true)
      expect(hasMany.update.calledOnce).to.equal(true)
      expect(hasMany.update.calledWith({is_revoked: true})).to.equal(true)
      dummyModel.apiTokens.restore()
      hasMany.update.restore()
    })

    it('should revoke only given tokens', function * () {
      const dummyModel = new DummyModel()
      const today = new Date()
      today.setDate(today.getDate() + 3)
      sinon.spy(dummyModel, 'apiTokens')
      sinon.spy(hasMany, 'whereIn')
      sinon.spy(hasMany, 'update')
      yield this.lucid.revokeTokens(dummyModel, [1223, 81992])
      expect(dummyModel.apiTokens.calledOnce).to.equal(true)
      expect(hasMany.whereIn.calledOnce).to.equal(true)
      expect(hasMany.whereIn.calledWith('token', [1223, 81992])).to.equal(true)
      expect(hasMany.update.calledOnce).to.equal(true)
      expect(hasMany.update.calledWith({'is_revoked': true})).to.equal(true)
      dummyModel.apiTokens.restore()
      hasMany.whereIn.restore()
      hasMany.update.restore()
    })

    it('should revoke all tokens except the given tokens', function * () {
      const dummyModel = new DummyModel()
      const today = new Date()
      today.setDate(today.getDate() + 3)
      sinon.spy(dummyModel, 'apiTokens')
      sinon.spy(hasMany, 'whereNotIn')
      sinon.spy(hasMany, 'update')
      yield this.lucid.revokeTokens(dummyModel, [1223, 81992], true)
      expect(dummyModel.apiTokens.calledOnce).to.equal(true)
      expect(hasMany.whereNotIn.calledOnce).to.equal(true)
      expect(hasMany.whereNotIn.calledWith('token', [1223, 81992])).to.equal(true)
      expect(hasMany.update.calledOnce).to.equal(true)
      expect(hasMany.update.calledWith({'is_revoked': true})).to.equal(true)
      dummyModel.apiTokens.restore()
      hasMany.whereNotIn.restore()
      hasMany.update.restore()
    })
  })
})
