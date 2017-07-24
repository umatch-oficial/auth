'use strict'

const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')
const DatabaseManager = require('@adonisjs/lucid/src/Database/Manager')
const path = require('path')
const fs = require('fs-extra')
const helpers = require('./helpers')

module.exports = {
  databaseHook (group) {
    group.before(async () => {
      await fs.ensureDir(path.join(__dirname, './tmp'))
      ioc.bind('Adonis/Src/Database', () => {
        const config = new Config()
        config.set('database', {
          connection: 'testing',
          testing: helpers.getConfig()
        })
        return new DatabaseManager(config)
      })

      ioc.alias('Adonis/Src/Database', 'Database')
      await helpers.createTables(ioc.use('Database'))
    })

    group.beforeEach(async () => {
      await ioc.use('Database').table('users').truncate()
    })

    group.after(async () => {
      await helpers.dropTables(ioc.use('Database'))
      ioc.use('Database').close()
      try {
        await fs.remove(path.join(__dirname, './tmp'))
      } catch (error) {
        if (process.platform !== 'win32' || error.code !== 'EBUSY') {
          throw error
        }
      }
    }).timeout(0)
  },

  hashHook (group) {
    ioc.bind('Adonis/Src/Hash', () => {
      return {
        make (val) {
          return val
        },

        verify (val, salted) {
          return val === salted
        }
      }
    })
    ioc.alias('Adonis/Src/Hash', 'Hash')
  }
}
