// HTML sanitizer for post bodies. Runs on every write (create/update), so the DB
// only ever holds safe HTML and the frontend can render it directly.
//
// Allowlist approach: anything not listed here is stripped. That covers <script>,
// inline event handlers (onerror, onclick...), javascript: URLs, <style>, <object>.
// Covers everything the TipTap editor produces, plus iframe embeds from trusted hosts.

const sanitizeHtml = require('sanitize-html');

// Only these hosts may be embedded via <iframe>. Add new ones deliberately.
const ALLOWED_IFRAME_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'open.spotify.com',
  'www.google.com',      // Maps embeds
  'docs.google.com',     // Forms, Slides, Docs
  'drive.google.com',
];

// Inline CSS values allowed on embed wrappers: plain lengths/keywords/colors only.
// No parentheses, so no url(), expression(), var() or calc() can sneak in.
const CSS_VALUE = [/^[\w\s.%#-]+$/];

const OPTIONS = {
  allowedTags: [
    'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'mark', 'sub', 'sup',
    'blockquote', 'code', 'pre', 'span', 'div',
    'ul', 'ol', 'li',
    'a', 'img', 'iframe',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    iframe: ['src', 'width', 'height', 'allowfullscreen', 'allow', 'title', 'loading'],
    code: ['class'],   // lowlight syntax highlighting: class="language-js"
    span: ['class'],   // lowlight token spans: class="hljs-keyword"
    '*': ['style'],
  },
  allowedClasses: {
    code: [/^language-[\w-]+$/],
    span: [/^hljs-[\w-]+$/],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      position: [/^(relative|absolute)$/],
      'padding-bottom': CSS_VALUE,
      height: CSS_VALUE,
      width: CSS_VALUE,
      top: CSS_VALUE,
      left: CSS_VALUE,
      margin: CSS_VALUE,
      overflow: [/^hidden$/],
      'border-radius': CSS_VALUE,
      border: CSS_VALUE,
    },
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: { img: ['http', 'https', 'data'] },
  allowedIframeHostnames: ALLOWED_IFRAME_HOSTS,
  allowIframeRelativeUrls: false,
  // External links open safely in a new tab (prevents reverse tabnabbing)
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
  },
};

function sanitizePostHtml(html) {
  if (typeof html !== 'string' || html === '') return '';
  return sanitizeHtml(html, OPTIONS);
}

module.exports = { sanitizePostHtml, ALLOWED_IFRAME_HOSTS };
