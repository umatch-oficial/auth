'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const edge = require('edge.js')
const ViewBindings = require('../../src/ViewBindings')

class View {
  constructor () {
    this.engine = edge
    this.tag = this.engine.tag.bind(this.engine)
  }
}

test.group('ViewBindings', () => {
  test('skip code inside loggedIn block when auth is not defined', (assert) => {
    ViewBindings(new View())

    const template = `
    @loggedIn
    <h2> You are logged in </h2>
    @endloggedIn
    `
    assert.equal(edge.renderString(template).trim(), '')
  })

  test('render code inside loggedIn block when auth user is defined', (assert) => {
    ViewBindings(new View())

    const template = `
    @loggedIn
    <h2> You are logged in </h2>
    @endloggedIn
    `

    const data = { auth: { user: 'virk' } }
    assert.equal(edge.renderString(template, data).trim(), '<h2> You are logged in </h2>')
  })

  test('render code inside else block when not auth is not defined', (assert) => {
    ViewBindings(new View())

    const template = `
    @loggedIn
      <h2> You are logged in </h2>
    @else
      <h2> You are not logged in </h2>
    @endloggedIn
    `

    const data = { auth: { user: null } }
    assert.equal(edge.renderString(template, data).trim(), '<h2> You are not logged in </h2>')
  })
})
