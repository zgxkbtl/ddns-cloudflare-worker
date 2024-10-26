/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

type DnsRecord = {
    id: string;
    zone_id: string;
    zone_name: string;
    name: string;
    type: string;
    content: string;
    proxiable: boolean;
    proxied: boolean;
    ttl: number;
    settings: {
        flatten_cname: boolean;
    };
    meta: {
        auto_added: boolean;
        managed_by_apps: boolean;
        managed_by_argo_tunnel: boolean;
    };
    comment: string | null;
    tags: string[];
    created_on: string;
    modified_on: string;
    comment_modified_on: string;
};

type DnsRecordsResponse = {
    result: DnsRecord[];
    success: boolean;
    errors: any[];
    messages: any[];
    result_info: {
        page: number;
        per_page: number;
        count: number;
        total_count: number;
        total_pages: number;
    };
};


function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function fetchDnsRecords(subDomain: String, env: Env): Promise<DnsRecordsResponse> {
    const url = `https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/dns_records?name.contains=${subDomain}`;

    const headers = {
        "Content-Type": "application/json",
        "X-Auth-Email": env.Email,
        "X-Auth-Key": env.ZONE_API_KEY,
    };

    const response = await fetch(url, {
        method: "GET",
        headers: headers
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch DNS records: ${response.status}`);
    }

    const data: DnsRecordsResponse = await response.json();
    return data;
}

async function updateDnsRecord(ipv6: string, record: DnsRecord, env: Env): Promise<Response> {
    const url = `https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/dns_records/${record.id}`;
    const headers = {
        "Content-Type": "application/json",
        "X-Auth-Email": env.Email,
        "X-Auth-Key": env.ZONE_API_KEY,
    };

    const response = await fetch(url, {
        method: "PUT",
        headers: headers,
        body: JSON.stringify({
            type: "AAAA",
            name: record.name,
            content: ipv6,
            ttl: 1,
            proxied: false
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to update DNS record: ${response.status}`);
    }

    return response;
}

async function createDnsRecord(ipv6: string, name: string, env: Env): Promise<Response> {
    const url = `https://api.cloudflare.com/client/v4/zones/${env.ZONE_ID}/dns_records`;
    const headers = {
        "Content-Type": "application/json",
        "X-Auth-Email": env.Email,
        "X-Auth-Key": env.ZONE_API_KEY,
    };

    const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
            type: "AAAA",
            name: name,
            content: ipv6,
            ttl: 1,
            proxied: false
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to create DNS record: ${response.status}`);
    }

    return response;
}
 
export default {
	async fetch(request, env, ctx): Promise<Response> {
        // get the query parameters
        const incomingUrl = new URL(request.url);
        const searchParams = incomingUrl.searchParams;
        console.log(incomingUrl);
        if (!searchParams.has("ipv6")) {
            return new Response(
                `Please provide an IPv6 address.\n` +
                `curl https://cloudflare-ip.html.zone/\n` +
                `curl http://cloudflare-ip-v6.html.zone/\n\n` +
                `Example:\n` +
                `curl ${incomingUrl.origin}${incomingUrl.pathname}?ipv6=fe80::2265:9293:b395:59b7&name=example&pwd=1234\n`,
                {
                    status: 400,
                    headers: { "Content-Type": "text/plain" }
                }
            );
        }

        const ipv6 = searchParams.get("ipv6") as string
        const name = searchParams.get("name") || `${generateRandomString(8)}.random`;
        const password = searchParams.get("pwd") || "_EMPTY_";

        if (password !== env.DDNS_PASSWORD) {
            return new Response("Invalid password", {
                status: 401,
                headers: { "Content-Type": "text/plain" }
            });
        }

        // fetch the DNS records
        const dnsRecords = await fetchDnsRecords(name, env);
        if (dnsRecords.result.length == 1) {
            const dnsRecord = dnsRecords.result[0];
            return await updateDnsRecord(ipv6, dnsRecord, env);
        } else if (dnsRecords.result.length == 0) {
            return await createDnsRecord(ipv6, name, env);
        } else {
            const names = dnsRecords.result.map(record => record.name).join(", ");
            return new Response(`More than one record, ${names}`, {
                headers: { "Content-Type": "application/json" }
            });
        }
	},
} satisfies ExportedHandler<Env>;
