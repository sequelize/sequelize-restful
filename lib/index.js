var Router = require('./router')

module.exports = function(sequelize, options) {
  var router = new Router(sequelize, options)

  return function(req, res, next) {
    if (router.isRestfulRequest(req.path)) {
      router.handleRequest(req.method, req.path, function(result, options) {
        options = options || {}

        if (options.viaHeaders) {
          res.header('Sequelize-Admin', JSON.stringify(result))
          res.send()
        } else {
          res.json(result)
        }
      })
    } else {
      next()
    }
  }
}
