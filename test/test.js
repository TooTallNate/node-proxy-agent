
/**
 * Module dependencies.
 */

var assert = require('assert');
var proxy = require('../');

describe('proxy-agent', function () {

  it('should export a "function"', function () {
    assert.equal('function', typeof proxy);
  });

  it('should throw a TypeError if no "uri" is given', function () {
    try {
      proxy();
      assert(false, 'unreachable');
    } catch (e) {
      assert.equal('TypeError', e.name);
      assert(/must pass a proxy "uri"/.test(e.message));
    }
  });

  it('should throw a TypeError if no "protocol" is given', function () {
    try {
      proxy({ host: 'foo.com', port: 3128 });
      assert(false, 'unreachable');
    } catch (e) {
      assert.equal('TypeError', e.name);
      assert(/must specify a string "protocol"/.test(e.message));
      assert(/\bhttp\b/.test(e.message));
      assert(/\bhttps\b/.test(e.message));
      assert(/\bsocks\b/.test(e.message));
    }
  });

  it('should throw a TypeError for unsupported proxy protocols', function () {
    try {
      proxy('bad://foo.com:8888');
      assert(false, 'unreachable');
    } catch (e) {
      assert.equal('TypeError', e.name);
      assert(/unsupported proxy protocol/.test(e.message));
    }
  });

  describe('"http" proxy', function () {
    describe('to "http" endpoint', function () {
      it('should return a `HttpProxyAgent` instance', function ()  {
        var agent = proxy('http://foo.com:3128', false);
        assert.equal('HttpProxyAgent', agent.constructor.name);
      });
    });
    describe('to "https" endpoint', function () {
      it('should return a `HttpsProxyAgent` instance', function ()  {
        var agent = proxy('http://foo.com:3128', true);
        assert.equal('HttpsProxyAgent', agent.constructor.name);
      });
    });
  });

  describe('"https" proxy', function () {
    describe('to "http" endpoint', function () {
      it('should return a `HttpProxyAgent` instance', function ()  {
        var agent = proxy('https://foo.com:3128', false);
        assert.equal('HttpProxyAgent', agent.constructor.name);
      });
    });
    describe('to "https" endpoint', function () {
      it('should return a `HttpsProxyAgent` instance', function ()  {
        var agent = proxy('https://foo.com:3128', true);
        assert.equal('HttpsProxyAgent', agent.constructor.name);
      });
    });
  });

  describe('"socks" proxy', function () {
    describe('to "http" endpoint', function () {
      it('should return a `SocksProxyAgent` instance', function ()  {
        var agent = proxy('socks://foo.com:3128', false);
        assert.equal('SocksProxyAgent', agent.constructor.name);
      });
    });
    describe('to "https" endpoint', function () {
      it('should return a `SocksProxyAgent` instance', function ()  {
        var agent = proxy('socks://foo.com:3128', true);
        assert.equal('SocksProxyAgent', agent.constructor.name);
      });
    });
  });

});
