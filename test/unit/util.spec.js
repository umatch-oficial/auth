'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global it, describe */
const chai = require('chai')
const expect = chai.expect
const util = require('../../lib/util')

describe('Util', function () {
  it('should return the utc version of a given date', function () {
    const date = new Date()
    const utcDate = util.toUtc(date)
    expect(new Date(utcDate).setUTCMinutes()).not.to.equal(date.setUTCMinutes())
  })

  it('should return the difference between 2 dates', function () {
    const diff = util.dateDiff(new Date('2016-04-15 16:30:00'), new Date('2016-04-15 17:30:00'))
    expect(diff).to.equal(60 * 60 * 1000)
  })
})
