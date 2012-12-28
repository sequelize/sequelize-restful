var Router = require('./router')

module.exports = function(sequelize, options) {
  var router = new Router(sequelize, options)

  return function(req, res, next) {
    if (router.isRestfulRequest(req.path)) {
      router.handleRequest(req, res)
    } else {
      next()
    }
  }
}
