#!/usr/bin/env python3
"""
Local dev server for UkeFlow that never lets the browser cache anything.

Why this exists rather than `python3 -m http.server`: the stock handler sends no
Cache-Control at all, only Last-Modified. Chrome is then free to apply its
heuristic freshness rules and serve a stale ui.js / melody.js from memory cache
WITHOUT revalidating - so you edit a file, reload, and see the old behaviour.
That wasted a debugging session: a fretboard fix looked ineffective when the
browser was simply still running the previous script.

Usage:
    python3 serve.py            # port 8000
    python3 serve.py 8899       # explicit port
"""

import functools
import http.server
import socket
import socketserver
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    """Serves files with caching switched off in every way that matters."""

    def end_headers(self):
        # no-store defeats the memory cache too, which no-cache alone does not.
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def send_header(self, keyword, value):
        # Drop the validators entirely; with no ETag or Last-Modified there is
        # nothing for the browser to make a conditional request against, so it
        # always refetches.
        if keyword in ('Last-Modified', 'ETag'):
            return
        super().send_header(keyword, value)

    def log_message(self, fmt, *args):
        # Quieter than the default, but still shows what was requested
        sys.stderr.write("  %s\n" % (fmt % args))


def port_already_serving(port):
    """
    Whether something is already answering on this port.

    This check is necessary because binding alone will NOT tell us. The server
    binds 0.0.0.0 so a phone on the same wifi can reach it, and with
    SO_REUSEADDR set, macOS happily lets 0.0.0.0:PORT bind while another process
    holds 127.0.0.1:PORT - measured, not assumed. The bind succeeds, the banner
    prints, and every localhost request goes to the OTHER server, because the
    more specific bind wins. You then test someone else's app and wonder why
    your edits do nothing. (Port 3000 here is a Rails app.)

    A TIME_WAIT socket from a just-stopped server refuses connections, so this
    does not false-positive on a quick restart - which is why SO_REUSEADDR is
    still worth keeping.
    """
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    probe.settimeout(0.3)
    try:
        return probe.connect_ex(('127.0.0.1', port)) == 0
    finally:
        probe.close()


def fail(port, reason):
    print(f"ERROR: not serving on port {port} - {reason}", file=sys.stderr)
    print("       See what is holding it:", file=sys.stderr)
    print(f"         lsof -nP -iTCP:{port} -sTCP:LISTEN", file=sys.stderr)
    print(f"       Or use another port:  python3 serve.py {port + 1}", file=sys.stderr)
    sys.exit(1)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

    if port_already_serving(port):
        fail(port, "something is already answering there")

    # Allow an immediate restart on the same port instead of "Address already
    # in use" for a minute or so. Safe alongside the probe above.
    socketserver.TCPServer.allow_reuse_address = True

    handler = functools.partial(NoCacheHandler)

    try:
        server = socketserver.TCPServer(('', port), handler)
    except OSError as exc:
        fail(port, exc)

    with server as httpd:
        print(f"UkeFlow dev server on http://localhost:{port}  (caching disabled)")
        print(f"  app      http://localhost:{port}/index.html")
        print(f"  practice http://localhost:{port}/practice.html")
        print("Ctrl-C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nstopped")


if __name__ == '__main__':
    main()
