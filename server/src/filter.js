// Chat and name moderation: masks common English and Roman Urdu abuse.
// Matching ignores case, repeated letters and simple look-alike swaps (0->o, 1->i, @->a, $->s ...).
const WORDS = [
  // English
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'cunt', 'slut', 'whore', 'nigger', 'nigga', 'faggot', 'retard', 'pussy',
  // Roman Urdu / Punjabi
  'bc', 'mc', 'bhenchod', 'behenchod', 'bhanchod', 'madarchod', 'maderchod', 'chutiya', 'chutia', 'choot', 'gandu', 'gaandu', 'harami', 'haramzada', 'randi', 'bhosdi', 'bhosdike', 'lund', 'lun', 'kanjar', 'kanjri', 'khotay', 'tatte', 'gashti',
];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };
const squash = w => w.toLowerCase().replace(/[013457@$!]/g, c => LEET[c]).replace(/(.)\1+/g, '$1');
const BAD = new Set(WORDS.map(squash));

// Replace each offending word with asterisks; returns { text, flagged }.
export function moderate(text) {
  let flagged = false;
  const out = text.replace(/[\p{L}\p{N}@$!]+/gu, w => {
    if (BAD.has(squash(w))) { flagged = true; return '*'.repeat(w.length); }
    return w;
  });
  return { text: out, flagged };
}
