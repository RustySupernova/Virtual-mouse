const GAME_ORIGIN = 'https://html-classic.itch.zone';
const GAME_BASE = '/html/17576366/';
const CONTROLLER_ORIGIN = 'https://rustysupernova.github.io/Virtual-mouse/';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const page = await fetch(CONTROLLER_ORIGIN);
      return new Response(await page.text(), {headers: {'content-type':'text/html; charset=UTF-8','cache-control':'no-store'}});
    }
    if (url.pathname.startsWith('/game/')) {
      const suffix = url.pathname.slice('/game/'.length);
      const target = GAME_ORIGIN + GAME_BASE + suffix + url.search;
      const upstream = await fetch(target, request);
      const headers = new Headers(upstream.headers);
      headers.delete('content-security-policy');
      headers.delete('x-frame-options');
      if ((headers.get('content-type') || '').includes('text/html')) {
        let html = await upstream.text();
        html = html.replaceAll('src="/', 'src="/game/').replaceAll("src='/'", "src='/game/");
        html = html.replaceAll('href="/', 'href="/game/').replaceAll("href='/'", "href='/game/");
        return new Response(html, {status:upstream.status,headers});
      }
      return new Response(upstream.body, {status:upstream.status,headers});
    }
    return new Response('Not found', {status:404});
  }
};
