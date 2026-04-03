// Logger utility — colored, leveled console output with nice formatting.
// Supports LOG_LEVEL env var: DEBUG | INFO | WARN | ERROR (default: DEBUG)

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const icons = {
  success: '\u2714', // ✔
  error: '\u2718',   // ✘
  warn: '\u26A0',    // ⚠
  info: '\u2139',    // ℹ
  debug: '\u2022',   // •
};

// Returns current log level threshold from env
function getThreshold() {
  const env = (process.env.LOG_LEVEL || 'DEBUG').toUpperCase();
  return LEVELS[env] ?? LEVELS.DEBUG;
}

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

// Core print function — only prints if level meets threshold
function print(level, icon, color, message) {
  if (LEVELS[level] < getThreshold()) return;
  const tag = `[${level.padEnd(5)}]`;
  console.log(
    `  ${color}${icon}${colors.reset}  ${colors.gray}${timestamp()}${colors.reset}  ${color}${tag}${colors.reset}  ${message}`
  );
}

const log = {
  debug(message) {
    print('DEBUG', icons.debug, colors.gray, message);
  },

  info(message) {
    print('INFO', icons.info, colors.blue, message);
  },

  success(message) {
    print('INFO', icons.success, colors.green, message);
  },

  warn(message) {
    print('WARN', icons.warn, colors.yellow, message);
  },

  error(message) {
    print('ERROR', icons.error, colors.red, message);
  },

  // Step counter for multi-step processes: [2/5] Loading...
  step(current, total, message) {
    if (LEVELS.INFO < getThreshold()) return;
    const pad = total.toString().length;
    const num = current.toString().padStart(pad, ' ');
    console.log(
      `  ${colors.cyan}[${num}/${total}]${colors.reset}  ${colors.gray}${timestamp()}${colors.reset}  ${message}`
    );
  },

  // Big boxed header for section breaks
  header(title) {
    const width = title.length + 4;
    const top = `\u2554${'═'.repeat(width)}\u2557`;
    const mid = `\u2551  ${title}  \u2551`;
    const bot = `\u255A${'═'.repeat(width)}\u255D`;
    console.log();
    console.log(`  ${colors.magenta}${colors.bold}${top}${colors.reset}`);
    console.log(`  ${colors.magenta}${colors.bold}${mid}${colors.reset}`);
    console.log(`  ${colors.magenta}${colors.bold}${bot}${colors.reset}`);
    console.log();
  },

  divider() {
    console.log(`  ${colors.gray}${'─'.repeat(50)}${colors.reset}`);
  },

  // Key-value table for config display
  table(rows) {
    const maxKey = Math.max(...Object.keys(rows).map((k) => k.length));
    for (const [key, value] of Object.entries(rows)) {
      console.log(
        `    ${colors.cyan}${key.padEnd(maxKey)}${colors.reset}  ${value}`
      );
    }
  },

  // Pass/fail line for startup tests
  testResult(passed, label, detail) {
    const icon = passed ? `${colors.green}${icons.success}` : `${colors.red}${icons.error}`;
    const extra = (!passed && detail) ? `${colors.gray} — ${detail}${colors.reset}` : '';
    console.log(`    ${icon}${colors.reset}  ${label}${extra}`);
  },
};

module.exports = log;
