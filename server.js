// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Serve index.html
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// Model to use
const GEMINI_MODEL = "gemini-2.5-flash";

// Helper to call Gemini REST API
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment");

  const url = `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500, // increased to avoid truncation
      candidateCount: 1
    }
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const json = await resp.json().catch(() => {
    throw new Error(`Non-JSON response from Gemini (status ${resp.status})`);
  });

  if (!resp.ok) {
    const msg = json?.error?.message || JSON.stringify(json);
    const e = new Error(`Gemini API error (${resp.status}): ${msg}`);
    e.status = resp.status;
    e.body = json;
    throw e;
  }

  // Safely parse text from first candidate
  let text = "";
  try {
    const candidates = json?.response?.candidates ?? json?.candidates;
    if (Array.isArray(candidates) && candidates.length > 0) {
      const first = candidates[0];
      const parts = first?.content?.parts ?? [first?.content];
      if (Array.isArray(parts)) {
        text = parts.map((p) => p?.text ?? "").join("");
      } else if (typeof first?.content?.text === "string") {
        text = first.content.text;
      }
    }
    if (!text && typeof json?.text === "string") text = json.text;
  } catch {
    text = "";
  }

  return { raw: json, text };
}

// POST endpoint
app.post("/generate", async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: "Topic is required" });

  try {
    const prompt = `Generate 5 unique, creative, and practical tasks for the topic "${topic}". Format them as a numbered list.`;

    const { text, raw } = await callGemini(prompt);

    if (!text || text.trim() === "") {
      console.error("Empty Gemini text response:", raw);
      return res.status(500).json({
        error: "Empty response from Gemini",
        raw
      });
    }

    return res.json({ tasks: text });
  } catch (err) {
    console.error("❌ Gemini API Error:", err);
    const status = err.status || 500;
    const message = err.message || "Error generating tasks (see server logs)";
    return res.status(status).json({ error: message, details: err.body ?? null });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
