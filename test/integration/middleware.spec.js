'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global it, describe, before */
const AuthMiddleware = require('../../middleware/Auth')
const chai = require('chai')
const setup = require('./setup')
const http = require('http')
const supertest = require('supertest')
const co = require('co')
const sinon = require('sinon-es6')
const expect = chai.expect
require('co-mocha')

const View = {
  global: function () {}
}

class DummyModel {
  static * find (id) {
    return id === '2' ? {password: 'secret', id: id} : null
  }
  static query () {
    return this
  }
  static where () {
    return this
  }
  static * first () {
    return {password: 'secret'}
  }
}

const sessionConfig = {
  serializer: 'Lucid',
  model: DummyModel,
  uid: 'email',
  password: 'password',
  scheme: 'session'
}

const basicConfig = {
  serializer: 'Lucid',
  model: DummyModel,
  uid: 'email',
  password: 'password',
  scheme: 'basic'
}

const jwtConfig = {
  serializer: 'Lucid',
  model: DummyModel,
  scheme: 'jwt'
}

const Config = {
  get: function (key) {
    switch (key) {
      case 'auth.authenticator':
        return 'session'
      case 'auth.session':
        return sessionConfig
      case 'auth.basic':
        return basicConfig
      case 'auth.jwt':
        return jwtConfig
    }
  }
}

