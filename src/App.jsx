import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ask, streamReply, coachCheck, askVocab, playCloud, stopCloudAudio, hasCloudVoice, translateText, translateUI } from "./ai.js";
const LANGUAGES = [
  { code: "en", name: "English", native: "English", speech: "en-IN" },
  { code: "hi", name: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  { code: "mr", name: "Marathi", native: "मराठी", speech: "mr-IN" },
  { code: "bn", name: "Bengali", native: "বাংলা", speech: "bn-IN" },
  { code: "ta", name: "Tamil", native: "தமிழ்", speech: "ta-IN" },
  { code: "te", name: "Telugu", native: "తెలుగు", speech: "te-IN" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", speech: "gu-IN" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", speech: "kn-IN" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", speech: "ml-IN" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", speech: "pa-IN" },
  { code: "ur", name: "Urdu", native: "اردو", speech: "ur-PK", rtl: true },
  { code: "ar", name: "Arabic", native: "العربية", speech: "ar-SA", rtl: true },
  { code: "es", name: "Spanish", native: "Español", speech: "es-ES" },
  { code: "fr", name: "French", native: "Français", speech: "fr-FR" },
  { code: "de", name: "German", native: "Deutsch", speech: "de-DE" },
  { code: "pt", name: "Portuguese", native: "Português", speech: "pt-BR" },
  { code: "ja", name: "Japanese", native: "日本語", speech: "ja-JP" },
  { code: "zh", name: "Chinese", native: "中文", speech: "zh-CN" }
];
const getLang = code => LANGUAGES.find(l => l.code === code) || LANGUAGES[0];
const UI_EN = {
  tutor: "AI Tutor", speak: "Speaking", vocab: "Vocabulary", quiz: "Quiz", prog: "Progress", translate: "Translate",
  ph: "Type or speak here…", send: "Send", myLang: "My language", mode: "Mode", voice: "Voice", female: "Female", male: "Male",
  speed: "Speaking speed", accent: "Accent", testVoice: "Test voice", compare: "Compare accents", stop: "Stop",
  clearChat: "Clear chat", speakBtn: "Speak", listening: "Listening…", thinking: "Thinking…", correction: "Correction:", why: "Why:",
  alsoSay: "You can also say:", coachTip: "Coach tip:", translateMsg: "Translate", micIn: "Mic language", micEnglish: "English", micMine: "My language",
  topicPh: "Topic e.g. travel, office, food", speakTopic: "Speak topic", getWords: "Get new words", loading: "Loading…",
  from: "From", to: "To", swap: "Swap", translateAction: "Translate", typeHere: "Type or speak the text to translate…",
  result: "Translation", copy: "Copy", copied: "Copied", play: "Listen", pronunciation: "Pronunciation", translating: "Translating…",
  uiLoading: "Translating the app…"
};
const UI_STATIC = {
  hi: { tutor: "एआई ट्यूटर", speak: "बोलना", vocab: "शब्दावली", quiz: "क्विज़", prog: "प्रगति", translate: "अनुवाद",
    ph: "यहाँ लिखें या बोलें…", send: "भेजें", myLang: "मेरी भाषा", mode: "मोड", voice: "आवाज़", female: "महिला", male: "पुरुष",
    speed: "बोलने की गति", accent: "लहजा", testVoice: "आवाज़ सुनें", compare: "लहजे सुनें", stop: "रोकें",
    clearChat: "चैट साफ़ करें", speakBtn: "बोलें", listening: "सुन रहा हूँ…", thinking: "सोच रहा हूँ…", correction: "सुधार:", why: "कारण:",
    alsoSay: "आप ऐसे भी कह सकते हैं:", coachTip: "कोच की सलाह:", translateMsg: "अनुवाद", micIn: "माइक की भाषा", micEnglish: "अंग्रेज़ी", micMine: "मेरी भाषा",
    topicPh: "विषय जैसे यात्रा, ऑफ़िस, खाना", speakTopic: "विषय बोलें", getWords: "नए शब्द पाएँ", loading: "लोड हो रहा है…",
    from: "से", to: "में", swap: "अदला-बदली", translateAction: "अनुवाद करें", typeHere: "अनुवाद के लिए टेक्स्ट लिखें या बोलें…",
    result: "अनुवाद", copy: "कॉपी", copied: "कॉपी हो गया", play: "सुनें", pronunciation: "उच्चारण", translating: "अनुवाद हो रहा है…",
    uiLoading: "ऐप का अनुवाद हो रहा है…" },
  mr: { tutor: "एआय ट्यूटर", speak: "बोलणे", vocab: "शब्दसंग्रह", quiz: "क्विझ", prog: "प्रगती", translate: "भाषांतर",
    ph: "इथे लिहा किंवा बोला…", send: "पाठवा", myLang: "माझी भाषा", mode: "मोड", voice: "आवाज", female: "महिला", male: "पुरुष",
    speed: "बोलण्याचा वेग", accent: "उच्चार शैली", testVoice: "आवाज ऐका", compare: "उच्चार शैली ऐका", stop: "थांबवा",
    clearChat: "चॅट पुसा", speakBtn: "बोला", listening: "ऐकत आहे…", thinking: "विचार करत आहे…", correction: "दुरुस्ती:", why: "कारण:",
    alsoSay: "तुम्ही असेही म्हणू शकता:", coachTip: "कोचचा सल्ला:", translateMsg: "भाषांतर", micIn: "माइकची भाषा", micEnglish: "इंग्रजी", micMine: "माझी भाषा",
    topicPh: "विषय उदा. प्रवास, ऑफिस, जेवण", speakTopic: "विषय बोला", getWords: "नवीन शब्द मिळवा", loading: "लोड होत आहे…",
    from: "पासून", to: "मध्ये", swap: "अदलाबदल", translateAction: "भाषांतर करा", typeHere: "भाषांतरासाठी मजकूर लिहा किंवा बोला…",
    result: "भाषांतर", copy: "कॉपी", copied: "कॉपी झाले", play: "ऐका", pronunciation: "उच्चार", translating: "भाषांतर होत आहे…",
    uiLoading: "अ‍ॅपचे भाषांतर होत आहे…" }
};
const ICON_PATHS = {
  message: "M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4-.98L3 21l1.98-5.5a8.4 8.4 0 0 1-.98-4A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z",
  mic: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2m7 9v3m-4 0h8",
  book: "M12 7v14m0-14C10.5 5.7 7.8 5 3 5v14c4.8 0 7.5.7 9 2m0-14c1.5-1.3 4.2-2 9-2v14c-4.8 0-7.5.7-9 2",
  brain: "M12 18V5a3 3 0 0 0-5.7-1.3A4 4 0 0 0 4 10a4 4 0 0 0 1 7.7A3.5 3.5 0 0 0 12 18Zm0-9a3 3 0 0 1 5.7-1.3A4 4 0 0 1 20 14a4 4 0 0 1-1 7.7A3.5 3.5 0 0 1 12 18m-5-7h.01M17 11h.01M8 16h.01m7 1h.01",
  trophy: "M8 21h8m-4-4v4m-7-18h14v5a7 7 0 0 1-14 0V3Zm0 2H3v2a5 5 0 0 0 5 5m11-7h3v2a5 5 0 0 1-5 5",
  flame: "M12 22a7 7 0 0 0 7-7c0-4-3-6-4-9-.5 3-2 4-3 5-1-3-3-5-3-8-3 3-5 7-5 11a8 8 0 0 0 8 8Zm0 0a3 3 0 0 0 3-3c0-2-2-4-3-5-1 2-3 3-3 5a3 3 0 0 0 3 3Z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z",
  chart: "M3 3v18h18M8 15l4-4 4 3 5-7",
  sun: "M12 3v2m0 14v2M5.6 5.6 7 7m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z",
  user: "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  gauge: "M20 13a8 8 0 1 0-16 0m8 0 4-5m-4 5h.01M7 18h10",
  volume: "M11 5 6 9H3v6h3l5 4V5Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12",
  trash: "M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6",
  check: "m5 12 4 4L19 6",
  close: "m18 6-12 12M6 6l12 12",
  lightbulb: "M9 18h6m-5 4h4m-6-7a7 7 0 1 1 8 0c-.8.6-1 1.2-1 3h-6c0-1.8-.2-2.4-1-3Z",
  refresh: "M20 7v5h-5M4 17v-5h5m-4-3a8 8 0 0 1 13-3l2 1m-16 8-2 1a8 8 0 0 0 13 3",
  stop: "M7 7h10v10H7z",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-3.5-1L7 22l5-3 5 3-1.5-8M12 6v6m-3-3h6",
  thumbsup: "M7 10v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3Zm0 0 4-8a3 3 0 0 1 2 3v3h5a2 2 0 0 1 2 2l-2 9a2 2 0 0 1-2 2H7",
  sparkles: "m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 11 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM5 3l.7 1.3L7 5l-1.3.7L5 7l-.7-1.3L3 5l1.3-.7L5 3Z",
  arrowLeft: "m15 18-6-6 6-6m-6 6h12",
  arrowRight: "M5 12h14m-7-7 7 7-7 7",
  send: "m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13",
  badge: "M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4Zm-3 9 2 2 4-4",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z",
  copy: "M9 9h11v11H9V9ZM5 15H4V4h11v1"
};
function Icon({ name, size = 18 }) {
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICON_PATHS[name]} /></svg>
}
const LV = { Beginner: "Use very simple words and short sentences (A1-A2).", Intermediate: "Use everyday vocabulary and moderate sentences (B1-B2).", Pro: "Use advanced vocabulary, idioms and nuance (C1-C2); be demanding." };
const SPEECH_RATES = { slow: 0.65, normal: 1, fast: 1.5 };
const ACCENTS = [
  { code: "en-US", label: "American", flag: "🇺🇸" },
  { code: "en-GB", label: "British", flag: "🇬🇧" },
  { code: "en-IN", label: "Indian", flag: "🇮🇳" },
  { code: "en-AU", label: "Australian", flag: "🇦🇺" },
  { code: "en-CA", label: "Canadian", flag: "🇨🇦" },
  { code: "en-IE", label: "Irish", flag: "🇮🇪" },
  { code: "en-ZA", label: "South African", flag: "🇿🇦" },
  { code: "en-NZ", label: "New Zealand", flag: "🇳🇿" },
  { code: "en-NG", label: "Nigerian", flag: "🇳🇬" },
  { code: "en-PH", label: "Filipino", flag: "🇵🇭" }
];
const DEFAULT_ACCENT = "en-US";
const normLang = l => (l || "").replace("_", "-").toLowerCase();
const FEMALE_RE = /female|woman|zira|samantha|susan|heera|neerja|veena|karen|aria|jenny|victoria|moira|tessa|hazel|libby|sonia|serena|kate|catherine|natasha|clara|leah|luna|emily|fiona|molly|abbi|elsie|michelle|sara|joanna|nicole/i;
const MALE_RE = /(?<!fe)male|david|mark|alex|daniel|ravi|rishi|prabhat|guy|fred|george|james|ryan|oliver|arthur|william|liam|connor|thomas|richard|aaron|gordon/i;
const SENTENCES = {
  Beginner: [
    "I like to drink tea every morning.", "She is going to school today.", "Where is the nearest bus stop?",
    "My brother plays football after school.", "We are having lunch with our friends.", "Could you help me carry this bag?",
    "I usually wake up at seven o'clock.", "The children are playing in the garden.", "I would like a glass of water, please.",
    "There is a small shop near my house.", "What time does the movie start?", "I cooked dinner for my family yesterday.",
    "This is my favorite book.", "Please speak slowly so I can understand.", "We went to the park on Sunday."
  ],
  Intermediate: [
    "I have been learning English for two years.", "Could you please explain this again?", "The weather is getting better these days.",
    "I usually take the bus to work, but today I am walking.", "She has already finished the report for tomorrow's meeting.",
    "If I have enough time, I will visit my grandparents this weekend.", "We were having dinner when the phone suddenly rang.",
    "I find it easier to learn new words when I use them in a sentence.", "He has been working at this company since last summer.",
    "Would you mind telling me how to get to the railway station?", "Although the restaurant was busy, the service was excellent.",
    "I forgot to bring my umbrella, so I got caught in the rain.", "They are planning to move to a bigger apartment next year.",
    "I have never tried Indian food this spicy before.", "Practising a little every day helps me feel more confident."
  ],
  Pro: [
    "Notwithstanding the challenges, we exceeded our quarterly targets.", "Her eloquence captivated the entire audience.",
    "Thorough preparation is the cornerstone of successful negotiation.", "Had I known about the delay, I would have taken an earlier train.",
    "The proposal is compelling; nevertheless, its long-term costs warrant closer scrutiny.",
    "By the time the conference began, the researchers had already published their findings.",
    "Effective communication hinges not merely on clarity, but also on attentive listening.",
    "The company revised its strategy in response to rapidly shifting market conditions.",
    "Were it not for her timely intervention, the project might have missed its deadline.",
    "His explanation was nuanced enough to address the concerns of both parties.",
    "Despite initial reservations, the team ultimately embraced the unfamiliar approach.",
    "The evidence suggests a correlation, although it does not establish causation.",
    "She articulated her disagreement diplomatically without undermining her colleague's position.",
    "The initiative aims to streamline operations while preserving the quality of service.",
    "A measured response is often more effective than an impulsive reaction."
  ]
};
const VOCABULARY = {
  daily: [
    ["routine", "A regular way of doing things", "I follow the same morning routine every day."],
    ["appointment", "An arranged meeting at a specific time", "I have a doctor's appointment at noon."],
    ["borrow", "To use something and return it later", "May I borrow your pen for a minute?"],
    ["comfortable", "Feeling relaxed and free from discomfort", "These shoes are comfortable for walking."],
    ["choose", "To select from several options", "You can choose any book you like."],
    ["nearby", "Close to a place", "There is a grocery store nearby."]
  ],
  food: [
    ["ingredient", "One of the foods used to make a dish", "Fresh tomatoes are the main ingredient in this sauce."],
    ["flavour", "The taste of food or drink", "This soup has a rich flavour."],
    ["boil", "To heat a liquid until it bubbles", "Boil the water before adding the pasta."],
    ["menu", "A list of food and drinks available", "Could I see the menu, please?"],
    ["delicious", "Having a very pleasant taste", "The meal was delicious."],
    ["order", "To ask for food or drinks", "We would like to order two cups of tea."]
  ],
  travel: [
    ["luggage", "Bags and cases used when travelling", "Please keep your luggage with you."],
    ["departure", "The act of leaving a place", "Our departure is scheduled for eight in the morning."],
    ["reservation", "An arrangement to keep a place or service for you", "I have a hotel reservation under my name."],
    ["platform", "प्लेटफ़ॉर्म", "The train is waiting at platform three."],
    ["destination", "The place you are travelling to", "We reached our destination before sunset."],
    ["direction", "Information about which way to go", "Could you give me directions to the airport?"]
  ],
  work: [
    ["deadline", "The latest time something must be finished", "We need to finish the project before the deadline."],
    ["colleague", "A person you work with", "I discussed the plan with my colleague."],
    ["schedule", "A plan that lists times for activities", "My schedule is full this afternoon."],
    ["improve", "To make something better", "We are working to improve customer service."],
    ["attend", "To be present at an event or meeting", "I will attend the team meeting tomorrow."],
    ["efficient", "Working well without wasting time or effort", "This is an efficient way to organize the files."]
  ]
};
const QUIZ_QUESTIONS = {
  Beginner: [
    { q: "She ___ to school every day.", options: ["go", "goes", "going", "gone"], answer: 1, why: "Use 'goes' with she, he, or it in the simple present." },
    { q: "I ___ a student.", options: ["am", "is", "are", "be"], answer: 0, why: "Use 'am' with the subject 'I'." },
    { q: "What is the past tense of 'play'?", options: ["plays", "playing", "played", "play"], answer: 2, why: "Add -ed to most verbs to make the simple past." },
    { q: "There ___ two apples on the table.", options: ["is", "am", "are", "be"], answer: 2, why: "Use 'are' with plural nouns like 'two apples'." },
    { q: "Which word means the opposite of 'hot'?", options: ["warm", "cold", "dry", "bright"], answer: 1, why: "'Cold' is the opposite of 'hot'." },
    { q: "We have ___ umbrella.", options: ["a", "an", "thee", "some"], answer: 1, why: "Use 'an' before a vowel sound, as in 'umbrella'." },
    { q: "They ___ dinner right now.", options: ["cook", "cooks", "are cooking", "cooked"], answer: 2, why: "Use 'are + verb-ing' for an action happening now." },
    { q: "Choose the correct question.", options: ["Where you live?", "Where do you live?", "Where does you live?", "Where are live you?"], answer: 1, why: "Use 'do' before 'you' to ask a simple present question." },
    { q: "There isn't ___ milk in the fridge.", options: ["many", "a few", "any", "several"], answer: 2, why: "Use 'any' in negative sentences with uncountable nouns." },
    { q: "My sister is ___ than me.", options: ["tall", "taller", "tallest", "more tall"], answer: 1, why: "Use '-er' to compare most short adjectives." }
  ],
  Intermediate: [
    { q: "I ___ English for three years.", options: ["learn", "am learning", "have been learning", "learned"], answer: 2, why: "Use the present perfect continuous for an activity that started in the past and continues now." },
    { q: "If it rains tomorrow, we ___ at home.", options: ["stayed", "would stay", "will stay", "stay yesterday"], answer: 2, why: "Use 'will + verb' in the result clause of a real future condition." },
    { q: "The email ___ yesterday afternoon.", options: ["sent", "was sent", "is sending", "has send"], answer: 1, why: "Use 'was + past participle' to form the simple past passive." },
    { q: "She said that she ___ tired.", options: ["is", "was", "will", "be"], answer: 1, why: "In reported speech, present 'is' commonly changes to past 'was'." },
    { q: "You ___ wear a seat belt; it's the law.", options: ["might", "could", "must", "would"], answer: 2, why: "'Must' expresses a strong obligation or rule." },
    { q: "By the time we arrived, the film ___.", options: ["starts", "has started", "had started", "will start"], answer: 2, why: "Use past perfect for an action completed before another past action." },
    { q: "He is interested ___ learning Spanish.", options: ["on", "at", "in", "for"], answer: 2, why: "The adjective 'interested' is followed by the preposition 'in'." },
    { q: "This is the café ___ we first met.", options: ["who", "where", "which person", "whose"], answer: 1, why: "Use 'where' to refer to a place." },
    { q: "I wish I ___ more free time.", options: ["have", "will have", "had", "am having"], answer: 2, why: "Use the simple past after 'I wish' to describe a situation you want to be different now." },
    { q: "Despite ___ late, he finished the report.", options: ["be", "being", "was", "been"], answer: 1, why: "A preposition such as 'despite' is followed by a noun or an -ing form." }
  ],
  Pro: [
    { q: "Rarely ___ such a compelling argument.", options: ["I have heard", "have I heard", "I heard have", "heard I have"], answer: 1, why: "A negative adverb at the beginning requires subject–auxiliary inversion." },
    { q: "Had she ___ earlier, she would have caught the train.", options: ["leave", "to leave", "left", "leaving"], answer: 2, why: "This is an inverted third conditional. 'Had she left' means 'If she had left'." },
    { q: "The committee recommended that the proposal ___ revised.", options: ["is", "was", "be", "will be"], answer: 2, why: "After 'recommend that', formal English uses the base form 'be'." },
    { q: "Neither the manager nor the assistants ___ available.", options: ["was", "is", "were", "has been"], answer: 2, why: "With 'neither...nor', the verb agrees with the nearer subject, 'assistants'." },
    { q: "Her account was plausible, ___ not entirely convincing.", options: ["albeit", "whereas", "unless", "thereby"], answer: 0, why: "'Albeit' means 'although' and introduces a contrast." },
    { q: "The findings, ___ in a peer-reviewed journal, attracted attention.", options: ["publishing", "published", "having publish", "were published"], answer: 1, why: "The past participle 'published' forms a reduced passive relative clause." },
    { q: "No sooner ___ the announcement than the audience applauded.", options: ["did she finish", "she had finished", "had she finished", "she finishes"], answer: 2, why: "'No sooner' at the start takes inversion and is followed by the past perfect." },
    { q: "His remarks were ambiguous; they could be interpreted in two ___ ways.", options: ["distinct", "distinguished", "distinguishing", "distinction"], answer: 0, why: "'Distinct' means clearly different; it correctly modifies 'ways'." },
    { q: "If the data ___ more carefully, the error would have been detected.", options: ["were analysed", "had been analysed", "would analyse", "has analysed"], answer: 1, why: "The third conditional passive uses 'if + had been + past participle'." },
    { q: "The CEO's apology did little to ___ public concern.", options: ["allay", "elude", "elicit", "assert"], answer: 0, why: "'Allay' means to reduce or calm a fear or concern." }
  ]
};

