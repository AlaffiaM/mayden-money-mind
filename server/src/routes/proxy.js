import express from "express";
import { EXTERNAL_API_BASE_URL } from "../config/env.js";

const router = express.Router();

// Proxy handler for GET /venues
const handleGetVenues = async (req, res) => {
  try {
    const externalUrl = `${EXTERNAL_API_BASE_URL}/api/venues`;
    const response = await fetch(externalUrl, {
      method: "GET",
      headers: {
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
};

// Proxy handler for POST /subscribe
const handlePostSubscribe = async (req, res) => {
  try {
    const externalUrl = `${EXTERNAL_API_BASE_URL}/api/subscribe`;
    const response = await fetch(externalUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward any relevant headers from the incoming request if needed
        ...req.headers,
      },
      body: JSON.stringify(req.body),
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
};

// Proxy GET /api/proxy/venues -> external API /api/venues
router.get("/venues", handleGetVenues);

// Proxy POST /api/proxy/subscribe -> external API /api/subscribe
router.post("/subscribe", handlePostSubscribe);

export { router, handleGetVenues, handlePostSubscribe };