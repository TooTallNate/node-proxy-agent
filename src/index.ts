import net from 'net';
import tls from 'tls';
import { Url } from 'url';
import { AgentOptions } from 'agent-base';
import { OutgoingHttpHeaders } from 'http';
import _ProxyAgent from './agent';

function createProxyAgent(
	opts: string | createProxyAgent.ProxyAgentOptions
): _ProxyAgent {
	return new _ProxyAgent(opts);
}

namespace createProxyAgent {
	interface BaseProxyAgentOptions {
		headers?: OutgoingHttpHeaders;
		secureProxy?: boolean;
		host?: string | null;
		path?: string | null;
		port?: string | number | null;
	}

	export interface ProxyAgentOptions
		extends AgentOptions,
			BaseProxyAgentOptions,
			Partial<
				Omit<
					Url & net.NetConnectOpts & tls.ConnectionOptions,
					keyof BaseProxyAgentOptions
				>
			> {}

	export type ProxyAgent = _ProxyAgent;
	export const ProxyAgent = _ProxyAgent;

	createProxyAgent.prototype = _ProxyAgent.prototype;
}

export = createProxyAgent;
