import { Agent, AgentOptions } from 'agent-base';

declare module ProxyAgent {
	interface ProxyAgent extends Agent {
    }
}

declare const proxy: ProxyAgentConstructor;

type ProxyAgentOptions = AgentOptions | {
	getProxyForUrl: (url: string) => string;
}

interface ProxyAgentConstructor {
    (options?: ProxyAgentOptions | string): ProxyAgent.ProxyAgent;
    new (options?: ProxyAgentOptions | string): ProxyAgent.ProxyAgent;
}

export = proxy;
