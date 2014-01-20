var Router  = require('./router')
  , connect = require('connect')

module.exports = function(sequelize, options) {
  var router = new Router(sequelize, options)

  return function(req, res, next) {
    if (router.isRestfulRequest(req.path)) {
      connect.bodyParser()(req, res, function() {
        router.handleRequest(req, function(result, options) {
          options = options || {}

          var statusCode = options.statusCode || 200
          if(result.status === 'error'){
            statusCode = options.statusCode || 404
          }

          if (options.viaHeaders) {
            res.header('Sequelize-Admin', JSON.stringify(result.data))
            res.send(statusCode)
          } else {
            res.json(statusCode, result.data)
          }
        })
      })
    } else {
      next()
    }
  }
}