describe('Auth Middleware', function () {
  before(function * () {
    yield setup.registerProviders()
  })

  it('should throw login exception when unable to authenticate a given user', function * () {
    const server = http.createServer(function (req, res) {
      const request = setup.decorateRequest(req, 'session', Config)
      const authMiddleware = new AuthMiddleware(View)
      co(function * () {
        yield authMiddleware.handle(request, res, function * () {})
      })
      .then(function (check) {
        res.writeHead(200, {'content-type': 'application/json'})
        res.write(JSON.stringify(check))
        res.end()
      })
      .catch(function (error) {
        res.writeHead(500, {'content-type': 'application/json'})
        res.write(JSON.stringify(error))
        res.end()
      })
    })
    const response = yield supertest(server).get('/')
    const error = JSON.parse(response.error.text)
    expect(error.name).to.equal('InvalidLoginException')
    expect(error.message).to.equal('Login Failure')
  })

  it('should throw login exception when session cookie exists but user does not exists', function * () {
    sinon.spy(DummyModel, 'find')
    const server = http.createServer(function (req, res) {
      const request = setup.decorateRequest(req, 'session', Config)
      const authMiddleware = new AuthMiddleware(View)
      co(function * () {
        yield authMiddleware.handle(request, res, function * () {})
      })
      .then(function (check) {
        res.writeHead(200, {'content-type': 'application/json'})
        res.write(JSON.stringify(check))
        res.end()
      })
      .catch(function (error) {
        res.writeHead(500, {'content-type': 'application/json'})
        res.write(JSON.stringify(error))
        res.end()
      })
    })
    const response = yield supertest(server).get('/').set('Cookie', ['adonis-auth=1'])
    const error = JSON.parse(response.error.text)
    expect(error.name).to.equal('InvalidLoginException')
    expect(error.message).to.equal('Login Failure')
    expect(DummyModel.find.calledOnce).to.equal(true)
    expect(DummyModel.find.calledWith('1')).to.equal(true)
    DummyModel.find.restore()
  })

  it('should work fine when session has right user id', function * () {
    sinon.spy(DummyModel, 'find')
    const server = http.createServer(function (req, res) {
      const request = setup.decorateRequest(req, 'session', Config)
      const authMiddleware = new AuthMiddleware(View)
      co(function * () {
        yield authMiddleware.handle(request, res, function * () {})
        return yield request.auth.getUser()
      })
      .then(function (user) {
        res.writeHead(200, {'content-type': 'application/json'})
        res.write(JSON.stringify(user))
        res.end()
      })
      .catch(function (error) {
        res.writeHead(500, {'content-type': 'application/json'})
        res.write(JSON.stringify(error))
        res.end()
      })
    })
    const response = yield supertest(server).get('/').set('Cookie', ['adonis-auth=2'])
    expect(response.body).deep.equal({password: 'secret', id: '2'})
    expect(DummyModel.find.calledOnce).to.equal(true)
    expect(DummyModel.find.calledWith('2')).to.equal(true)
    DummyModel.find.restore()
  })

  it('should be able to make use of multiple authenticators at once, but stop on first passing check', function * () {
    sinon.spy(DummyModel, 'find')
    sinon.spy(DummyModel, 'where')
    sinon.spy(DummyModel, 'query')
    sinon.spy(DummyModel, 'first')
    const server = http.createServer(function (req, res) {
      const request = setup.decorateRequest(req, 'session', Config)
      const authMiddleware = new AuthMiddleware(View)
      co(function * () {
        yield authMiddleware.handle(request, res, function * () {}, 'session', 'basic', 'jwt')
        return yield request.auth.getUser()
      })
      .then(function (user) {
        res.writeHead(200, {'content-type': 'application/json'})
        res.write(JSON.stringify(user))
        res.end()
      })
      .catch(function (error) {
        res.writeHead(500, {'content-type': 'application/json'})
        res.write(JSON.stringify(error))
        res.end()
      })
    })
    yield supertest(server).get('/').auth('foo@bar.com', 'secret')
    expect(DummyModel.find.calledOnce).to.equal(false)
    expect(DummyModel.query.calledOnce).to.equal(true)
    expect(DummyModel.where.calledOnce).to.equal(true)
    expect(DummyModel.first.calledOnce).to.equal(true)
    DummyModel.find.restore()
    DummyModel.query.restore()
    DummyModel.where.restore()
    DummyModel.first.restore()
  })

  it('should attach the user instance to the request object', function * () {
    sinon.spy(DummyModel, 'find')
    const server = http.createServer(function (req, res) {
      const request = setup.decorateRequest(req, 'session', Config)
      const authMiddleware = new AuthMiddleware(View)
      co(function * () {
        yield authMiddleware.handle(request, res, function * () {})
        return request.authUser
      })
      .then(function (user) {
        res.writeHead(200, {'content-type': 'application/json'})
        res.write(JSON.stringify(user))
        res.end()
      })
      .catch(function (error) {
        res.writeHead(500, {'content-type': 'application/json'})
        res.write(JSON.stringify(error))
        res.end()
      })
    })
    const response = yield supertest(server).get('/').set('Cookie', ['adonis-auth=2'])
    expect(response.body).deep.equal({password: 'secret', id: '2'})
    expect(DummyModel.find.calledOnce).to.equal(true)
    expect(DummyModel.find.calledWith('2')).to.equal(true)
    expect()
    DummyModel.find.restore()
  })

  it('should bind authUser to the view global', function * () {
    sinon.spy(DummyModel, 'find')
    const server = http.createServer(function (req, res) {
      const request = setup.decorateRequest(req, 'session', Config)
      const viewKeyValuePair = {}
      const customView = {
        global (key, value) {
          viewKeyValuePair[key] = value
        }
      }
      const authMiddleware = new AuthMiddleware(customView)
      co(function * () {
        yield authMiddleware.handle(request, res, function * () {})
        return viewKeyValuePair.authUser
      })
      .then(function (user) {
        res.writeHead(200, {'content-type': 'application/json'})
        res.write(JSON.stringify(user))
        res.end()
      })
      .catch(function (error) {
        res.writeHead(500, {'content-type': 'application/json'})
        res.write(JSON.stringify(error))
        res.end()
      })
    })
    const response = yield supertest(server).get('/').set('Cookie', ['adonis-auth=2'])
    expect(response.body).deep.equal({password: 'secret', id: '2'})
    expect(DummyModel.find.calledOnce).to.equal(true)
    expect(DummyModel.find.calledWith('2')).to.equal(true)
    expect()
    DummyModel.find.restore()
  })
})
