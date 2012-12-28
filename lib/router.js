var _ = require('lodash')

var Router = module.exports = function(sequelize, options) {
  this.sequelize = sequelize
  this.options   = _.extend({
    endpoint: '/api',
    logLevel: 'info'
  }, options || {})
}

Router.prototype.log = function() {
  var args = Array.prototype.slice.call(arguments, 0)
    , type = args[0]

  console.log.apply(console, args.slice(0))
}

Router.prototype.isRestfulRequest = function(path) {
  return path.indexOf(this.options.endpoint) === 0
}

Router.prototype.handleRequest = function(method, path, callback) {
  var regex = new RegExp("^" + this.options.endpoint + "/([^/]+)/?([^/]+)?$")
    , match = path.match(regex)

  if (!!match) {
    var modelName  = match[1]
      , identifier = match[2]

    if ((method === 'GET') && !!modelName && !identifier) {
      this.log('GET', modelName)

      var daoFactory = this.findDAOFactory(modelName)

      if (!!daoFactory) {
        daoFactory
          .findAll()
          .success(function(entries) { this.handleSuccess(entries, callback) }.bind(this))
          .error(function(err) { this.handleError(err, callback) }.bind(this))
      } else {
        this.handleError("Unknown DAOFactory: " + modelName, callback)
      }

    }
  } else {
    this.handleError('Route does not match known patterns.', callback)
  }
}

Router.prototype.handleError = function(msg, callback) {
  callback({
    status:  'error',
    message: msg
  })
}

Router.prototype.handleSuccess = function(data, callback) {
  callback({
    status: 'success',
    data:   data.map(function(entry) { return entry.values })
  })
}

Router.prototype.findDAOFactory = function(modelName) {
  return this.sequelize.daoFactoryManager.getDAO(modelName, { attribute: 'tableName' })
}