function store(k, v) { try { if (v === undefined) { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null } localStorage.setItem(k, JSON.stringify(v)) } catch (e) { return null } }
function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[items[i], items[j]] = [items[j], items[i]] }
  return items
}
function getOfflineVocabulary(topic) {
  const normalized = topic.toLowerCase();
  const category = /food|cook|restaurant|meal|drink|fruit|vegetable/.test(normalized) ? "food"
    : /travel|airport|hotel|train|flight|holiday|trip/.test(normalized) ? "travel"
      : /work|office|business|job|career|meeting/.test(normalized) ? "work" : "daily";
  return { category, words: shuffle([...VOCABULARY[category]]).slice(0, 6) }
}
function analyzeOfflineEnglish(text) {
  const input = text.trim().replace(/\s+/g, " ");
  let corrected = input;
  const explanations = [];
  const tips = [];
  const apply = (pattern, replacement, explanation, tip) => {
    if (pattern.test(corrected)) {
      const updated = corrected.replace(pattern, replacement);
      if (updated !== corrected) {
        corrected = updated;
        explanations.push(explanation);
        tips.push(tip);
      }
    }
  };
  apply(/\bin\s+(have|am|will|want|can|think)\b/i, (_, v) => "I " + v, "Use the pronoun \"I\" (not \"in\") before the verb.", "Start with \"I\" + verb: I have, I am, I want.");
  apply(/\b(go|going|went|come|coming|came)\s+(goa|delhi|mumbai|pune|nagpur|india|home)\b/i, (_, v, place) => v + (place.toLowerCase() === "home" ? " " : " to ") + (place.toLowerCase() === "home" ? "home" : place[0].toUpperCase() + place.slice(1).toLowerCase()), "After go/come, a place needs \"to\" (go to Goa). Names of places start with a capital letter.", "Say \"go to + place\", but \"go home\" has no \"to\".");
  apply(/\bhpow\b/i, "how", "“Hpow” is a spelling error; the correct spelling is “how.”", "Check the spelling of question words such as who, what, when, where, and how.");
  apply(/\b(?:feek[=]?ling|feelingg|feling|fealing|feeking)\b/i, "feeling", "“Feeling” was misspelled; the correct spelling is “feeling.”", "When spelling “feeling,” use one “l” after “fee”: f-e-e-l-i-n-g.");
  apply(/\bim\b/i, "I'm", "Use the apostrophe in the contraction “I'm” (= “I am”).", "Write “I'm” with an apostrophe.");
  apply(/\b(dont|doesnt|didnt|isnt|arent|cant|wont|wouldnt|couldnt)\b/i, (_, word) => ({ dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", arent: "aren't", cant: "can't", wont: "won't", wouldnt: "wouldn't", couldnt: "couldn't" })[word.toLowerCase()], "English contractions need an apostrophe (for example, “don't”).", "Add an apostrophe in contractions such as “don't,” “can't,” and “isn't.”");
  apply(/\bi am do well\b/i, "I am doing well", "For a current state, say “I am doing well,” not “I am do well.”", "After “am,” use an adjective or a verb ending in “-ing.”");
  apply(/\bi'm\s+do\s+well\b/i, "I'm doing well", "For a current state, say “I'm doing well,” not “I'm do well.”", "After “I'm,” use an adjective or an -ing verb form.");
  apply(/\bi'm\s+(do|go|eat|learn|work|study|play|speak|try)\b/i, (_, verb) => `I'm ${{ do: "doing", go: "going", eat: "eating", learn: "learning", work: "working", study: "studying", play: "playing", speak: "speaking", try: "trying" }[verb.toLowerCase()]}`, "After “I'm,” use a verb ending in “-ing” for an action happening now.", "Use “I'm” + verb-ing for an action happening now.");
  apply(/\bhow are you in the rain\b/i, "How are you doing in the rain", "“How are you doing?” is the natural question form here; “in the rain” adds the situation.", "Use “How are you doing?” to ask how someone feels or is managing.");
  apply(/\bh?ow\s+are\s+you\s+in\s+the\s+rain\b/i, "How are you doing in the rain", "“How are you doing?” is the natural question form here; “in the rain” adds the situation.", "Use “How are you doing?” to ask how someone feels or is managing.");
  apply(/\bhow\s+you\s+(doing|feeling|are)\b/i, (_, ending) => ending.toLowerCase() === "are" ? "How are you" : "How are you $1", "Questions with “how” need the auxiliary verb before the subject: “How are you…?”", "In questions, say “How are you…?” rather than “How you…?”");
  apply(/\bi\s+is\b/i, "I am", "Use “am” with the subject “I.”", "Remember: “I am,” not “I is.”");
  apply(/\b(you|we|they)\s+is\b/i, "$1 are", "Use “are” with you, we, and they.", "Remember: “you/we/they are.”");
  apply(/\b(you|we|they)\s+was\b/i, "$1 were", "Use “were” with you, we, and they in the past.", "Remember: “you/we/they were.”");
  apply(/\b(he|she|it)\s+(am|are)\b/i, (_, subject) => `${subject} is`, "Use “is” with he, she, or it.", "Remember: “he/she/it is.”");
  apply(/\b(he|she|it)\s+(have)\b/i, "$1 has", "Use “has” with he, she, or it.", "Remember: “I/you/we/they have,” but “he/she/it has.”");
  apply(/\b(he|she|it)\s+(go|like|play|work|live|want|need|speak|use|learn|do|eat|watch|come)\b/i, (_, subject, verb) => `${subject} ${{ go: "goes", like: "likes", play: "plays", work: "works", live: "lives", want: "wants", need: "needs", speak: "speaks", use: "uses", learn: "learns", do: "does", eat: "eats", watch: "watches", come: "comes" }[verb.toLowerCase()]}`, "In the simple present, add “-s” or “-es” after he, she, or it.", "Check subject–verb agreement: “she works,” “he goes.”");
  apply(/\b(he|she|it)\s+(don't)\b/i, "$1 doesn't", "Use “doesn't,” not “don't,” with he, she, or it.", "Use “doesn't” with he, she, or it.");
  apply(/\b(i|you|we|they)\s+(doesn't)\b/i, (_, subject) => `${subject} don't`, "Use “don't” with I, you, we, and they; use “doesn't” with he, she, and it.", "Match “don't/doesn't” to the subject.");
  apply(/\ba\s+(hour|honest|honour|heir)\b/i, "an $1", "These words begin with a vowel sound, so use “an.”", "Choose “a” or “an” by the first sound, not just the first letter.");
  apply(/\ba\s+(?!university\b|user\b|useful\b|uniform\b|european\b|one\b)([aeiou][a-z]+)\b/i, "an $1", "Use “an” before a vowel sound.", "Use “an” before a vowel sound, as in “an apple.”");
  apply(/\ban\s+(?!hour\b|honest\b|honour\b|heir\b|herb\b)([bcdfghjklmnpqrstvwxyz][a-z]+)\b/i, "a $1", "Use “a” before a consonant sound.", "Use “a” before a consonant sound, as in “a book.”");
  apply(/\b(yes|no|okay|sure)(?:\s*,?\s*\1)+\b[, ]*/i, (_, word) => `${word}, `, "Repeated “yes” is unnecessary here; say it once and use a comma before the rest of the sentence.", "Avoid repeating the same response word; one clear “yes” sounds more natural.");
  apply(/^(yes|no|okay|sure)\s+(?=\w)/i, "$1, ", "Use a comma after a short response such as “yes” or “no.”", "Add a comma after “yes” or “no” when the sentence continues.");
  apply(/\bthank you[, ]+(today|now|yesterday|this morning|this afternoon)\b/i, "Thank you. $1", "Use a full stop to separate “Thank you” from your next idea.", "Use a full stop when you move to a new idea.");
  apply(/\bi\s+am\s+agree(?:ing)?\b/i, "I agree", "“Agree” is a verb, so it does not need “am.”", "Say “I agree,” not “I am agree.”");
  apply(/\bi\s+am\s+(learn|work|study|play|go|eat|speak|try)\b/i, "I am $1ing", "For an action happening now, use “am” + a verb ending in “-ing.”", "For actions happening now, use “I am” + verb-ing.");
  apply(/\bi\s+(learning|working|studying|playing|going|eating|speaking|trying)\b/i, (_, verb) => `I am ${verb}`, "For an action happening now, add “am” before the verb ending in “-ing.”", "For actions happening now, use “I am” + verb-ing.");
  apply(/\b(he|she|it)\s+don't\b/i, "$1 doesn't", "Use “doesn't,” not “don't,” with he, she, or it.", "Use “doesn't” with he, she, or it.");
  apply(/\bi\s+has\b/i, "I have", "Use “have” with “I”; use “has” with he, she, or it.", "Remember: “I have,” but “he/she has.”");
  apply(/\bi\s+am\s+(student|teacher|doctor|engineer|manager|beginner|learner)\b/i, "I am a $1", "Use “a” before a singular job or role, for example “I am a student.”", "Use “a” before one person or job: “I am a student.”");
  apply(/\bdidn't\s+(went|ate|saw|came|took|made|got|had|did)\b/i, (_, verb) => `didn't ${({ went: "go", ate: "eat", saw: "see", came: "come", took: "take", made: "make", got: "get", had: "have", did: "do" })[verb.toLowerCase()]}`, "After “didn't,” use the base form of the verb (for example, “didn't go”).", "After “didn't,” use the base verb: go, eat, see.");
  apply(/\b(yesterday|last night|last week|last month)\b([^.!?]*?)\bi\s+go\b/i, "$1$2I went", "For a finished past action, use “went,” not “go.”", "With “yesterday” or “last week,” use the past-tense verb.");
  corrected = corrected.replace(/\benglish\b/g, "English").replace(/\bi\b/g, "I").replace(/^([a-z])/, letter => letter.toUpperCase());
  corrected = corrected.replace(/([.!?]\s+)([a-z])/g, (_, punctuation, letter) => punctuation + letter.toUpperCase());
  if (!/[.!?]$/.test(corrected)) corrected += /^(how|what|when|where|who|whom|whose|which|why|can|could|would|will|do|does|did|is|are|am|have|has)\b/i.test(corrected) ? "?" : ".";
  return {
    input,
    corrected,
    explanations: explanations.slice(0, 2),
    hasCorrection: explanations.length > 0,
    alternative: /\bi am feeling lonely\b/i.test(input)
      ? "I've been feeling lonely lately."
      : /\bi like to\b/i.test(input)
        ? "I enjoy doing that."
        : /\bi am fine\b/i.test(input)
          ? "I'm doing well, thank you."
          : "",
    tip: tips[0] || "Offline mode: I cannot fully check grammar right now, so do not trust this as \"correct\". Fix the AI connection for real coaching."
  };
}
function offlineCoachReply(text, turn = 0) {
  const analysis = analyzeOfflineEnglish(text);
  const normalized = analysis.input.toLowerCase();
  let replies;
  let tip = analysis.tip;
  if (/\b(good morning|good afternoon|good evening|hello|hi|hey)\b/.test(normalized)) {
    replies = ["Hello! How are you today?", "Hi! What are you up to today?", "Good to hear from you! How has your day been?"];
    tip = "Try replying with a complete sentence, such as “I'm doing well, thank you.”";
  } else if (/\bhow are you\b/.test(normalized)) {
    replies = ["I'm doing well, thank you! What have you been doing today?", "I'm great, thanks for asking. How is your day going?", "Pretty good, thank you! What are you practising today?"];
    tip = "You can answer with “I'm…” and add a detail about your day.";
  } else if (/\b(weather|sunny|rainy|cloudy)\b/.test(normalized)) {
    replies = ["Talking about the weather is great practice. Is it sunny or rainy where you are?", "I can't check your local weather, but I'd love to hear about it. What's the weather like today?", "Useful topic! What kind of weather do you enjoy most?"];
    tip = "Useful phrase: “It's sunny/cloudy/rainy today.”";
  } else if (/\b(learning|learn|english|study|studying)\b/.test(normalized)) {
    replies = ["That's great! What do you find most difficult about learning English?", "Nice work practising English! How long have you been learning?", "That's a good goal. Where do you usually practise speaking English?"];
    tip = "Add a reason with “because” to make your answer more detailed.";
  } else if (/\b(my name is|i am called|i'm called)\b/.test(normalized)) {
    replies = ["Nice to meet you! What do you enjoy doing in your free time?", "It's lovely to meet you! Where are you from?", "Thanks for introducing yourself! What do you do during the day?"];
    tip = "After introducing yourself, add one thing you enjoy.";
  } else if (/\b(i like|i love|i enjoy|my favourite|my favorite)\b/.test(normalized)) {
    replies = ["That sounds interesting! What do you like most about it?", "Lovely! How did you get interested in that?", "Nice! How often do you get to enjoy it?"];
    tip = "Add a reason with “because” to make your answer more detailed.";
  } else if (/\b(lonely|loneliness|feeling alone)\b/.test(normalized)) {
    replies = ["I'm sorry you're feeling lonely. Would you like to tell me what's been happening?", "That sounds difficult. Is there someone you trust whom you could talk to today?", "I'm here to listen. What usually helps you feel more connected?"];
    tip = "A natural way to express this is “I've been feeling lonely lately.”";
  } else if (/\b(yesterday|last night|last week|last month)\b/.test(normalized)) {
    replies = ["What else did you do?", "How did you feel about it?", "Would you like to do that again?"];
    tip = "With past-time words such as “yesterday,” use a past-tense verb.";
  } else {
    replies = ["That's interesting. What happened next?", "I see! Could you tell me a little more about that?", "Thanks for sharing. How did that make you feel?", "What do you like most about it?"];
  }
  return {
    text: replies[turn % replies.length],
    fix: analysis.hasCorrection ? analysis.corrected : "",
    exp: analysis.explanations.join(" "),
    correct: !analysis.hasCorrection,
    alternative: analysis.alternative,
    tip
  };
}
function useSpeech(gender, speed, accent) {
  const [voices, setVoices] = useState([]);
  const [compareLabel, setCompareLabel] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState("");
  const reqId = useRef(0);
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const f = () => setVoices(speechSynthesis.getVoices());
    f(); speechSynthesis.addEventListener?.("voiceschanged", f);
    if (!speechSynthesis.addEventListener) speechSynthesis.onvoiceschanged = f;
    return () => { speechSynthesis.removeEventListener?.("voiceschanged", f); stopCloudAudio(); speechSynthesis.cancel() };
  }, []);
  // how many installed device voices exist for each accent
  const available = useMemo(() => {
    const m = {};
    for (const a of ACCENTS) m[a.code] = voices.filter(v => normLang(v.lang) === a.code.toLowerCase()).length;
    return m;
  }, [voices]);
  const cloudOk = hasCloudVoice();
  // accents missing on this device are spoken by the AI cloud voice instead
  const usesCloud = code => cloudOk && !available[code];
  const pickVoice = useCallback((code) => {
    const en = voices.filter(v => /^en/i.test(v.lang));
    const wanted = gender === "female" ? FEMALE_RE : MALE_RE;
    const opposite = gender === "female" ? MALE_RE : FEMALE_RE;
    const exactList = en.filter(v => normLang(v.lang) === code.toLowerCase());
    const byGender = list => list.find(v => wanted.test(v.name)) || list.find(v => !opposite.test(v.name));
    if (exactList.length) return { voice: byGender(exactList) || exactList[0], exact: true, genderOk: !!byGender(exactList) };
    const order = [code, "en-GB", "en-US", "en-IN"].map(c => c.toLowerCase());
    for (const c of order) {
      const list = en.filter(v => normLang(v.lang) === c);
      if (list.length) return { voice: byGender(list) || list[0], exact: false, genderOk: !!byGender(list) };
    }
    return { voice: byGender(en) || en[0] || null, exact: false, genderOk: !!byGender(en) };
  }, [voices, gender]);
  const makeUtterance = useCallback((text, code) => {
    const u = new SpeechSynthesisUtterance(text);
    const { voice, genderOk } = pickVoice(code);
    u.lang = code;
    if (voice) u.voice = voice;
    if (!genderOk) u.pitch = gender === "female" ? 1.25 : 0.75;
    u.rate = SPEECH_RATES[speed] || SPEECH_RATES.normal;
    return u;
  }, [pickVoice, gender, speed]);
  const speakDevice = useCallback((text, code) => new Promise(resolve => {
    if (!window.speechSynthesis) return resolve();
    const u = makeUtterance(text, code);
    u.onend = resolve; u.onerror = resolve;
    speechSynthesis.speak(u);
  }), [makeUtterance]);
  const stop = useCallback(() => {
    reqId.current++; window.speechSynthesis?.cancel(); stopCloudAudio();
    setCompareLabel(""); setCloudBusy(false);
  }, []);
  // speak(text) uses the chosen English accent; speak(text, language) speaks in that language
  const speak = useCallback((text, target) => {
    stop(); setCloudError("");
    const id = reqId.current;
    if (target && target.code !== "en") {
      const base = target.speech.split("-")[0].toLowerCase();
      const list = voices.filter(v => normLang(v.lang).split("-")[0] === base);
      const wanted = gender === "female" ? FEMALE_RE : MALE_RE, opposite = gender === "female" ? MALE_RE : FEMALE_RE;
      const pool = list.filter(v => normLang(v.lang) === target.speech.toLowerCase());
      const choose = l => l.find(v => wanted.test(v.name)) || l.find(v => !opposite.test(v.name)) || l[0];
      const deviceSpeak = voice => {
        if (!window.speechSynthesis) return;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = target.speech; if (voice) u.voice = voice;
        u.rate = SPEECH_RATES[speed] || SPEECH_RATES.normal;
        speechSynthesis.speak(u);
      };
      if (list.length) { deviceSpeak(choose(pool.length ? pool : list)); return; }
      if (cloudOk) {
        setCloudBusy(true);
        playCloud(text, { languageName: target.name, gender, speed, onStart: () => id === reqId.current && setCloudBusy(false) })
          .catch(e => { if (id !== reqId.current || e.name === "AbortError") return; setCloudError(e.message || "AI voice failed."); deviceSpeak(null); })
          .finally(() => { if (id === reqId.current) setCloudBusy(false) });
        return;
      }
      deviceSpeak(null); return;
    }
    const a = ACCENTS.find(x => x.code === accent);
    if (usesCloud(accent)) {
      setCloudBusy(true);
      playCloud(text, { accentLabel: a.label, gender, speed, onStart: () => id === reqId.current && setCloudBusy(false) })
        .catch(e => {
          if (id !== reqId.current || e.name === "AbortError") return;
          setCloudError(e.message || "AI voice failed.");
          speakDevice(text, accent); // graceful fallback to a device voice
        })
        .finally(() => { if (id === reqId.current) setCloudBusy(false) });
    } else speakDevice(text, accent);
  }, [stop, accent, gender, speed, voices, available, cloudOk, speakDevice]);
  // play the same sentence in every accent: device voice if installed, otherwise AI cloud voice
  const compare = useCallback(async (text = "Nice to meet you.") => {
    stop(); setCloudError("");
    const id = reqId.current;
    let failed = 0;
    for (const a of ACCENTS) {
      if (id !== reqId.current) return;
      const line = `${a.label}. ${text}`;
      try {
        if (available[a.code] > 0) { setCompareLabel(`${a.flag} ${a.label}`); await speakDevice(line, a.code); }
        else if (cloudOk) {
          setCompareLabel(`${a.flag} ${a.label} (loading…)`);
          await playCloud(line, { accentLabel: a.label, gender, speed, onStart: () => id === reqId.current && setCompareLabel(`${a.flag} ${a.label}`) });
        }
      } catch (e) { if (e.name !== "AbortError") failed++; }
    }
    if (id === reqId.current) { setCompareLabel(""); if (failed) setCloudError(`${failed} accent(s) could not be generated (API limit or network). Try again in a minute.`) }
  }, [stop, available, cloudOk, gender, speed, speakDevice]);
  const info = pickVoice(accent);
  const cloud = usesCloud(accent);
  return { speak, compare, stop, available, compareLabel, cloud, cloudOk, cloudBusy, cloudError,
    activeVoice: cloud ? `Gemini AI voice (${gender === "female" ? "Kore" : "Charon"})` : (info.voice?.name || ""), exact: info.exact, ready: voices.length > 0 };
}

function useUiStrings(code) {
  const [dyn, setDyn] = useState(null);
  const [uiLoading, setUiLoading] = useState(false);
  useEffect(() => {
    if (code === "en" || UI_STATIC[code]) { setDyn(null); setUiLoading(false); return; }
    const cached = store("su_ui_" + code);
    setDyn(cached || null);
    if (cached || !hasCloudVoice()) return;
    let off = false; setUiLoading(true);
    translateUI(UI_EN, getLang(code).name)
      .then(r => { if (off) return; store("su_ui_" + code, r); setDyn(r) })
      .catch(e => console.error("UI translation failed", e))
      .finally(() => { if (!off) setUiLoading(false) });
    return () => { off = true };
  }, [code]);
  const t = useMemo(() => ({ ...UI_EN, ...(UI_STATIC[code] || dyn || {}) }), [code, dyn]);
  return { t, uiLoading };
}

function useVoiceInput() {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; recognitionRef.current.onerror = null;
      recognitionRef.current.abort(); recognitionRef.current = null
    }
    setListening(false)
  }, []);
  const start = useCallback((onResult, language = "en-IN") => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setError("");
    if (!Recognition) {
      setError("Voice input is not supported in this browser. Please use the latest Chrome or Edge.");
      return false;
    }
    if (!window.isSecureContext) {
      setError("Microphone access requires HTTPS or localhost. Open this app at localhost or enable HTTPS.");
      return false;
    }
    if (recognitionRef.current) recognitionRef.current.abort();
    let receivedSpeech = false; let failed = false;
    try {
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = language;
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.onstart = () => setListening(true);
      recognition.onresult = event => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) { receivedSpeech = true; onResult(transcript) }
      };
      recognition.onerror = event => {
        failed = true;
        const errors = {
          "not-allowed": "Microphone permission is blocked. Allow microphone access for this site in Chrome's address-bar settings.",
          "service-not-allowed": "Chrome's speech recognition service is blocked. Allow microphone and speech-recognition access, then try again.",
          "audio-capture": "No microphone was found. Connect or enable a microphone and try again.",
          "no-speech": "No speech was detected. Tap the mic and speak clearly.",
          "network": "Speech recognition needs an internet connection. Check your connection and try again."
        };
        if (event.error !== "aborted") setError(errors[event.error] || `Microphone error: ${event.error}. Check browser microphone permissions and try again.`);
        setListening(false);
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setListening(false);
        if (!receivedSpeech && !failed) setError("No speech was detected. Tap the mic and speak clearly.");
      };
      recognition.start();
      setListening(true);
      return true;
    } catch (e) {
      recognitionRef.current = null;
      setListening(false);
      setError(e.message || "Could not start the microphone. Check browser permissions and try again.");
      return false;
    }
  }, []);
  useEffect(() => () => { if (recognitionRef.current) { recognitionRef.current.onend = null; recognitionRef.current.onerror = null; recognitionRef.current.abort() } }, []);
  return { start, stop, listening, error, setError };
}


function App() {
  const saved = store("su_settings") || {};
  const [level, setLevel] = useState(saved.level || "Beginner");
  const [gender, setGender] = useState(saved.gender || "female");
  const [speed, setSpeed] = useState(saved.speed || "normal");
  const [langCode, setLangCode] = useState(LANGUAGES.some(l => l.code === saved.lang) ? saved.lang : "en");
  const [accent, setAccent] = useState(ACCENTS.some(a => a.code === saved.accent) ? saved.accent : DEFAULT_ACCENT);
  const [tab, setTab] = useState("tutor");
  const [dark, setDark] = useState(saved.dark === true);
  const [xp, setXp] = useState(store("su_xp") || 0);
  const [streak, setStreak] = useState(1);
  const [log, setLog] = useState(store("su_log") || { chat: 0, speak: 0, quiz: 0, words: 0 });
  const { speak, compare, stop: stopVoice, available, compareLabel, cloud, cloudOk, cloudBusy, cloudError, activeVoice, exact, ready } = useSpeech(gender, speed, accent);
  const accentInfo = ACCENTS.find(a => a.code === accent);
  const lang = getLang(langCode);
  const { t, uiLoading } = useUiStrings(langCode);
  useEffect(() => { store("su_settings", { level, gender, speed, accent, lang: langCode, dark }) }, [level, gender, speed, accent, langCode, dark]);
  useEffect(() => { document.documentElement.lang = langCode }, [langCode]);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light" }, [dark]);
  useEffect(() => {
    const d = new Date().toDateString(), s = store("su_streak") || { d: "", n: 0 };
    if (s.d !== d) { const y = new Date(Date.now() - 864e5).toDateString(); s.n = s.d === y ? s.n + 1 : 1; s.d = d; store("su_streak", s) } setStreak(s.n)
  }, []);
  const gain = (n, k) => { setXp(x => { store("su_xp", x + n); return x + n }); setLog(l => { const m = { ...l, [k]: (l[k] || 0) + 1 }; store("su_log", m); return m }) };
  const P = { level, speak, gain, lang, t };
  const tabs = [["tutor", "message", t.tutor], ["speak", "mic", t.speak], ["vocab", "book", t.vocab], ["quiz", "brain", t.quiz], ["translate", "globe", t.translate], ["prog", "trophy", t.prog]];
  const lvlNo = Math.floor(xp / 100) + 1;
  return <div className="wrap">
    <div className="hero">
      <div className="brand"><span className="brand-icon"><Icon name="message" size={24} /></span><div><h1>SpeakUp</h1><p>AI English Communication Tutor</p></div></div>
      <div className="stats"><div className="stat"><b><Icon name="flame" size={16} />{streak}</b>day streak</div><div className="stat"><b><Icon name="star" size={16} />{xp}</b>XP</div><div className="stat"><b><Icon name="chart" size={16} />Lv {lvlNo}</b>level</div>
        <button className="btn ghost theme-button" onClick={() => setDark(!dark)} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}><Icon name={dark ? "sun" : "moon"} /></button></div>
    </div>
    <div className="panel row settings-panel">
      <div><span className="lbl">{t.myLang}</span><select className="accent-select" aria-label="My language" value={langCode} onChange={e => setLangCode(e.target.value)}>{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native}{l.native !== l.name ? ` (${l.name})` : ""}</option>)}</select></div>
      <div><span className="lbl">{t.mode}</span><div className="seg">{Object.keys(LV).map(l => <button key={l} className={level === l ? "on" : ""} onClick={() => setLevel(l)}>{l}</button>)}</div></div>
      <div><span className="lbl">{t.voice}</span><div className="seg">{["female", "male"].map(g => <button key={g} className={gender === g ? "on" : ""} onClick={() => setGender(g)}><Icon name="user" />{g === "female" ? t.female : t.male}</button>)}</div></div>
      <div className="settings-speed"><span className="lbl">{t.speed}</span><div className="seg">{[["slow", "Slow 0.65×"], ["normal", "Normal 1×"], ["fast", "Fast 1.5×"]].map(([k, n]) => <button key={k} type="button" aria-pressed={speed === k} className={speed === k ? "on" : ""} onClick={() => setSpeed(k)}><Icon name="gauge" />{n}</button>)}</div></div>
      <div className="settings-accent">
        <span className="lbl">{t.accent}</span>
        <div className="settings-accent-controls">
          <select className="accent-select" aria-label="Tutor accent" value={accent} onChange={e => setAccent(e.target.value)}>{ACCENTS.map(a => <option key={a.code} value={a.code}>{a.flag} {a.label}{!available[a.code] ? (cloudOk ? " ☁" : ready ? " (not installed)" : "") : ""}</option>)}</select>
          <button className="btn ghost settings-test-voice" onClick={() => speak(`Hello! I am your English tutor with an ${accentInfo.label} accent. Let us practise together.`)}><Icon name="volume" />{t.testVoice}</button>
        </div>
      </div>
    </div>
    <div className="accent-note mu" role="status">
      <span>{uiLoading ? t.uiLoading : compareLabel ? `Playing: ${compareLabel}` : cloudBusy ? "Generating AI voice… a moment please" : cloudError ? `AI voice problem: ${cloudError}` : cloud ? `${accentInfo.label} accent is spoken by the Gemini AI voice (☁). First play takes 1–3 seconds.` : ready && !exact ? `${accentInfo.label} voice is not installed on this device and no AI key is set, so a close English voice is used.` : activeVoice ? `Voice in use: ${activeVoice}` : ""}</span>
      <button type="button" className="btn ghost accent-compare" onClick={() => (compareLabel || cloudBusy) ? stopVoice() : compare("Nice to meet you. Let us practise English together.")}><Icon name={(compareLabel || cloudBusy) ? "stop" : "volume"} />{(compareLabel || cloudBusy) ? t.stop : t.compare}</button>
    </div>
    <div className="tabs">{tabs.map(([k, i, n]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Icon name={i} />{n}</button>)}</div>
    <div className={"panel app-content" + (tab === "tutor" ? " tutor-content" : "")}>
      {tab === "tutor" && <Tutor {...P} />}
      {tab === "speak" && <Speak {...P} />}
      {tab === "vocab" && <Vocab {...P} />}
      {tab === "quiz" && <Quiz {...P} />}
      {tab === "translate" && <Translator {...P} />}
      {tab === "prog" && <Prog xp={xp} log={log} lvlNo={lvlNo} streak={streak} />}
    </div>
  </div>
}

function Tutor({ level, speak, gain, t, lang }) {
  const [micLang, setMicLang] = useState("en");
  useEffect(() => { setMicLang("en") }, [lang.code]);
  const [msgs, setMsgs] = useState([{ r: "a", text: "Hello! I'm your English coach. Talk about anything, and I'll reply, correct your English, and help you improve." }]);
  const [txt, setTxt] = useState(""); const [busy, setBusy] = useState(false);
  const end = useRef(); const requestId = useRef(0); const voice = useVoiceInput();
  useEffect(() => { end.current && end.current.scrollIntoView({ behavior: "smooth" }) }, [msgs]);
  function clearChat() {
    requestId.current++; voice.stop();
    voice.setError("");
    setMsgs([{ r: "a", text: "Hello! I'm your English coach. Talk about anything, and I'll reply, correct your English, and help you improve." }]);
    setTxt(""); setBusy(false);
  }
  async function send(m) {
    const text = (m || txt).trim(); if (!text || busy) return; setTxt("");
    const request = requestId.current;
    const hist = [...msgs, { r: "u", text }]; setMsgs(hist); setBusy(true);
    const unclearToken = text.match(/(?:[=*_~|\\][A-Za-z]+|[A-Za-z]+[=*_~|\\])/);
    if (unclearToken && !analyzeOfflineEnglish(text).hasCorrection) {
      const reply = {
        r: "a",
        text: `I couldn't recognize “${unclearToken[0]}” as an English word. Could you check the spelling and send it again?`,
        alternative: "If you meant to write a full sentence, try: “I feel happy today.”",
        tip: "Read your message once before sending to catch typing mistakes."
      };
      setMsgs(h => [...h, reply]);
      speak(reply.text);
      setBusy(false);
      return;
    }
    if (/^[a-z]{1,2}$/i.test(text) && !/^(hi|ok|no|yes|yo|oh|go)$/i.test(text)) {
      const reply = {
        r: "a",
        text: "It looks like your message is incomplete. Please finish your thought so we can practise English together.",
        alternative: "You could write: “Hi, how are you?” or “How can I improve my English?”",
        tip: "Build a complete sentence with a subject and a verb, such as “I want to practise English.”"
      };
      setMsgs(h => [...h, reply]);
      speak(reply.text);
      setBusy(false);
      return;
    }
    try {
      const convo = hist.slice(-8).map(x => (x.r === "u" ? "Student: " : "Tutor: ") + x.text).join("\n");
      const base = `Level: ${level}. ${LV[level]}\nConversation:\n${convo}\n\n`;
      const explainLang = lang.code === "en" ? "simple English" : `${lang.name} (native script; English words being taught stay in English)`;
      const idx = hist.length; // index of the tutor message we are about to add
      setMsgs(h => [...h, { r: "a", text: "" }]);
      let first = true;
      const coachP = coachCheck(base + `You are an English coach. For the student's latest message, check spelling, grammar and word choice (not capitalization/final punctuation). If there is any mistake, correction = the ENTIRE latest message rewritten correctly and explanation = each error explained briefly in ${explainLang}. If the message is correct, leave correction and explanation empty. If the student wrote in a language other than English (for example ${lang.name} or Hindi/Hinglish), put a natural English version of what they meant in alternative; otherwise give one more natural phrase or leave empty. tip = one short, specific tip about English, written in ${explainLang}. Corrected English sentences always stay in English. No emojis.`).catch(err => ({ _err: err.message }));
      const reply = await streamReply(base + `You are a warm English conversation tutor. Answer the student's latest message directly and helpfully, in simple English, in 1-4 short sentences. The student may ask about ANY topic. The student\'s mother tongue is ${lang.name}. If they wrote in ${lang.name}, Hindi/Hinglish or any other language, understand it and reply in simple English. No emojis.`, partial => {
        if (request !== requestId.current) return;
        if (first) { first = false; setBusy(false); }
        setMsgs(h => h.map((m, i) => i === idx ? { ...m, text: partial } : m));
      });
      if (request !== requestId.current) return;
      speak(reply);
      const c = await coachP;
      if (request !== requestId.current) return;
      if (c && c._err) { console.error("Coach check failed", c._err); setMsgs(h => h.map((m, i) => i === idx ? { ...m, text: reply, err: "Coach check failed: " + c._err } : m)); return; }
      if (c) setMsgs(h => h.map((m, i) => i === idx ? { ...m, text: reply, fix: c.correction, exp: c.explanation, alternative: c.alternative, correct: !c.correction, tip: c.tip } : m));
      gain(c && c.correction ? 5 : 10, "chat");
    } catch (e) {
      if (request !== requestId.current) return;
      console.error("AI tutor request failed; using offline coaching.", e);
      setMsgs(h => h.filter(m => !(m.r === "a" && m.text === "")));
      const offlineReply = offlineCoachReply(text, hist.filter(message => message.r === "u").length - 1);
      setMsgs(h => [...h, { r: "a", ...offlineReply, offline: true, err: "AI not connected: " + (e && e.message ? e.message : e) }]);
      speak(offlineReply.text);
    }
    if (request === requestId.current) setBusy(false)
  }
  function mic() { if (voice.listening) { voice.stop(); return } voice.start(x => send(x), micLang === "en" ? "en-IN" : lang.speech) }
  function translateMsg(i) {
    const m = msgs[i]; if (!m || !m.text) return;
    setMsgs(h => h.map((x, j) => j === i ? { ...x, trBusy: true } : x));
    translateText(m.text, "English", lang.name)
      .then(r => setMsgs(h => h.map((x, j) => j === i ? { ...x, tr: r.translation, trRoman: r.roman, trBusy: false } : x)))
      .catch(e => setMsgs(h => h.map((x, j) => j === i ? { ...x, trBusy: false, err: "Translation failed: " + e.message } : x)));
  }
  return <div className="tutor">
    <div className="scenario-toolbar"><button type="button" className="btn ghost clear-chat" onClick={clearChat}><Icon name="trash" />{t.clearChat}</button></div>
    <div className="chat">{msgs.map((m, i) => <div key={i} className={"msg " + m.r}>{m.text}
      {m.r === "a" && <button type="button" className="icon-button" aria-label="Read reply aloud" onClick={() => speak(m.text)}><Icon name="volume" /></button>}
      {m.r === "a" && m.text && lang.code !== "en" && <button type="button" className="icon-button" aria-label={t.translateMsg} title={t.translateMsg} disabled={m.trBusy} onClick={() => translateMsg(i)}><Icon name="globe" /></button>}
      {m.tr && <div className="tip" dir={lang.rtl ? "rtl" : "auto"}><Icon name="globe" /><b>{lang.native}:</b> {m.tr}{m.trRoman && <div className="mu">{m.trRoman}</div>} <button type="button" className="icon-button" aria-label={t.play} onClick={() => speak(m.tr, lang)}><Icon name="volume" /></button></div>}
      {m.fix && <div className="fix"><Icon name="check" /><b>{t.correction}</b> {m.fix}{m.exp && <div className="mu"><b>{t.why}</b> {m.exp}</div>}</div>}
      {m.alternative && <div className="tip"><Icon name="message" /><b>{t.alsoSay}</b> {m.alternative}</div>}
      {m.err && <div className="fix"><b>Problem:</b> {m.err}</div>}
      {m.tip && <div className="tip"><Icon name="lightbulb" /><b>{t.coachTip}</b> {m.tip}</div>}</div>)}
      {busy && <div className="msg a">{t.thinking}</div>}<div ref={end} /></div>
    {voice.error && <div className="mu" role="status" style={{ marginTop: 8 }}>{voice.error}</div>}
    <div className="row" style={{ marginTop: 10 }}>
      {lang.code !== "en" && <div className="seg" role="group" aria-label={t.micIn}>{[["en", t.micEnglish], ["native", t.micMine]].map(([k, n]) => <button key={k} type="button" aria-pressed={micLang === k} className={micLang === k ? "on" : ""} onClick={() => setMicLang(k)}>{n}</button>)}</div>}
      <button className={"btn ghost"} aria-pressed={voice.listening} onClick={mic}><Icon name="mic" />{voice.listening ? t.listening : t.speakBtn}</button>
      <input className="chat-input" value={txt} placeholder={t.ph} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
      <button className="btn" disabled={busy} onClick={() => send()}>{t.send}</button></div>
  </div>
}

function Speak({ level, speak, gain }) {
  const [order, setOrder] = useState(() => shuffle([...SENTENCES[level]])); const [index, setIndex] = useState(0); const [res, setRes] = useState(null); const voice = useVoiceInput();
  const sent = order[index];
  useEffect(() => { setOrder(shuffle([...SENTENCES[level]])); setIndex(0); setRes(null) }, [level]);
  function next() {
    setRes(null);
    if (index + 1 < order.length) { setIndex(index + 1); return }
    const nextOrder = shuffle([...SENTENCES[level]]);
    if (nextOrder[0] === sent) nextOrder.push(nextOrder.shift());
    setOrder(nextOrder); setIndex(0);
  }
  function start() {
    if (voice.listening) { voice.stop(); return } voice.start(x => {
      const clean = s => s.toLowerCase().replace(/[^a-z' ]/g, "").split(/\s+/).filter(Boolean);
      const heard = clean(x), tgt = sent.split(/\s+/); const hs = new Set(heard);
      const words = tgt.map(w => ({ w, ok: hs.has(clean(w)[0]) })); const sc = Math.round(words.filter(w => w.ok).length / words.length * 100);
      setRes({ heard: x, words, sc }); gain(Math.max(5, Math.round(sc / 5)), "speak")
    })
  }
  return <div style={{ textAlign: "center" }}>
    <span className="mu">Listen, then repeat the sentence</span>
    <div className="big">{sent}</div>
    <div className="row" style={{ justifyContent: "center" }}>
      <button className="btn ghost" onClick={() => speak(sent)}><Icon name="volume" />Listen</button>
      <button className="btn ghost" onClick={next}><Icon name="refresh" />New sentence</button></div>
    <div style={{ margin: "18px 0" }}><button className={"mic" + (voice.listening ? " rec" : "")} aria-label={voice.listening ? "Stop listening" : "Start speaking"} aria-pressed={voice.listening} onClick={start}><Icon name={voice.listening ? "stop" : "mic"} size={32} /></button><div className="mu">{voice.listening ? "Listening… Speak now" : "Tap and speak"}</div></div>
    {voice.error && <div className="err" role="status">{voice.error}</div>}
    {res && <div><div style={{ fontSize: 40, fontWeight: 700, color: res.sc >= 70 ? "var(--ok)" : "var(--bad)" }}>{res.sc}%</div>
      <div>{res.words.map((w, i) => <span key={i} className={"w " + (w.ok ? "g" : "b")}>{w.w}</span>)}</div>
      <p className="mu">You said: “{res.heard}”</p>
      <p className="result-message"><Icon name={res.sc >= 85 ? "award" : res.sc >= 60 ? "thumbsup" : "mic"} />{res.sc >= 85 ? "Excellent pronunciation!" : res.sc >= 60 ? "Good work! Practise the highlighted words again." : "Listen slowly and try again."}</p></div>}
  </div>
}

function Vocab({ level, speak, gain, t, lang }) {
  const [words, setWords] = useState([]); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const [topic, setTopic] = useState(""); const voice = useVoiceInput();
  async function load() {
    setBusy(true);
    const requestedTopic = topic.trim();
    if (!requestedTopic) { setNotice("Enter a topic first, such as travel, food, or work."); setBusy(false); return }
    setNotice("");
    try {
      const result = await askVocab(requestedTopic, level, LV[level], lang.code === "en" ? "" : lang.name);
      setWords(result.slice(0, 6)); gain(10, "words");
    } catch (e) {
      const fallback = getOfflineVocabulary(requestedTopic);
      setWords(fallback.words.map(([word, meaning, example]) => ({ word, meaning, example })));
      console.error("Vocab failed", e); setNotice(`AI vocabulary failed (${e.message}). Showing built-in ${fallback.category} words instead.`);
      gain(10, "words");
    } finally { setBusy(false) }
  }
  return <div>
    <div className="row"><input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && !busy && load()} placeholder={t.topicPh} />
      <button type="button" className="btn ghost" aria-pressed={voice.listening} onClick={() => voice.listening ? voice.stop() : voice.start(setTopic)}><Icon name="mic" />{voice.listening ? t.listening : t.speakTopic}</button>
      <button className="btn" disabled={busy} onClick={load}>{busy ? t.loading : <><Icon name="sparkles" />{t.getWords}</>}</button></div>
    {voice.error && <div className="err" role="status" style={{ marginTop: 8 }}>{voice.error}</div>}
    {notice && <div className={notice.startsWith("Enter") ? "err" : "mu"} role="status" style={{ marginTop: 8 }}>{notice}</div>}
    {!words.length && !busy && !notice && <p className="mu">Enter a topic and tap the button to learn useful English words, meanings, and examples.</p>}
    <div className="grid" style={{ marginTop: 12 }}>{words.map((w, i) => <div className="card" key={i}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{w.word} <button type="button" className="icon-button" aria-label={`Pronounce ${w.word}`} onClick={() => speak(w.word)}><Icon name="volume" /></button></div>
      <div>{w.meaning}</div>{w.translation && <div dir={lang.rtl ? "rtl" : "auto"} style={{ fontWeight: 600 }}>{lang.native}: {w.translation} <button type="button" className="icon-button" aria-label={t.play} onClick={() => speak(w.translation, lang)}><Icon name="volume" /></button></div>}<button type="button" className="example-speech" onClick={() => speak(w.example)}><span className="mu">“{w.example}”</span><Icon name="volume" /></button></div>)}</div>
  </div>
}

function Translator({ lang, t, speak, gain }) {
  const defaultTo = code => (code === "en" ? "hi" : "en");
  const [from, setFrom] = useState(lang.code); const [to, setTo] = useState(defaultTo(lang.code));
  const [src, setSrc] = useState(""); const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [copied, setCopied] = useState(false);
  const voice = useVoiceInput(); const reqId = useRef(0);
  useEffect(() => { setFrom(lang.code); setTo(defaultTo(lang.code)); setOut(null); setErr("") }, [lang.code]);
  const F = getLang(from), To = getLang(to);
  async function run(text = src) {
    const q = text.trim(); if (!q) return;
    const id = ++reqId.current; setBusy(true); setErr(""); setOut(null);
    try {
      const r = await translateText(q, F.name, To.name);
      if (id !== reqId.current) return;
      setOut(r); gain(3, "words");
    } catch (e) { if (id === reqId.current) setErr(e.message || "Translation failed.") }
    finally { if (id === reqId.current) setBusy(false) }
  }
  function swap() {
    reqId.current++; setBusy(false);
    setFrom(to); setTo(from); setErr("");
    if (out) { setSrc(out.translation); setOut(null) }
  }
  function mic() { if (voice.listening) { voice.stop(); return } voice.start(x => { setSrc(x); run(x) }, F.speech) }
  async function copy() { try { await navigator.clipboard.writeText(out.translation); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ } }
  const langSelect = (value, onChange, label) => <select className="accent-select" aria-label={label} value={value} onChange={e => { onChange(e.target.value); setOut(null) }}>{LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.native}{l.native !== l.name ? ` (${l.name})` : ""}</option>)}</select>;
  return <div className="translator">
    <div className="row tr-bar">
      <div><span className="lbl">{t.from}</span>{langSelect(from, setFrom, t.from)}</div>
      <button type="button" className="btn ghost" style={{ alignSelf: "end" }} onClick={swap} aria-label={t.swap} title={t.swap}><Icon name="refresh" /></button>
      <div><span className="lbl">{t.to}</span>{langSelect(to, setTo, t.to)}</div>
    </div>
    <textarea className="tr-input" dir={F.rtl ? "rtl" : "auto"} rows={4} value={src} placeholder={t.typeHere} onChange={e => setSrc(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run() }} />
    <div className="row" style={{ marginTop: 8 }}>
      <button type="button" className="btn ghost" aria-pressed={voice.listening} onClick={mic}><Icon name="mic" />{voice.listening ? t.listening : t.speakBtn}</button>
      <button type="button" className="btn ghost" disabled={!src.trim()} onClick={() => speak(src, F)}><Icon name="volume" />{t.play}</button>
      <button type="button" className="btn" disabled={busy || !src.trim()} onClick={() => run()}><Icon name="globe" />{busy ? t.translating : t.translateAction}</button>
    </div>
    {voice.error && <div className="err" role="status" style={{ marginTop: 8 }}>{voice.error}</div>}
    {err && <div className="err" role="status" style={{ marginTop: 8 }}>{err}</div>}
    {out && <div className="card tr-out" style={{ marginTop: 12 }}>
      <span className="lbl">{t.result} · {To.native}</span>
      <div className="tr-text" dir={To.rtl ? "rtl" : "auto"}>{out.translation}</div>
      {out.roman && <div className="mu" style={{ marginTop: 4 }}>{t.pronunciation}: {out.roman}</div>}
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="btn ghost" onClick={() => speak(out.translation, To)}><Icon name="volume" />{t.play}</button>
        <button type="button" className="btn ghost" onClick={copy}><Icon name={copied ? "check" : "copy"} />{copied ? t.copied : t.copy}</button>
      </div>
    </div>}
  </div>
}

function Quiz({ level, gain }) {
  const [quizLevel, setQuizLevel] = useState(level);
  const [qs, setQs] = useState(null); const [i, setI] = useState(0); const [answers, setAnswers] = useState({});
  const voice = useVoiceInput();
  const score = qs ? Object.entries(answers).filter(([questionIndex, answer]) => qs[Number(questionIndex)]?.answer === answer).length : 0;
  const q = qs && qs[i];
  function start() {
    voice.stop(); setQs(shuffle([...QUIZ_QUESTIONS[quizLevel]])); setI(0); setAnswers({});
  }
  function changeLevel(nextLevel) {
    voice.stop(); setQuizLevel(nextLevel); setQs(null); setI(0); setAnswers({});
  }
  function choose(k) {
    if (answers[i] !== undefined) return;
    setAnswers(previous => ({ ...previous, [i]: k }));
    if (k === q.answer) gain(10, "quiz");
  }
  function answerByVoice() {
    if (voice.listening) { voice.stop(); return }
    if (answers[i] !== undefined) return;
    voice.start(transcript => {
      const spoken = transcript.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      const index = q.options.findIndex(option => option.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim() === spoken);
      const spokenLetter = spoken.match(/^(?:option |answer )?([a-d])$/);
      const selected = index >= 0 ? index : spokenLetter ? q.options.findIndex((_, optionIndex) => optionIndex === spokenLetter[1].charCodeAt(0) - 97) : -1;
      if (selected >= 0) choose(selected);
      else voice.setError(`I heard “${transcript}”. Please say one of the choices: ${q.options.join(", ")}.`);
    });
  }
  return <div className="quiz">
    {(!qs || i >= qs.length) && <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
      <div><span className="lbl">Choose quiz level</span><div className="seg">{Object.keys(QUIZ_QUESTIONS).map(l => <button key={l} type="button" aria-pressed={quizLevel === l} className={quizLevel === l ? "on" : ""} onClick={() => changeLevel(l)}>{l}</button>)}</div></div>
      <div className="mu">10 questions · 10 XP for each correct answer</div>
    </div>}
    {!qs && <div style={{ textAlign: "center" }}><div className="big"><Icon name="brain" size={24} />{quizLevel} English Quiz</div>
      <p className="mu">{quizLevel === "Beginner" ? "Basic everyday grammar and vocabulary." : quizLevel === "Intermediate" ? "Tenses, conditionals, and everyday English." : "Advanced grammar, usage, and vocabulary."}</p>
      <button className="btn" onClick={start}>Start {quizLevel} quiz</button></div>}
    {q && <div><div className="row" style={{ justifyContent: "space-between" }}>
      <div className="mu">{quizLevel} · Question {i + 1} / {qs.length}</div>
      <div className="row"><button className="btn ghost" onClick={() => changeLevel(quizLevel)}><Icon name="arrowLeft" />Change level</button><button className="btn ghost" onClick={start}><Icon name="refresh" />Restart quiz</button></div>
    </div><div className="mu" style={{ textAlign: "right", marginTop: 6 }}>Score: {score}</div>
      <div className="bar"><i style={{ width: (i / qs.length * 100) + "%" }} /></div>
      <div className="big">{q.q}</div>
      <div className="quiz-options">{q.options.map((o, k) => <button key={k} type="button" disabled={answers[i] !== undefined} aria-pressed={answers[i] === k} className={"opt" + (answers[i] !== undefined ? (k === q.answer ? " ok" : k === answers[i] ? " no" : "") : "")} onClick={() => choose(k)}>{o}</button>)}</div>
      <button type="button" className="btn ghost" style={{ marginTop: 8 }} disabled={answers[i] !== undefined} aria-pressed={voice.listening} onClick={answerByVoice}><Icon name="mic" />{voice.listening ? "Listening…" : "Answer by voice"}</button>
      {voice.error && <div className="err" role="status" style={{ marginTop: 6 }}>{voice.error}</div>}
      {answers[i] !== undefined && <div className="quiz-feedback"><p className={answers[i] === q.answer ? "fix" : "err"}><Icon name={answers[i] === q.answer ? "check" : "close"} />{answers[i] === q.answer ? "Correct!" : "Not quite."} {q.why}</p>
        {answers[i] !== q.answer && <p className="mu">Correct answer: <b>{q.options[q.answer]}</b></p>}
      </div>}
      <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}><Icon name="arrowLeft" />Previous</button>
        <button className="btn" disabled={answers[i] === undefined} onClick={() => setI(i + 1)}>{i + 1 < qs.length ? "Next question" : "See results"}{i + 1 < qs.length && <Icon name="arrowRight" />}</button>
      </div>
    </div>}
    {qs && i >= qs.length && <div style={{ textAlign: "center" }}><div className="quiz-result-icon"><Icon name={score >= 8 ? "trophy" : score >= 5 ? "award" : "brain"} size={40} /></div>
      <div className="big">{quizLevel} quiz complete: {score} / {qs.length}</div>
      <p className="mu">You earned {score * 10} XP. {score >= 8 ? "Excellent work!" : score >= 5 ? "Good effort—keep practising!" : "Review the explanations and give it another try."}</p>
      <button className="btn" onClick={start}>Try another {quizLevel} quiz</button></div>}
  </div>
}

function Prog({ xp, log, lvlNo, streak }) {
  const next = lvlNo * 100, pct = xp % 100;
  const items = [["message", "Tutor chats", log.chat], ["mic", "Speaking drills", log.speak], ["book", "Word sets", log.words], ["brain", "Quiz answers", log.quiz]];
  return <div><div className="big">Level {lvlNo} · {xp} XP</div><div className="bar"><i style={{ width: pct + "%" }} /></div>
    <p className="mu">{next - xp} XP to reach Level {lvlNo + 1} · <Icon name="flame" /> {streak} day streak</p>
    <div className="grid">{items.map(([i, n, v]) => <div className="card" key={n}><div className="progress-icon"><Icon name={i} size={24} /></div><b style={{ fontSize: 22 }}>{v || 0}</b><div className="mu">{n}</div></div>)}</div>
    <p className="mu">Progress is saved in this browser. Practise daily to grow your streak!</p></div>
}

export default App;
