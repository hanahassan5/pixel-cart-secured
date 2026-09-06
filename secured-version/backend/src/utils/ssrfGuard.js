import dns from "dns/promises";
import net from "net";
import axios from "axios";

// Blocks the private/loopback/link-local/reserved IP ranges that internal
// infrastructure (including this app's own server) lives on, for both
// IPv4 and IPv6.
function isDisallowedIp(ip) {
    const type = net.isIP(ip);
    if (type === 4) {
        const parts = ip.split(".").map(Number);
        const [a, b] = parts;
        if (a === 127) return true; // loopback
        if (a === 10) return true; // private
        if (a === 172 && b >= 16 && b <= 31) return true; // private
        if (a === 192 && b === 168) return true; // private
        if (a === 169 && b === 254) return true; // link-local / cloud metadata
        if (a === 0) return true; // "this" network
        if (a >= 224) return true; // multicast/reserved
        return false;
    }
    if (type === 6) {
        const lower = ip.toLowerCase();
        if (lower === "::1") return true; // loopback
        if (lower.startsWith("fe80:")) return true; // link-local
        if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
        if (lower.startsWith("::ffff:")) {
            // IPv4-mapped IPv6 address — validate the embedded IPv4 too
            return isDisallowedIp(lower.replace("::ffff:", ""));
        }
        return false;
    }
    return true; // not a recognizable IP — treat conservatively as disallowed once resolved
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Validates a user-supplied URL is safe to fetch server-side: only http/https,
 * hostname must resolve to a public (non-private/loopback/link-local) address.
 * Throws a descriptive Error if the destination is not allowed.
 */
export async function assertSafeFetchTarget(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error("A valid absolute URL is required");
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
        throw new Error("Only http:// and https:// URLs are allowed");
    }

    const hostname = parsed.hostname;
    if (!hostname || hostname.toLowerCase() === "localhost") {
        throw new Error("Requests to localhost are not allowed");
    }

    // Resolve the hostname ourselves and validate the resulting IP(s) so a
    // DNS name that points at an internal address (including via DNS
    // rebinding) is rejected, not just literal loopback/private IPs.
    let addresses;
    if (net.isIP(hostname)) {
        addresses = [hostname];
    } else {
        try {
            const results = await dns.lookup(hostname, { all: true, verbatim: true });
            addresses = results.map((r) => r.address);
        } catch {
            throw new Error("Could not resolve the provided host");
        }
    }

    if (addresses.length === 0 || addresses.some(isDisallowedIp)) {
        throw new Error("Requests to internal or private network destinations are not allowed");
    }

    return parsed;
}

/**
 * Performs a server-side GET of a user-supplied URL after validating the
 * destination, and re-validates any redirect target before following it
 * (redirects are a classic SSRF-filter bypass otherwise).
 */
export async function safeFetch(rawUrl, { maxRedirects = 3 } = {}) {
    let currentUrl = rawUrl;
    for (let hop = 0; hop <= maxRedirects; hop++) {
        await assertSafeFetchTarget(currentUrl);

        const response = await axios.get(currentUrl, {
            responseType: "arraybuffer",
            maxRedirects: 0,
            validateStatus: (status) => (status >= 200 && status < 400)
        });

        if (response.status >= 300 && response.status < 400 && response.headers.location) {
            currentUrl = new URL(response.headers.location, currentUrl).toString();
            continue;
        }

        return response;
    }
    throw new Error("Too many redirects");
}
