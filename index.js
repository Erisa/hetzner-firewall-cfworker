/* global WORKER_SECRET, API_TOKEN, FIREWALL_ID, PORTS, fetch, addEventListener */

addEventListener('fetch', (event) => {
  if (typeof WORKER_SECRET !== 'undefined' && event.request.headers.get('Authorization') != WORKER_SECRET) {
    event.respondWith(new Response('Unauthorized for manual calls.', {
      status: 403
    }))
    return
  }

  event.respondWith(handleRequest(event.request)
    .catch((err) => new Response(err.message, { status: 500 }))
  )
})

addEventListener('scheduled', event => {
  event.waitUntil(handleRequest(event))
})

async function handleRequest (event) {
  if (API_TOKEN === undefined) {
    return new Response('API_TOKEN is not defined. Please define it.', {
      status: 403
    })
  }

  const portList = PORTS.split(',')

  // get IPs, error if not 200
  const ipv4List = await fetchList('https://www.cloudflare.com/ips-v4/')
  const ipv6Lst = await fetchList('https://www.cloudflare.com/ips-v6/')

  // compile list into rules
  const rules = compileRules(ipv4List, portList)
  rules.concat(compileRules(ipv6Lst, portList))

  // rename the firewall
  // error if this fails

  const time = new Date()

  const firewallInitResp = await fetch(`https://api.hetzner.cloud/v1/firewalls/${FIREWALL_ID}`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Cloudflare ' + time.toISOString()
    })
  }
  )

  if (firewallInitResp.status !== 200) {
    console.log('Failed to init Firewall: ' + await firewallInitResp.text())
    throw 'Failed to init Firewall'
  }

  // add all the rules
  const finalResp = await fetch(`https://api.hetzner.cloud/v1/firewalls/${FIREWALL_ID}/actions/set_rules`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rules
    })
  }
  )

  return finalResp
}

async function fetchList (url) {
  const resp = await fetch(url)

  if (resp.status !== 200) {
    throw 'Failed to fetch ' + url
  } else {
    return (await resp.text()).split(/\r?\n/)
  }
}

function compileRules (list, ports) {
  const builtRules = []

  ports.forEach(port => {
    builtRules.push({
      direction: 'in',
      source_ips: list,
      protocol: 'tcp',
      port
    })
  })

  return builtRules
}
