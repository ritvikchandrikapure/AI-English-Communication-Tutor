
const MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.1-flash-lite";
const REQUEST_TIMEOUT_MS = 12000;

export async function ask(prompt) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;

  if (!key) {
    throw new Error(
      "Gemini API key missing. Add VITE_GEMINI_API_KEY to your .env file."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  let data;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                reply: { type: "STRING" },
                correction: { type: "STRING" },
                explanation: { type: "STRING" },
                alternative: { type: "STRING" },
                tip: { type: "STRING" },
              },
              required: ["reply", "correction", "explanation", "alternative", "tip"],
            },
            maxOutputTokens: 1024,
          },
        }),
      }
    );
    data = await res.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The AI tutor took too long to respond. Please try again.");
    }
    throw new Error(`Could not connect to the AI tutor: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(
      data.error?.message || `Gemini API request failed (${res.status})`
    );
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) throw new Error("Gemini returned an empty response. Please try again.");

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned an invalid JSON response.");
  }
  if(!result||typeof result!=="object"||Array.isArray(result)||typeof result.reply!=="string"){
    throw new Error("Gemini returned an incomplete response. Please try again.");
  }
  return result;
}


// ---- Fast path: stream the answer instantly, coach in parallel ----
const BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
const FAST_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.1-flash-lite";

// Streams plain-text reply; calls onText(fullTextSoFar) on every chunk.
export async function streamReply(prompt, onText, signal) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key missing. Add VITE_GEMINI_API_KEY to your .env file.");
  const res = await fetch(`${BASE}${FAST_MODEL}:streamGenerateContent?alt=sse&key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) throw new Error(`Gemini API request failed (${res.status})`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      try {
        const j = JSON.parse(line.slice(5).trim());
        const t = j.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
        if (t) { full += t; onText(full); }
      } catch { /* ignore partial line */ }
    }
  }
  if (!full.trim()) throw new Error("Empty reply");
  return full.trim();
}

// Coach only: returns {correction, explanation, alternative, tip}
export async function coachCheck(prompt, signal) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  const res = await fetch(`${BASE}${FAST_MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            correction: { type: "STRING" }, explanation: { type: "STRING" },
            alternative: { type: "STRING" }, tip: { type: "STRING" },
          },
          required: ["correction", "explanation", "alternative", "tip"],
        },
        maxOutputTokens: 1024,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Coach request failed (${res.status})`);
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
  return JSON.parse(text);
}


// ---- Vocabulary: any topic (English/Hindi/Hinglish), fast, cached, auto-retry ----
const vocabCache = new Map();

async function vocabOnce(topic, level, levelHint, signal, native = "") {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key missing. Add VITE_GEMINI_API_KEY to your .env file.");
  const res = await fetch(`${BASE}${FAST_MODEL}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text:
        `Give exactly 6 useful English vocabulary words or phrases about the topic "${topic}" for ${level} learners. ${levelHint} ` +
        `The topic may be written in English, Hindi or Hinglish; understand it and give English words. ` +
        `Each item: word (English), meaning (short, simple English), example (one short English sentence using the word). No emojis.` + (native ? ` Also add "translation": the word translated into ${native}, written in its native script.` : "") }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: { word: { type: "STRING" }, meaning: { type: "STRING" }, example: { type: "STRING" }, translation: { type: "STRING" } },
            required: ["word", "meaning", "example"],
          },
        },
        maxOutputTokens: 1024,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Gemini API request failed (${res.status})`);
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
  const list = JSON.parse(text);
  const ok = Array.isArray(list) ? list.filter(i => i && i.word && i.meaning && i.example) : [];
  if (ok.length < 4) throw new Error("Vocabulary response was incomplete.");
  return ok.slice(0, 6);
}

export async function askVocab(topic, level, levelHint, native = "") {
  const k = `${level}|${native}|${topic.toLowerCase()}`;
  if (vocabCache.has(k)) return vocabCache.get(k);
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const words = await vocabOnce(topic, level, levelHint, controller.signal, native);
      vocabCache.set(k, words);
      return words;
    } catch (e) {
      lastErr = e.name === "AbortError" ? new Error("Request timed out") : e;
    } finally { clearTimeout(timer); }
  }
  throw lastErr;
}


// ---- Cloud accent voices (Gemini TTS): speaks ANY accent even if the device has no such voice ----
const TTS_MODEL = import.meta.env.VITE_GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
const TTS_VOICES = { female: "Kore", male: "Charon" };
const TTS_PACE = { slow: "slowly and clearly", normal: "at a natural pace", fast: "quickly" };
const ttsCache = new Map();
let audioCtx = null, currentSource = null, inflight = null;

export const hasCloudVoice = () => Boolean(import.meta.env.VITE_GEMINI_API_KEY);

export function stopCloudAudio() {
  if (inflight) { inflight.abort(); inflight = null; }
  if (currentSource) { try { currentSource.onended = null; currentSource.stop(); } catch { /* already stopped */ } currentSource = null; }
}

