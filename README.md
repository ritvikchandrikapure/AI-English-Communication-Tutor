# SpeakUp – AI English Tutor (React + Vite)

## Run
1. `npm install`
2. Copy `.env.example` to `.env` and add your Gemini API key
3. `npm run dev` and open the shown URL (use Chrome/Edge for mic + voices)

## Build
`npm run build` -> output in `dist/`

## Notes
- Features: Beginner/Intermediate/Pro modes, male/female voice, slow/normal/fast speed, 14 explanation languages, roleplay chat with corrections, speaking practice, vocabulary, quiz, XP/streak.
- Key is used directly from the browser for demo purposes. For production, move the call in `src/ai.js` to your own backend so the key stays secret.
- UI labels translated: English, Hindi, Marathi (edit the `T` object in `src/App.jsx` to add more).

- Accents: 10 English accents (American, British, Indian, Australian, Canadian, Irish, South African, New Zealand, Nigerian, Filipino). Installed device voices are used first; any accent missing on the device is spoken by Gemini TTS (`VITE_GEMINI_TTS_MODEL`, same API key). Audio is cached in memory.
- Languages: choose "My language" (18 languages: Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Arabic, Spanish, French, German, Portuguese, Japanese, Chinese, English). The app labels, coach explanations/tips and vocabulary meanings follow that language. Hindi and Marathi UI text is built in; other languages are translated once by Gemini and cached in localStorage.
- Translate tab: any language to any language, with mic input, pronunciation (romanised), listen and copy. Tutor replies have a globe button to translate into your language. Native-language speech uses device voices when available, otherwise Gemini TTS.
