
const state = "PA";
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function getPenssylvaniaClousers(req, res) {
  const API_KEY_LOG = "pdsvcevntdftg01";
  const API_KEY_PASS = req.headers["x-proxy-token"]; // тимчасово для тесту

  try {
    if (!API_KEY_LOG || !API_KEY_PASS) {
      return res.status(400).json({
        ok: false,
        error: `[${state} 511] Missing API credentials`,
      });
    }

    const auth = Buffer.from(`${API_KEY_LOG}:${API_KEY_PASS}`).toString("base64");

    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const paRes = await fetchWithTimeout(
          "https://eventsdata.dot.pa.gov/liveEvents",
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${auth}`,
              Accept: "application/json",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            },
          },
          45000
        );

        if (!paRes.ok) {
          const text = await paRes.text().catch(() => "");
          return res.status(paRes.status).json({
            ok: false,
            status: paRes.status,
            statusText: paRes.statusText,
            body: text.slice(0, 500),
          });
        }

        const data = await paRes.json();

        return res.status(200).json({
          ok: true,
          data,
        });
      } catch (error) {
        lastError = error;
        console.warn(`[PA 511 proxy] attempt ${attempt} failed`, {
          error: error?.message || String(error),
          cause: error?.cause ? String(error.cause) : null,
        });

        if (attempt < 3) {
          await sleep(1500 * attempt);
        }
      }
    }

    return res.status(504).json({
      ok: false,
      error: lastError?.message || "Proxy request failed",
      cause: lastError?.cause ? String(lastError.cause) : null,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.stack || error?.message || String(error),
    });
  }
}
module.exports = {getPenssylvaniaClousers}