function pcmToBuffer(ctx, b64, mime) {
  const rate = Number(/rate=(\d+)/.exec(mime || "")?.[1]) || 24000;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const samples = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
  const buf = ctx.createBuffer(1, samples.length, rate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < samples.length; i++) ch[i] = samples[i] / 32768;
  return buf;
}

// Fetches (or reuses cached) speech for text in the given accent label, plays it, resolves when finished.
export async function playCloud(text, { accentLabel, languageName, gender = "female", speed = "normal", onStart } = {}) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key missing. Add VITE_GEMINI_API_KEY to your .env file.");
  stopCloudAudio();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error("This browser cannot play audio.");
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") await audioCtx.resume();

  const clean = String(text).replace(/\s+/g, " ").trim().slice(0, 600);
  const style = languageName ? `Say clearly in ${languageName}` : `Say in a clear ${accentLabel} English accent`;
  const cacheKey = `${style}|${gender}|${speed}|${clean}`;
  let raw = ttsCache.get(cacheKey);
  if (!raw) {
    const controller = new AbortController();
    inflight = controller;
    const timer = setTimeout(() => controller.abort(), 25000);
    let res, data;
    try {
      res = await fetch(`${BASE}${TTS_MODEL}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${style}, ${TTS_PACE[speed] || TTS_PACE.normal}: ${clean}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICES[gender] || TTS_VOICES.female } } },
          },
        }),
      });
      data = await res.json().catch(() => ({}));
    } finally { clearTimeout(timer); if (inflight === controller) inflight = null; }
    if (!res.ok) throw new Error(data.error?.message || `Voice request failed (${res.status})`);
    const part = data.candidates?.[0]?.content?.parts?.find(x => x.inlineData?.data);
    if (!part) throw new Error("The AI voice returned no audio. Please try again.");
    raw = { b64: part.inlineData.data, mime: part.inlineData.mimeType };
    ttsCache.set(cacheKey, raw);
    if (ttsCache.size > 60) ttsCache.delete(ttsCache.keys().next().value);
  }
  const buffer = pcmToBuffer(audioCtx, raw.b64, raw.mime);
  await new Promise(resolve => {
    const src = audioCtx.createBufferSource();
    src.buffer = buffer; src.connect(audioCtx.destination);
    src.onended = () => { if (currentSource === src) currentSource = null; resolve(); };
    currentSource = src;
    onStart?.();
    src.start();
  });
}


// ---- Translation: any language -> any language, and app-UI translation ----
async function geminiJson(prompt, schema, timeoutMs = 20000) {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key missing. Add VITE_GEMINI_API_KEY to your .env file.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res, data;
  try {
    res = await fetch(`${BASE}${FAST_MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schema, maxOutputTokens: 2048 },
      }),
    });
    data = await res.json().catch(() => ({}));
  } catch (e) {
    throw new Error(e.name === "AbortError" ? "Translation took too long. Please try again." : `Could not connect: ${e.message}`);
  } finally { clearTimeout(timer); }
  if (!res.ok) throw new Error(data.error?.message || `Request failed (${res.status})`);
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
  try { return JSON.parse(text); } catch { throw new Error("The AI returned an unreadable response. Please try again."); }
}

const translateCache = new Map();
// returns { translation, roman }  (roman = Latin-letter pronunciation for non-Latin scripts)
export async function translateText(text, fromName, toName) {
  const q = String(text).trim().slice(0, 2000);
  const k = `${fromName}>${toName}|${q}`;
  if (translateCache.has(k)) return translateCache.get(k);
  const r = await geminiJson(
    `Translate the text from ${fromName} to ${toName}. If the text is actually in another language, detect it and still translate to ${toName}. ` +
    `Keep the meaning, tone and punctuation natural. Do not add explanations or notes. ` +
    `"roman" = a simple Latin-letter pronunciation of the translation if ${toName} is not written in the Latin alphabet, otherwise an empty string.\n` +
    `Text: """${q}"""`,
    { type: "OBJECT", properties: { translation: { type: "STRING" }, roman: { type: "STRING" } }, required: ["translation", "roman"] }
  );
  if (!r || typeof r.translation !== "string" || !r.translation.trim()) throw new Error("Empty translation. Please try again.");
  const out = { translation: r.translation.trim(), roman: (r.roman || "").trim() };
  translateCache.set(k, out);
  return out;
}

// translate a {key: "English label"} object into another language, same keys
export async function translateUI(strings, langName) {
  const props = {}; for (const k of Object.keys(strings)) props[k] = { type: "STRING" };
  const r = await geminiJson(
    `Translate these app interface strings from English to ${langName} (use its native script). They are short button and label texts; keep them short and natural. ` +
    `Keep trailing punctuation such as "…" and ":" and keep the same JSON keys.\n${JSON.stringify(strings)}`,
    { type: "OBJECT", properties: props, required: Object.keys(strings) }, 30000
  );
  const out = {};
  for (const k of Object.keys(strings)) if (typeof r?.[k] === "string" && r[k].trim()) out[k] = r[k];
  if (Object.keys(out).length < Object.keys(strings).length * 0.8) throw new Error("UI translation incomplete.");
  return out;
}
