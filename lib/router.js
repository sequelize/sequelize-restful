var Router = module.exports = function(sequelize, options) {
  this.sequelize = sequelize
  this.options   = options || {}
}

Router.prototype.isRestfulRequest = function(path) {

}
