'use strict'

const path = require('path')
const _ = require('lodash')
const Model = require('@adonisjs/lucid/src/Lucid/Model')
const cookie = require('cookie')

module.exports = {
  getConfig () {
    return _.cloneDeep({
      client: 'sqlite',
      connection: {
        filename: path.join(__dirname, '../tmp/dev.sqlite3')
      }
    })
  },

  createTables (db) {
    return Promise.all([
      db.schema.createTable('users', function (table) {
        table.increments()
        table.string('email')
        table.string('password')
        table.boolean('is_active')
        table.string('remember_me_token')
        table.timestamps()
        table.timestamp('deleted_at').nullable()
      })
    ])
  },

  dropTables (db) {
    return Promise.all([
      db.schema.dropTable('users')
    ])
  },

  getRequest (req) {
    return {
      request: req,
      cookie (key) {
        const parsedCookies = cookie.parse(this.request.headers.cookie)
        return parsedCookies[key]
      }
    }
  },

  getResponse (req, res) {
    return {
      request: req,
      response: res,
      cookie (key, value) {
        this.response.setHeader('set-cookie', `${key}=${value}`)
      }
    }
  },

  getSession (req, res) {
    return {
      req,
      res,
      put (key, value) {
        this.res.setHeader('set-cookie', `${key}=${value}`)
      },

      get (key) {
        const parsedCookies = cookie.parse(this.req.headers.cookie)
        return parsedCookies[key]
      }
    }
  },

  getUserModel () {
    class User extends Model {
      static get makePlain () {
        return true
      }
    }
    User._bootIfNotBooted()
    return User
  }
}
