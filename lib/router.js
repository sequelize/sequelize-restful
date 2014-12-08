var _           = require('lodash')
  , querystring = require('querystring')

var Router = module.exports = function(sequelize, options) {
  this.sequelize = sequelize
  this.options   = _.extend({
    endpoint: '/api',
    logLevel: 'info',
    allowed: new Array()
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

Router.prototype.splitPath = function(path){
  var regex = new RegExp("^" + this.options.endpoint + "/?([^/]+)?/?([^/]+)?/?([^/]+)?/?([^/]+)?$")
    , match = path.match(regex)
    , rest_params = new Array();

  if (match) {
    for(var i=1; i < match.length; i++){
      if (typeof match[i] != 'undefined'){
        rest_params.push(match[i])
      }
    }
  }

  return rest_params
}

Router.prototype.handleRequest = function(req, callback) {

  var match = this.splitPath(req.path)

  switch(match.length) {
    case 0: // requested path: /api

      if ((req.method === 'GET') && (req.path === this.options.endpoint)) {
        handleIndex.call(this, callback)
      }else{
        this.handleError('Route does not match known patterns.', callback)
      }
      break

    case 1: // requested path: /api/dao_factory

      var modelName = match[0]

      if (this.isAllowed(modelName)){
        switch(req.method) {
          case "GET":
            handleResourceIndex.call(this, modelName, req.query, callback)
            break
          case "HEAD":
            handleResourceDescribe.call(this, modelName, callback)
            break
          case "POST":
            handleResourceCreate.call(this, modelName, req.body, callback)
            break
          default:
            this.handleError('Method not available for this pattern.', callback)
            break
        }
      }else{
        this.handleError('Route does not match known patterns.', callback)
      }

      break
    case 2: // requested path: /api/dao_factory/1

      var modelName = match[0]
      var identifier = match[1]
      // identifier must be a number
      if (parseInt(identifier) === NaN || !this.isAllowed(modelName)){
        this.handleError('Route does not match known patterns.', callback)
      }else{

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
          default:
            this.handleError('Method not available for this pattern.', callback)
            break
        }

      }

      break
    case 3: // requested path: /api/dao_factory/1/associated_dao_factory

      var modelName = match[0]
      var identifier = match[1]
      var associatedModelName = match[2]
      // identifier must be a number
      if (parseInt(identifier) === NaN || !this.isAllowed(modelName) || !this.isAllowed(associatedModelName)){
        this.handleError('Route does not match known patterns.', callback)
      } else {
        switch(req.method) {
          case 'GET':
            handleResourceIndexAssociation.call(this, modelName, identifier, associatedModelName, callback)
            break
          case 'DELETE':
            // Search for a 1:1 / N:1 association. If it exists, we can dereference the target.
            // Otherwise we will raise an error.
            this.findSingleAssociatedModel(modelName, identifier, associatedModelName, function(err, associatedModel) {
              if (!!associatedModel) {
                handleResourceDeleteAssociation.call(this, modelName, identifier, associatedModelName, associatedModel.id, callback)
              } else {
                this.handleError('Method not available for this pattern.', callback)
              }
            }.bind(this))

            break
          // Add more handlers for others methods
          default:
            this.handleError('Method not available for this pattern.', callback)
            break
        }

      }

      break
    case 4: // requested path: /api/dao_factory/1/associated_dao_factory/1

      var modelName = match[0]
      var identifier = match[1]
      var associatedModelName = match[2]
      var associatedIdentifier = match[3]
      // identifier and associatedIdentifier must be numbers
      if (parseInt(identifier) === NaN || associatedIdentifier === NaN || !this.isAllowed(modelName) || !this.isAllowed(associatedModelName)){
        this.handleError('Route does not match known patterns.', callback)
      } else {

        switch(req.method) {
          case 'DELETE':
            handleResourceDeleteAssociation.call(this, modelName, identifier, associatedModelName, associatedIdentifier, callback)
            break
          // Add more handlers for others methods
          default:
            this.handleError('Method not available for this pattern.', callback)
            break
        }

      }
      break
    default:
      this.handleError('Route does not match known patterns.', callback)
      break
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

Router.prototype.findAssociation = function(daoFactory, associatedModelName) {
  for (var key in  daoFactory.associations){
    var hasAssociationAccessor = (daoFactory.associations[key].associationAccessor === associatedModelName)
      , hasTargetTableName     = (daoFactory.associations[key].target.tableName === associatedModelName)

    if (hasAssociationAccessor || hasTargetTableName) {
      return daoFactory.associations[key]
      break
    }
  }

  return null
}

Router.prototype.findSingleAssociatedModel = function(modelName, identifier, associatedModelName, callback) {
  var daoFactory  = this.findDAOFactory(modelName)
    , association = !!daoFactory ? this.findAssociation(daoFactory, associatedModelName) : null

  if (association.associationType !== 'BelongsTo') {
    association = null
  }

  if (!!association) {
    daoFactory.find(identifier).done(function(err, dao) {
      if (err) {
        callback(err, null)
      } else {
        dao[association.accessors.get]().success(function(associatedModel) {
          callback(null, associatedModel)
        })
      }
    })
  } else {
    callback(new Error('Unable to find ' + modelName + ' with identifier ' + identifier), null)
  }
}

Router.prototype.isAllowed = function(modelName){
  if (this.options.allowed.length > 0){
    return (this.options.allowed.indexOf(modelName) != -1)
  }else{
    return true
  }
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

  if (this.options.allowed.length > 0){
    var allowed = this.options.allowed
    result = result.filter(function(element){
      return (allowed.indexOf(element.tableName) != -1)
    })
  }

  this.handleSuccess(result, callback)
}

var handleResourceIndex = function(modelName, query, callback) {
  var daoFactory = this.findDAOFactory(modelName)

  var where = (!!query) ? { where: query } : {};

  if (!!daoFactory) {
    daoFactory
      .findAll(where)
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
        if (!entry){
          this.handleSuccess({}, callback)
        }else{
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
        if (!entry){
          this.handleSuccess({}, callback)
        }else{
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

var handleResourceUpdate = function(modelName, identifier, attributes, callback) {
  var daoFactory = this.findDAOFactory(modelName)

  if (!!daoFactory) {
    daoFactory
      .find({ where: { id: identifier } })
      .success(function(entry) {
        if (!entry){
          this.handleError("This object doesn't exists", callback)
        }else{
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

        if (!entry){
          this.handleError("This object doesn't exists", callback)
        }else{
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

var handleResourceIndexAssociation = function(modelName,identifier,associatedModelName,callback){
  var daoFactory  = this.findDAOFactory(modelName)
    , association = !!daoFactory ? this.findAssociation(daoFactory, associatedModelName) : null

  if (!!association){
    daoFactory
      .find(identifier)
      .success(function(entry) {
        if (!entry) {
          this.handleSuccess({}, callback)
        } else {
          entry[association.accessors.get]()
            .success(function(entries){
              // depending on the type of the association,
              // entries will be either an array or a single instance.
              if (Array.isArray(entries)) {
                entries = entries.map(function(entry) { return entry.values })
              } else {
                entries = entries.values
              }

              this.handleSuccess(entries, callback)
            }.bind(this))
        }
      }.bind(this))
      .error(function(err) {
        this.handleError(err, callback)
      }.bind(this))
  } else {
    this.handleError("Wrong association or some unknown DAOFactory: " + modelName + " and/or " + associatedModelName, callback)
  }
}

var handleResourceDeleteAssociation = function(modelName,identifier,associatedModelName,associatedIdentifier,callback){
  var daoFactory           = this.findDAOFactory(modelName)
    , association          = !!daoFactory ? this.findAssociation(daoFactory, associatedModelName) : null
    , associatedDaoFactory = !!association ? association.target : null

  if (!!associatedDaoFactory) {
    daoFactory
      .find({ where: { id: identifier }})
      .success(function(parent) {
        associatedDaoFactory
          .find({ where: { id: associatedIdentifier }})
            .success(function(child) {
              if (association.associationType === 'BelongsTo') {
                parent[association.accessors.set](null).success(function(){
                  this.handleSuccess({}, callback)
                }.bind(this))
                .error(function(err){
                  this.handleError(err, callback)
                }.bind(this))
              } else {
                parent[association.accessors.remove](child).success(function(){
                  this.handleSuccess({}, callback)
                }.bind(this))
                .error(function(err){
                  this.handleError(err, callback)
                }.bind(this))
              }
          }.bind(this))
          .error(function(err) {
            this.handleError(err, callback)
          }.bind(this))
      }.bind(this))
      .error(function(err) {
        this.handleError(err, callback)
      }.bind(this))
  } else {
    this.handleError("Wrong association or some unknown DAOFactory: " + modelName + " and/or " + associatedModelName, callback)
  }
}

