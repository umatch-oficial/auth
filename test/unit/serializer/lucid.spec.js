'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const chai = require('chai')
const sinon = require('sinon-es6')
const expect = chai.expect
const LucidSerializer = require('../../../src/Serializers').Lucid
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
      yield this.lucid.findByCredentials('foo@bar.com', {}, configOptions)
      expect(DummyModel.query.calledOnce).to.equal(true)
      expect(DummyModel.where.calledOnce).to.equal(true)
      expect(DummyModel.where.calledWith({email: 'foo@bar.com'})).to.equal(true)
      expect(DummyModel.first.calledOnce).to.equal(true)
      DummyModel.query.restore()
      DummyModel.where.restore()
      DummyModel.first.restore()
    })

    it('should pass extra constraints to query builder where method when defined', function * () {
      sinon.spy(DummyModel, 'query')
      sinon.spy(DummyModel, 'where')
      sinon.spy(DummyModel, 'first')
      yield this.lucid.findByCredentials('foo@bar.com', {age: 22}, configOptions)
      expect(DummyModel.where.calledOnce).to.equal(true)
      expect(DummyModel.where.calledWith({email: 'foo@bar.com', age: 22})).to.equal(true)
      DummyModel.query.restore()
      DummyModel.where.restore()
      DummyModel.first.restore()
    })

    it('should pass extra callback to query builder when constraints are defined as an function', function * () {
      sinon.spy(DummyModel, 'query')
      sinon.spy(DummyModel, 'where')
      sinon.spy(DummyModel, 'andWhere')
      sinon.spy(DummyModel, 'first')
      const func = function () {}
      yield this.lucid.findByCredentials('foo@bar.com', func, configOptions)
      expect(DummyModel.where.calledOnce).to.equal(true)
      expect(DummyModel.where.calledWith({email: 'foo@bar.com'})).to.equal(true)
      expect(DummyModel.andWhere.calledOnce).to.equal(true)
      expect(DummyModel.andWhere.calledWith(func)).to.equal(true)
      DummyModel.query.restore()
      DummyModel.where.restore()
      DummyModel.andWhere.restore()
      DummyModel.first.restore()
    })

    it('should throw an error when user object passed to validateCredentials is not an instance model', function * () {
      try {
        yield this.lucid.validateCredentials('foo', {}, configOptions)
      } catch (e) {
        expect(e.name).to.equal('InvalidArgumentException')
        expect(e.message).to.match(/validateCredentials requires an instance of valid Lucid model/)
      }
    })

    it('should try to verify the user password', function * () {
      sinon.spy(Hash, 'verify')
      yield this.lucid.validateCredentials(new DummyModel(), {password: 'foo'}, configOptions)
      expect(Hash.verify.calledOnce).to.equal(true)
      expect(Hash.verify.calledWith('foo', 'bar')).to.equal(true)
    })
  })
})
