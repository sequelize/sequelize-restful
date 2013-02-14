var Router  = require('./router')
  , connect = require('connect')

module.exports = function(sequelize, options) {
  var router = new Router(sequelize, options)

  return function(req, res, next) {
    if (router.isRestfulRequest(req.path)) {
      connect.bodyParser()(req, res, function() {
        router.handleRequest(req, function(result, options) {
          options = options || {}

          if (options.viaHeaders) {
            res.header('Sequelize-Admin', JSON.stringify(result))
            res.send()
          } else {
            res.json(result)
          }
        })
      })
    } else {
      next()
    }
  }
}
