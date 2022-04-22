# Hetzner Cloud Firewall automation with Cloudflare Workers

Heavily inspired by [xopez/Hetzner-Cloud-Firewall-API-examples](https://github.com/xopez/Hetzner-Cloud-Firewall-API-examples), this repository holds a Cloudflare Worker which updates a [Hetzner Cloud](https://www.hetzner.com/cloud) Firewall to use the latest list of [Cloudflare IP ranges](https://www.cloudflare.com/en-gb/ips/) on a Cron Trigger.

## Requirements
- Hetzner Cloud account
- Wrangler: `npm install -g @cloudflare/wrangler`
- Cloudflare account configured to deploy Workers

## Usage
- Create a Firewall on Hetzner Cloud that you want to set to the Cloudflare IPs.
- Set the ports you want to allow through the Firewall in the `PORTS` variable of `wrangler.toml`
- Enter the ID of the Firewall in `FIREWALL_ID`. You can find this as the nuumber after `/firewalls/` in the console URl when visiting the Firewall.
- Create a Hetzner Cloud API Token and set it with `wrangler secret put API_TOKEN`.
- (Optional) Secure your `workers.dev` domain by adding an extra secret to manual REST calls:
    - `wrangler secret put WORKER_SECRET`
    - This secret will need to be in the `Authorization` header to trigger the Worker manually over HTTPS, but only if one is present. Cron triggers are automatic and unaffected.

## Creativity

If allowing Cloudflare IPs is not your jam, it should be easy to edit `index.js` and replace the two URLs with any other URLs that produce a newline-seperated list of IP ranges, allowing you to allowlist any service you desie.

Remember to remove the `rules.concat` line if you only end up having one list.

