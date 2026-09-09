const GAME_ORIGIN = 'https://html-classic.itch.zone';
const GAME_BASE = '/html/17576366/';
const GAME_PAGE = 'https://bluesquirrel.itch.io/caverns-of-the-mad-mage';
const CONTROLLER_ORIGIN = 'https://rustysupernova.github.io/Virtual-mouse/';

async function fetchGame(target, request) {
  // itch.io uses a hotlink check on its HTML5 CDN. The browser request
  // reaching this worker has the worker's origin as its Referer, so forward
  // the original itch.io game page as the upstream Referer instead.
  const headers = new Headers(request.headers);
  headers.set('Referer', GAME_PAGE);
  headers.set('Origin', 'https://bluesquirrel.itch.io');
  headers.set('User-Agent', request.headers.get('User-Agent') || 'Mozilla/5.0');
  headers.delete('Cookie');

  return fetch(target, {
    method: request.method,
    headers,
    redirect: 'follow',
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
  });
}

function rewriteGameHtml(html) {
  // Keep resource URLs inside the worker's /game/ namespace so the whole
  // runtime remains same-origin with the controller.
  html = html.replaceAll('src="/', 'src="/game/');
  html = html.replaceAll("src='/'", "src='/game/");
  html = html.replaceAll('href="/', 'href="/game/');
  html = html.replaceAll("href='/'", "href='/game/");
  html = html.replaceAll('url(/', 'url(/game/');
  html = html.replaceAll('url("/', 'url("/game/');
  html = html.replaceAll("url('/", "url('/game/");
  return html;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/index.html') {
      const page = await fetch(CONTROLLER_ORIGIN, { headers: { 'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0' } });
      return new Response(await page.text(), {
        status: page.status,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          'cache-control': 'no-store'
        }
      });
    }

    if (url.pathname.startsWith('/game/')) {
      const suffix = url.pathname.slice('/game/'.length);
      const target = GAME_ORIGIN + GAME_BASE + suffix + url.search;
      const upstream = await fetchGame(target, request);
      const headers = new Headers(upstream.headers);

      // These headers would otherwise prevent our /game/ response from being
      // embedded by the controller or from being used as a same-origin frame.
      headers.delete('content-security-policy');
      headers.delete('x-frame-options');
      headers.delete('cross-origin-resource-policy');
      headers.delete('content-encoding');

      if ((headers.get('content-type') || '').includes('text/html')) {
        const html = rewriteGameHtml(await upstream.text());
        headers.set('content-type', 'text/html; charset=UTF-8');
        headers.set('cache-control', 'no-store');
        return new Response(html, { status: upstream.status, headers });
      }

      return new Response(upstream.body, { status: upstream.status, headers });
    }

    return new Response('Not found', { status: 404 });
  }
};
