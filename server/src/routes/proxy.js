import express from "express";
import { EXTERNAL_API_BASE_URL } from "../config/env.js";

const router = express.Router();

// Proxy GET /api/proxy/venues -> external API /api/venues
router.get("/venues", async (req, res) => {
  try {
    const externalUrl = `${EXTERNAL_API_BASE_URL}/api/venues`;
    const response = await fetch(externalUrl, {
      method: "GET",
      headers: {
        // Forward any relevant headers from the incoming request if needed
        // For example, you could forward Authorization, etc.
        // Accept: response type
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `External API error: ${response.statusText}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(502).json({ error: "Bad Gateway", details: err.message });
  }
});

export default router;