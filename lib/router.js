var _ = require('lodash')

var Router = module.exports = function(sequelize, options) {
  this.sequelize = sequelize
  this.options   = _.extend({
    endpoint: '/api'
  }, options || {})
}

Router.prototype.isRestfulRequest = function(path) {
  return path.indexOf(this.options.endpoint) === 0
}
