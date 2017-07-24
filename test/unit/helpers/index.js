'use strict'

const path = require('path')
const _ = require('lodash')
const Model = require('@adonisjs/lucid/src/Lucid/Model')

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
