var _           = require('lodash')
  , querystring = require('querystring')

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

  console.log.apply(console, args.slice(1))
}

Router.prototype.isRestfulRequest = function(path) {
  return path.indexOf(this.options.endpoint) === 0
}

Router.prototype.handleRequest = function(method, path, body, callback) {
  var regex = new RegExp("^" + this.options.endpoint + "/?([^/]+)?/?([^/]+)?$")
    , match = path.match(regex)

  if (!!match) {
    var modelName  = match[1]
      , identifier = match[2]

    this.log('info', method, path + ":", { modelName: modelName, identifier: identifier })

    if ((method === 'GET') && (path === this.options.endpoint)) {
      // GET /api
      handleIndex.call(this, callback)
    } else if (!!modelName && !identifier) {
      // requested path: /api/dao_factory

      switch(method) {
        case "GET":
          handleResourceIndex.call(this, modelName, callback)
          break
        case "HEAD":
          handleResourceDescribe.call(this, modelName, callback)
          break
        case "POST":
          // handleResourceCreate.call(this, modelName)
          console.log(body)
          break
      }
    } else if ((method === 'GET') && !!modelName && !!identifier) {
      // GET /api/dao_factory/1
      handleResourceShow.call(this, modelName, identifier, callback)
    } else {
      this.handleError('Route does not match known patterns.', callback)
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

Router.prototype.handleSuccess = function(data, optionsOrCallback, callback) {
  if (typeof optionsOrCallback === 'function') {
    callback          = optionsOrCallback
    optionsOrCallback = {}
  }

  callback({
    status: 'success',
    data:   data
  }, optionsOrCallback)
}

Router.prototype.findDAOFactory = function(modelName) {
  return this.sequelize.daoFactoryManager.getDAO(modelName, { attribute: 'tableName' })
}

/////////////
// private //
/////////////

var handleIndex = function(callback) {
  var daos   = this.sequelize.daoFactoryManager.daos
    , result = []

  result = daos.map(function(dao) {
    return {
      name:      dao.name,
      tableName: dao.tableName
    }
  })

  this.handleSuccess(result, callback)
}

var handleResourceIndex = function(modelName, callback) {
  var daoFactory = this.findDAOFactory(modelName)

  if (!!daoFactory) {
    daoFactory
      .findAll()
      .success(function(entries) {
        entries = entries.map(function(entry) { return entry.values })
        this.handleSuccess(entries, callback)
      }.bind(this))
      .error(function(err) {
        this.handleError(err, callback)
      }.bind(this))
  } else {
    this.handleError("Unknown DAOFactory: " + modelName, callback)
  }
}

var handleResourceDescribe = function(modelName, callback) {
  var daoFactory = this.findDAOFactory(modelName)

  if (!!daoFactory) {
    this.handleSuccess({
      name:       daoFactory.name,
      tableName:  daoFactory.tableName,
      attributes: daoFactory.rawAttributes,
    }, {
      viaHeaders: true
    }, callback)
  } else {
    this.handleError("Unknown DAOFactory: " + modelName, callback)
  }
}

var handleResourceShow = function(modelName, identifier, callback) {
  var daoFactory = this.findDAOFactory(modelName)

  if (!!daoFactory) {
    daoFactory
      .find({ where: { id: identifier }})
      .success(function(entry) {
        this.handleSuccess(entry.values, callback)
      }.bind(this))
      .error(function(err) {
        this.handleError(err, callback)
      }.bind(this))
  } else {
    this.handleError("Unknown DAOFactory: " + modelName, callback)
  }
}

