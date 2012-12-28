var buster = require('buster')
  , Router = require('../lib/router')

buster.spec.expose()

describe('Router', function() {
  describe('isRestfulRequest', function() {
    it('returns true if the default route was used', function() {
      expect(new Router().isRestfulRequest('/api/photos')).toBeTrue()
    })

    it('returns false if another route was used', function() {
      expect(new Router().isRestfulRequest('/fnord/photos')).toBeFalse()
    })

    it('returns true if the optional route was used', function() {
      var router = new Router(null, { endpoint: '/fnord' })
      expect(router.isRestfulRequest('/fnord/photos')).toBeTrue()
    })
  })
})
