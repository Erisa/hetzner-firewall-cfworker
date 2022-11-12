export default {
  async fetch(request, env, ctx) {
    if (typeof env.WORKER_SECRET !== 'undefined' && request.headers.get('Authorization') != env.WORKER_SECRET) {
      return new Response('Unauthorized for manual calls.', {
        status: 403
      })
    }

    try {
      return await handleRequest(env, ctx)
    }
    catch (err) {
      return new Response(err.message, { status: 500 })
    }
  },

  async scheduled(env, ctx) {
    await handleRequest(env, ctx);
  }

}

async function handleRequest(env, ctx) {
  if (env.API_TOKEN === undefined) {
    return new Response('env.API_TOKEN is not defined. Please define it.', {
      status: 403
    })
  }

  const portList = env.PORTS.split(',')

  // get IPs, error if not 200
  const ipv4List = await fetchList('https://www.cloudflare.com/ips-v4/')
  const ipv6List = await fetchList('https://www.cloudflare.com/ips-v6/')

  // compile list into rules
  let rules = compileRules([ipv4List, ipv6List], portList)

  // rename the firewall
  // error if this fails

  const time = new Date()

  const firewallInitResp = await fetch(`https://api.hetzner.cloud/v1/firewalls/${env.FIREWALL_ID}`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + env.API_TOKEN,
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
  const finalResp = await fetch(`https://api.hetzner.cloud/v1/firewalls/${env.FIREWALL_ID}/actions/set_rules`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      rules
    })
  }
  )

  return finalResp
}

async function fetchList(url) {
  const resp = await fetch(url)

  if (resp.status !== 200) {
    throw 'Failed to fetch ' + url
  } else {
    return (await resp.text()).split(/\r?\n/)
  }
}

function compileRules(lists, ports) {
  const builtRules = []
  let ips = []

  lists.forEach(list => {
    ips = ips.concat(list)
  })

  ports.forEach(port => {
    builtRules.push({
      direction: 'in',
      source_ips: ips,
      protocol: 'tcp',
      port
    })
  })

  return builtRules
}
