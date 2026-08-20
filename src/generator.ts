const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "-_./\\!@#$%^&*()+=[]{}|:;?";
const AMBIGUOUS = /[0OIl1]/;

const WORDS = [
  "able", "acid", "acre", "aged", "ahead", "alarm", "album", "alert", "alien", "align",
  "alike", "alive", "alley", "allow", "alone", "along", "aloud", "alpha", "amber", "amend",
  "anchor", "angel", "anger", "angle", "angry", "ankle", "apple", "apron", "arena", "argue",
  "arise", "armor", "aroma", "arrow", "aside", "asset", "atlas", "attic", "audio", "audit",
  "avoid", "awake", "award", "aware", "badly", "badge", "bagel", "baker", "balcony", "bamboo",
  "banana", "banner", "barge", "barrel", "basic", "basin", "batch", "beach", "beard", "beast",
  "begin", "being", "belly", "bench", "berry", "birth", "black", "blade", "blame", "blank",
  "blast", "blaze", "bleak", "blend", "bless", "blind", "blink", "block", "blood", "bloom",
  "blown", "board", "boast", "bonus", "boost", "booth", "border", "borne", "botch", "bound",
  "brain", "brake", "brand", "brave", "bread", "break", "breed", "brick", "bride", "brief",
  "bring", "brisk", "broad", "brook", "brown", "brush", "buddy", "build", "built", "bulb",
  "bulge", "bunch", "burst", "cabin", "cable", "camel", "canal", "candy", "canoe", "canon",
  "cape", "cargo", "carry", "carve", "catch", "cause", "cedar", "chain", "chair", "chalk",
  "champ", "chant", "chaos", "charm", "chart", "chase", "cheap", "check", "cheer", "chess",
  "chest", "chief", "child", "chili", "chill", "china", "chip", "choir", "choke", "chord",
  "chunk", "cider", "cinch", "civic", "civil", "claim", "clamp", "clang", "clash", "clasp",
  "class", "clean", "clear", "clerk", "click", "cliff", "climb", "cling", "clock", "clone",
  "close", "cloth", "cloud", "clown", "coast", "cocoa", "codon", "comet", "comic", "comma",
  "coral", "couch", "could", "count", "court", "cover", "craft", "crane", "crash", "crate",
  "crave", "crawl", "craze", "crazy", "cream", "creek", "crest", "crisp", "cross", "crowd",
  "crown", "crude", "crush", "crust", "cubic", "curry", "curve", "cycle", "daily", "dairy",
  "daisy", "dance", "dandy", "dated", "dealt", "death", "debit", "debug", "debut", "decal",
  "decor", "delay", "delta", "deluxe", "demon", "denim", "dense", "depot", "depth", "derby",
  "desk", "deter", "device", "diary", "digit", "diner", "dingo", "disco", "ditch", "diver",
  "dizzy", "dodge", "doing", "donor", "donut", "doubt", "dough", "dowel", "dozen", "draft",
  "drain", "drake", "drama", "drank", "drape", "draw", "dread", "dream", "dress", "dried",
  "drift", "drill", "drink", "drive", "drone", "drove", "drown", "dryer", "dying", "eager",
  "eagle", "early", "earth", "easel", "eaten", "eater", "ebony", "eden", "edge", "eight",
  "elbow", "elder", "elect", "elite", "ember", "empty", "enact", "endow", "enemy", "enjoy",
  "enter", "entry", "envoy", "epoch", "equal", "equip", "erase", "error", "erupt", "essay",
  "ethic", "evade", "event", "every", "exact", "excel", "exert", "exile", "exist", "extra",
  "fable", "facet", "faint", "fairy", "faith", "false", "fancy", "farce", "fault", "favor",
  "feast", "feign", "fella", "fence", "ferry", "fetch", "fever", "fiber", "field", "fiery",
  "fifth", "fifty", "fight", "final", "finch", "first", "fishy", "fixed", "fjord", "flair",
  "flake", "flame", "flank", "flare", "flash", "flask", "fleet", "flesh", "flick", "fling",
  "flint", "float", "flock", "flood", "floor", "flora", "flour", "flown", "fluid", "flush",
  "flute", "focal", "focus", "foggy", "folly", "force", "forge", "forth", "forty", "forum",
  "found", "frame", "frank", "fraud", "freak", "fresh", "fried", "front", "frost", "frown",
  "frozen", "fruit", "fudge", "fully", "fungi", "funny", "gamer", "gamma", "garden", "gauge",
  "ghost", "giant", "given", "glass", "glaze", "glean", "glide", "globe", "gloom", "glory",
  "gloss", "glove", "going", "grace", "grade", "grain", "grand", "grant", "grape", "graph",
  "grasp", "grass", "grave", "gravy", "great", "greet", "grief", "grill", "grind", "gripe",
  "groan", "grove", "growl", "grown", "guard", "guess", "guest", "guide", "guild", "guilt",
  "habit", "happy", "hardy", "haste", "hatch", "haven", "hazel", "heart", "heath", "heavy",
  "hedge", "hefty", "hello", "hence", "hidden", "hinge", "hobby", "honey", "honor", "horse",
  "hotel", "house", "human", "humid", "humor", "hurry", "husky", "ideal", "image", "imply",
  "inbox", "incur", "index", "indie", "inner", "input", "intro", "ionic", "irony", "issue",
  "ivory", "jelly", "jewel", "joint", "jolly", "judge", "juice", "juicy", "jumbo", "jumpy",
];

export type GeneratorMode = "password" | "memorable" | "pin";

export type GeneratorOptions = {
  mode: GeneratorMode;
  length: number;
  digits: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
  words: number;
  capitalize: boolean;
  includeNumber: boolean;
  separator: string;
  pinLength: number;
};

export const DEFAULT_GENERATOR: GeneratorOptions = {
  mode: "password",
  length: 24,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
  words: 4,
  capitalize: true,
  includeNumber: true,
  separator: "-",
  pinLength: 4,
};

function randomInt(max: number): number {
  if (max <= 0) return 0;
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0]! % max;
}

function pick(charset: string): string {
  return charset[randomInt(charset.length)] ?? "";
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function generatePassword(options: GeneratorOptions = DEFAULT_GENERATOR): string {
  if (options.mode === "pin") {
    let pin = "";
    for (let i = 0; i < Math.max(3, options.pinLength); i++) pin += pick(DIGITS);
    return pin;
  }
  if (options.mode === "memorable") {
    const chosen = [];
    for (let i = 0; i < Math.max(3, options.words); i++) {
      let word = WORDS[randomInt(WORDS.length)] ?? "able";
      if (options.capitalize) word = word[0]!.toUpperCase() + word.slice(1);
      chosen.push(word);
    }
    if (options.includeNumber) {
      const idx = randomInt(chosen.length);
      chosen[idx] = `${chosen[idx]}${randomInt(10)}`;
    }
    return chosen.join(options.separator || "-");
  }

  let charset = LETTERS;
  if (options.digits) charset += DIGITS;
  if (options.symbols) charset += SYMBOLS;
  if (options.avoidAmbiguous) charset = [...charset].filter((ch) => !AMBIGUOUS.test(ch)).join("");
  if (!charset) charset = LETTERS;
  const length = Math.max(4, Math.min(64, options.length));
  const required: string[] = [pick(LETTERS)];
  if (options.digits) required.push(pick(options.avoidAmbiguous ? DIGITS.replace(/[01]/g, "") : DIGITS));
  if (options.symbols) required.push(pick(SYMBOLS));
  const chars = [...required];
  while (chars.length < length) chars.push(pick(charset));
  return shuffle(chars).join("").slice(0, length);
}
