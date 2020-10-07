import url from 'url';
import http from 'http';
import https from 'https';
import LRU from 'lru-cache';
import createDebug from 'debug';
import { getProxyForUrl } from 'proxy-from-env';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { PacProxyAgent, protocols as pacProtocols } from 'pac-proxy-agent';
import {
	Agent,
	AgentCallbackReturn,
	ClientRequest,
	RequestOptions
} from 'agent-base';
import { ProxyAgentOptions } from '.';

const debug = createDebug('proxy-agent');

/**
 * Number of `http.Agent` instances to cache.
 *
 * This value was arbitrarily chosen... a better
 * value could be conceived with some benchmarks.
 */
const cacheSize = 20;

/**
 * Cache for `http.Agent` instances.
 */
const cache = new LRU(cacheSize);

/**
 * Built-in proxy types.
 */
const proxies = new Map<string, (opts: object, secureEndpoint: boolean) => void>();
proxies.set('http',  httpOrHttpsProxy);
proxies.set('https', httpOrHttpsProxy);
proxies.set('socks', SocksProxyAgent);
proxies.set('socks4', SocksProxyAgent);
proxies.set('socks4a', SocksProxyAgent);
proxies.set('socks5', SocksProxyAgent);
proxies.set('socks5h', SocksProxyAgent);

for (const protocol of pacProtocols) {
  proxies.set(`pac+${protocol}`, PacProxyAgent);
}

function httpOrHttps(opts, secureEndpoint) {
  if (secureEndpoint) {
    // HTTPS
    return https.globalAgent;
  } else {
    // HTTP
    return http.globalAgent;
  }
}

function httpOrHttpsProxy(opts, secureEndpoint) {
  if (secureEndpoint) {
    // HTTPS
    return new HttpsProxyAgent(opts);
  } else {
    // HTTP
    return new HttpProxyAgent(opts);
  }
}

function mapOptsToProxy(opts) {
  // `NO_PROXY` case
  if (!opts) {
    return {
      uri: 'no proxy',
      fn: httpOrHttps
    };
  }

  if ('string' == typeof opts) opts = url.parse(opts);

  var proxies;
  if (opts.proxies) {
    proxies = Object.assign({}, exports.proxies, opts.proxies);
  } else {
    proxies = exports.proxies;
  }

  // get the requested proxy "protocol"
  var protocol = opts.protocol;
  if (!protocol) {
    throw new TypeError('You must specify a "protocol" for the ' +
                        'proxy type (' + Object.keys(proxies).join(', ') + ')');
  }

  // strip the trailing ":" if present
  if (':' == protocol[protocol.length - 1]) {
    protocol = protocol.substring(0, protocol.length - 1);
  }

  // get the proxy `http.Agent` creation function
  var proxyFn = proxies[protocol];
  if ('function' != typeof proxyFn) {
    throw new TypeError('unsupported proxy protocol: "' + protocol + '"');
  }

  // format the proxy info back into a URI, since an opts object
  // could have been passed in originally. This generated URI is used
  // as part of the "key" for the LRU cache
  return {
    opts: opts,
    uri: url.format({
      protocol: protocol + ':',
      slashes: true,
      auth: opts.auth,
      hostname: opts.hostname || opts.host,
      port: opts.port
    }),
    fn: proxyFn,
  }
}

/**
 * Attempts to get an `http.Agent` instance based off of the given proxy URI
 * information.
 *
 * An LRU cache is used, to prevent unnecessary creation of proxy
 * `http.Agent` instances.
 *
 * @param {String} uri proxy url
 * @api public
 */
export default class ProxyAgent extends Agent {
	constructor(_opts?: string | ProxyAgentOptions) {
		const opts: ProxyAgentOptions = typeof _opts === 'string' ? url.parse(_opts) : _opts;
		debug('Creating new ProxyAgent instance: %o', opts);
		super(opts || {});

		const proxy = mapOptsToProxy(opts);
		this.proxy = proxy.opts;
		this.proxyUri = proxy.uri;
		this.proxyFn = proxy.fn;
	}

	/**
	 * Called when the node-core HTTP client library is creating a new HTTP request.
	 *
	 * @api protected
	 */
	async callback(
		req: ClientRequest,
		opts: RequestOptions
	): Promise<AgentCallbackReturn> {
		var proxyOpts = this.proxy;
		var proxyUri = this.proxyUri;
		var proxyFn = this.proxyFn;

		// if we did not instantiate with a proxy, set one per request
		if (!proxyOpts) {
			var urlOpts = getProxyForUrl(opts);
			var proxy = mapOptsToProxy(urlOpts, opts);
			proxyOpts = proxy.opts;
			proxyUri = proxy.uri;
			proxyFn = proxy.fn;
		}

		// create the "key" for the LRU cache
		var key = proxyUri;
		if (opts.secureEndpoint) key += ' secure';

		// attempt to get a cached `http.Agent` instance first
		var agent = exports.cache.get(key);
		if (!agent) {
			// get an `http.Agent` instance from protocol-specific agent function
			agent = proxyFn(proxyOpts, opts.secureEndpoint);
			if (agent) {
				exports.cache.set(key, agent);
			}
		} else {
			debug('cache hit with key: %o', key);
		}

		if (!proxyOpts) {
			agent.addRequest(req, opts);
		} else {
			// XXX: agent.callback() is an agent-base-ism
			agent.callback(req, opts, fn);
		}
	}
}
