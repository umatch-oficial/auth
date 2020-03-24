process.env.TS_NODE_FILES = true
require('ts-node/register')
require('reflect-metadata')

const { configure } = require('japa')
configure({
  files: ['test/**/*.spec.ts']
})
