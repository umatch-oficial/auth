'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

class DatabaseSerializer {

  static get inject () {
    return ['Adonis/Src/Database', 'Adonis/Src/Hash']
  }

  constructor (Database, Hash) {
    this.database = Database
    this.hash = Hash
  }

  * findById (id, options) {
    return yield this.database.table(options.table).where('id', id).first()
  }

  * findByCredentials (email, constraints, options) {
  }

  * findByToken (token, options) {

  }

  * validateToken (token, options) {
  }

  * validateCredentials (user, credentials, options) {
  }

}

module.exports = DatabaseSerializer
