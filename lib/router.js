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

Router.prototype.handleRequest = function(req, callback) {
  var regex = new RegExp("^" + this.options.endpoint + "/?([^/]+)?/?([^/]+)?$")
    , match = req.path.match(regex)

  if (!!match) {
    var modelName  = match[1]
      , identifier = match[2]

    this.log('info', req.method, req.path + ":", { modelName: modelName, identifier: identifier })

    if ((req.method === 'GET') && (req.path === this.options.endpoint)) {
      // GET /api
      handleIndex.call(this, callback)
    } else if (!!modelName && !identifier) {
      // requested path: /api/dao_factory

      switch(req.method) {
        case "GET":
          handleResourceIndex.call(this, modelName, callback)
          break
        case "HEAD":
          handleResourceDescribe.call(this, modelName, callback)
          break
        case "POST":
          handleResourceCreate.call(this, modelName, req.body, callback)
          break
      }
    } else if (!!modelName && !!identifier) {
      // req /api/dao_factory/1

      switch(req.method) {
        case 'GET':
          handleResourceShow.call(this, modelName, identifier, callback)
          break
        case 'DELETE':
          handleResourceDelete.call(this, modelName, identifier, callback)
          break
        case 'PUT':
          handleResourceUpdate.call(this, modelName, identifier, req.body, callback)
          break
      }
    } else {
      this.handleError('Route does not match known patterns.',
                       {statusCode: 400}, callback)
    }
  } else {
    this.handleError('Route does not match known patterns.',
                     {statusCode: 400}, callback)
  }
}

Router.prototype.handleError = function(msg, optionsOrCallback, callback) {
  if (typeof optionsOrCallback === 'function') {
    callback          = optionsOrCallback
    optionsOrCallback = {}
  }

  callback({
    status:  'error',
    message: msg
  }, optionsOrCallback)
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
        if(!entry){
          this.handleError(modelName + " entry " + identifier +
                           " does not exist", callback)
        } else {
          this.handleSuccess(entry.values, callback)
        }
      }.bind(this))
      .error(function(err) {
        this.handleError(err, callback)
      }.bind(this))
  } else {
    this.handleError("Unknown DAOFactory: " + modelName, callback)
  }
}

var handleResourceCreate = function(modelName, attributes, callback) {
  var daoFactory = this.findDAOFactory(modelName)

  if (!!daoFactory) {
    daoFactory
      .create(attributes)
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

var handleResourceUpdate = function(modelName, identifier, attributes, callback) {
  var daoFactory = this.findDAOFactory(modelName)

  if (!!daoFactory) {
    daoFactory
      .find({ where: { id: identifier } })
      .success(function(entry) {
        if(!entry){
          this.handleError(modelName + " entry " + identifier +
                           " does not exist", callback)
        } else {
          entry.updateAttributes(attributes).complete(function(err, entry) {
            if (err) {
              this.handleError(err, callback)
            } else {
              this.handleSuccess(entry.values, callback)
            }
          }.bind(this))
        }
      }.bind(this))
      .error(function(err) {
        this.handleError(err, callback)
      }.bind(this))
  } else {
    this.handleError("Unknown DAOFactory: " + modelName, callback)
  }
}

var handleResourceDelete = function(modelName, identifier, callback) {
  var daoFactory = this.findDAOFactory(modelName)

  if (!!daoFactory) {
    daoFactory
      .find({ where: { id: identifier }})
      .success(function(entry) {
        if(!entry){
          this.handleError(modelName + " entry " + identifier +
                           " does not exist", callback)
        } else {
          entry
            .destroy()
            .complete(function(err) {
              if (err) {
                this.handleError(err, callback)
              } else {
                this.handleSuccess({}, callback)
              }
            }.bind(this))
        }
      }.bind(this))
      .error(function(err) {
        this.handleError(err, callback)
      }.bind(this))
  } else {
    this.handleError("Unknown DAOFactory: " + modelName, callback)
  }
}
