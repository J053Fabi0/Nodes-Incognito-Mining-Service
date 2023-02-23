// https://twemoji-cheatsheet.vercel.app

const emojisCodes: Record<string, string> = {
  "🔴": "1f534",
  "⚠️": "26a0",
  "⚠": "26a0",
  "🟢": "1f7e2",
  "⏳": "23f3",
  "⛏": "26cf",
  "🐢": "1f422",
  "👴": "1f474",
  "🔌": "1f50c",
  "🔪": "1f52a",
  "➡️": "27a1",
  "‼": "203c",
  "⚡": "26a1",
};

export default emojisCodes;

export const splitEmoji = (string: string) => [...new Intl.Segmenter().segment(string)].map((x) => x.segment);
