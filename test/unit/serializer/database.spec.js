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
const DatabaseSerializer = require('../../../src/Serializers').Database
const ms = require('ms')
require('co-mocha')

const Database = {
  from: function () {
    return this
  },
  where: function () {
    return this
  },
  whereIn: function () {
    return this
  },
  whereNotIn: function () {
    return this
  },
  andWhere: function () {
    return this
  },
  into: function () {
    return this
  },
  insert: function * () {},
  first: function * () {},
  update: function * () {}
}

const Hash = {
  verify: function * (a, b) {
    return a === b
  }
}

const configOptions = {
  serializer: 'Database',
  table: 'users',
  scheme: 'session',
  uid: 'email',
  password: 'password',
  primaryKey: 'id'
}

describe('Serializers', function () {
  context('Database', function () {
    before(function () {
      this.database = new DatabaseSerializer(Database, Hash)
    })

    it('should return the primaryKey for the data object', function () {
      expect(this.database.primaryKey(configOptions)).to.equal(configOptions.primaryKey)
    })

    it('should query the user using the database provider', function * () {
      sinon.spy(Database, 'where')
      sinon.spy(Database, 'from')
      yield this.database.findById(1, configOptions)
      expect(Database.where.calledOnce).to.equal(true)
      expect(Database.from.calledOnce).to.equal(true)
      expect(Database.from.calledWith(configOptions.table)).to.equal(true)
      expect(Database.where.calledWith(configOptions.primaryKey, 1)).to.equal(true)
      Database.where.restore()
      Database.from.restore()
    })

    it('should query user findByCredentials has been called', function * () {
      sinon.spy(Database, 'from')
      sinon.spy(Database, 'where')
      sinon.spy(Database, 'first')
      yield this.database.findByCredentials('foo@bar.com', configOptions)
      expect(Database.from.calledOnce).to.equal(true)
      expect(Database.where.calledOnce).to.equal(true)
      expect(Database.where.calledWith('email', 'foo@bar.com')).to.equal(true)
      expect(Database.from.calledWith(configOptions.table)).to.equal(true)
      expect(Database.first.calledOnce).to.equal(true)
      Database.from.restore()
      Database.where.restore()
      Database.first.restore()
    })

    it('should pass extra constraints to query builder where method when defined', function * () {
      sinon.spy(Database, 'from')
      sinon.spy(Database, 'where')
      sinon.spy(Database, 'andWhere')
      sinon.spy(Database, 'first')
      const altConfig = {
        serializer: 'Lucid',
        model: Database,
        scheme: 'session',
        uid: 'email',
        password: 'password',
        query: {age: 22}
      }
      yield this.database.findByCredentials('foo@bar.com', altConfig)
      expect(Database.where.calledOnce).to.equal(true)
      expect(Database.andWhere.calledOnce).to.equal(true)
      expect(Database.where.calledWith('email', 'foo@bar.com')).to.equal(true)
      expect(Database.andWhere.calledWith({age: 22})).to.equal(true)
      Database.from.restore()
      Database.where.restore()
      Database.andWhere.restore()
      Database.first.restore()
    })

    it('should return false when user is null', function * () {
      const isValid = yield this.database.validateCredentials(null, {}, configOptions)
      expect(isValid).to.equal(false)
    })

    it('should return false when user does not have password property', function * () {
      const isValid = yield this.database.validateCredentials('foo', {}, configOptions)
      expect(isValid).to.equal(false)
    })

    it('should try to verify the user password', function * () {
      sinon.spy(Hash, 'verify')
      yield this.database.validateCredentials({password: 'bar'}, 'foo', configOptions)
      expect(Hash.verify.calledOnce).to.equal(true)
      expect(Hash.verify.calledWith('foo', 'bar')).to.equal(true)
      Hash.verify.restore()
    })

    it('should return true when verify password succeeds', function * () {
      const response = yield this.database.validateCredentials({password: 'foo'}, 'foo', configOptions)
      expect(response).to.equal(true)
    })

    it('should retrieve a token', function * () {
      sinon.spy(Database, 'from')
      sinon.spy(Database, 'where')
      sinon.spy(Database, 'andWhere')
      sinon.spy(Database, 'first')
      const newOptions = {
        serializer: 'Database',
        table: 'tokens',
        usersTable: 'users'
      }
      yield this.database.findByToken('my-token', newOptions)
      expect(Database.from.calledOnce).to.equal(true)
      expect(Database.from.calledWith(newOptions.table)).to.equal(true)
      expect(Database.where.calledOnce).to.equal(true)
      expect(Database.where.calledWith('token', 'my-token')).to.equal(true)
      expect(Database.andWhere.calledOnce).to.equal(true)
      expect(Database.andWhere.calledWith('is_revoked', false)).to.equal(true)
      expect(Database.first.calledOnce).to.equal(true)
      Database.from.restore()
      Database.where.restore()
      Database.andWhere.restore()
      Database.first.restore()
    })

    it('should return false when token is null', function * () {
      const newOptions = {}
      const isValid = yield this.database.validateToken(null, newOptions)
      expect(isValid).to.equal(false)
    })

    it('should return true when token has a forever key with positive value', function * () {
      const newOptions = {}
      const isValid = yield this.database.validateToken({token: 123, forever: true}, newOptions)
      expect(isValid).to.equal(true)
    })

    it('should return true when token expiry date time is greater than current date time', function * () {
      const newOptions = {}
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const tokenObject = {
        expiry: futureDate
      }
      const isValid = yield this.database.validateToken(tokenObject, newOptions)
      expect(isValid).to.equal(true)
    })

    it('should return false when token expiry date time is smaller than current date time', function * () {
      const newOptions = {}
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() - 1)
      const tokenObject = {
        expiry: futureDate
      }
      const isValid = yield this.database.validateToken(tokenObject, newOptions)
      expect(isValid).to.equal(false)
    })

    it('should return false when token expiry is not a valid date', function * () {
      const newOptions = {}
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() - 1)
      const tokenObject = {
        expiry: 'foo'
      }
      const isValid = yield this.database.validateToken(tokenObject, newOptions)
      expect(isValid).to.equal(false)
    })

    it('should return true when token expiry is not a valid date but forever is set to true', function * () {
      const newOptions = {}
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() - 1)
      const tokenObject = {
        forever: true,
        expiry: 'foo'
      }
      const isValid = yield this.database.validateToken(tokenObject, newOptions)
      expect(isValid).to.equal(true)
    })

    it('should create expiry date for a given token', function () {
      const today = new Date()
      today.setDate(today.getDate() + 3)
      const expiry = this.database._getTokenExpiryDate(ms('3d'))
      expect(expiry.getDate()).to.equal(today.getDate())
    })

    it('should save token for a given user', function * () {
      const newOptions = {
        table: 'tokens',
        primaryKey: 'id'
      }
      sinon.spy(Database, 'into')
      sinon.spy(Database, 'insert')
      const token = yield this.database.saveToken({id: 10}, 120102, newOptions)
      expect(token).to.be.an('object')
      expect(token.token).to.equal(120102)
      expect(token.user_id).to.equal(10)
      expect(Database.into.calledOnce).to.equal(true)
      expect(Database.into.calledWith(newOptions.table)).to.equal(true)
      expect(Database.insert.calledOnce).to.equal(true)
      Database.into.restore()
      Database.insert.restore()
    })

    it('should throw error when id is missing for a given user', function * () {
      const newOptions = {
        table: 'tokens',
        primaryKey: 'id'
      }
      try {
        yield this.database.saveToken({}, 120102, newOptions)
        expect(true).to.equal(false)
      } catch (e) {
        expect(e.name).to.equal('RuntimeException')
        expect(e.message).to.match(/Cannot save token as value for id is missing/)
      }
    })

    it('should revoke all of the tokens for a user', function * () {
      const today = new Date()
      today.setDate(today.getDate() + 3)
      sinon.spy(Database, 'from')
      sinon.spy(Database, 'where')
      sinon.spy(Database, 'update')
      yield this.database.revokeTokens({id: 10}, null, null, configOptions)
      expect(Database.from.calledOnce).to.equal(true)
      expect(Database.from.calledWith(configOptions.table)).to.equal(true)
      expect(Database.where.calledOnce).to.equal(true)
      expect(Database.where.calledWith('user_id', 10)).to.equal(true)
      expect(Database.update.calledOnce).to.equal(true)
      expect(Database.update.calledWith('is_revoked', true)).to.equal(true)
      Database.from.restore()
      Database.where.restore()
      Database.update.restore()
    })

    it('should revoke only given tokens for a user', function * () {
      const today = new Date()
      today.setDate(today.getDate() + 3)
      sinon.spy(Database, 'from')
      sinon.spy(Database, 'where')
      sinon.spy(Database, 'whereIn')
      sinon.spy(Database, 'update')
      yield this.database.revokeTokens({id: 10}, [1223, 81992], null, configOptions)
      expect(Database.from.calledOnce).to.equal(true)
      expect(Database.from.calledWith(configOptions.table)).to.equal(true)
      expect(Database.where.calledOnce).to.equal(true)
      expect(Database.where.calledWith('user_id', 10)).to.equal(true)
      expect(Database.whereIn.calledOnce).to.equal(true)
      expect(Database.whereIn.calledWith('token', [1223, 81992])).to.equal(true)
      expect(Database.update.calledOnce).to.equal(true)
      expect(Database.update.calledWith('is_revoked', true)).to.equal(true)
      Database.from.restore()
      Database.where.restore()
      Database.whereIn.restore()
      Database.update.restore()
    })

    it('should revoke all tokens except the given tokens', function * () {
      const today = new Date()
      today.setDate(today.getDate() + 3)
      sinon.spy(Database, 'from')
      sinon.spy(Database, 'where')
      sinon.spy(Database, 'whereNotIn')
      sinon.spy(Database, 'update')
      yield this.database.revokeTokens({id: 10}, [1223, 81992], true, configOptions)
      expect(Database.from.calledOnce).to.equal(true)
      expect(Database.from.calledWith(configOptions.table)).to.equal(true)
      expect(Database.where.calledOnce).to.equal(true)
      expect(Database.where.calledWith('user_id', 10)).to.equal(true)
      expect(Database.whereNotIn.calledOnce).to.equal(true)
      expect(Database.whereNotIn.calledWith('token', [1223, 81992])).to.equal(true)
      expect(Database.update.calledOnce).to.equal(true)
      expect(Database.update.calledWith('is_revoked', true)).to.equal(true)
      Database.from.restore()
      Database.where.restore()
      Database.whereNotIn.restore()
      Database.update.restore()
    })
  })
})
