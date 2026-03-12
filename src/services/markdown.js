/**
 * Lightweight Markdown Renderer
 * Converts markdown text to safe HTML for chat messages
 */

/**
 * Escape HTML entities to prevent XSS in user input
 */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Convert markdown text to HTML
 * Supports: bold, italic, code, code blocks, headings, lists, line breaks
 */
export function renderMarkdown(text) {
    if (!text) return '';

    // Escape HTML first
    let html = escapeHtml(text);

    // Code blocks (``` ... ```)
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre class="md-code-block"><code class="md-code-lang-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    // Inline code (`code`)
    html = html.replace(/`([^`\n]+)`/g, '<code class="md-inline-code">$1</code>');

    // Headings (### h3, ## h4 — we offset since h1/h2 are used for page headers)
    html = html.replace(/^### (.+)$/gm, '<h5 class="md-heading">$1</h5>');
    html = html.replace(/^## (.+)$/gm, '<h4 class="md-heading">$1</h4>');
    html = html.replace(/^# (.+)$/gm, '<h3 class="md-heading">$1</h3>');

    // Bold (**text** or __text__)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic (*text* or _text_)
    html = html.replace(/(?<!\w)\*([^*\n]+)\*(?!\w)/g, '<em>$1</em>');
    html = html.replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '<em>$1</em>');

    // Unordered lists (- item or * item)
    html = html.replace(/^(?:[-*])\s+(.+)$/gm, '<li class="md-li">$1</li>');
    html = html.replace(/((?:<li class="md-li">.*<\/li>\n?)+)/g, '<ul class="md-list">$1</ul>');

    // Ordered lists (1. item)
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="md-li-ol">$1</li>');
    html = html.replace(/((?:<li class="md-li-ol">.*<\/li>\n?)+)/g, '<ol class="md-list-ol">$1</ol>');

    // Blockquotes (> text)
    html = html.replace(/^&gt;\s?(.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');

    // Horizontal rules (--- or ***)
    html = html.replace(/^(?:---|\*\*\*)$/gm, '<hr class="md-hr">');

    // Line breaks (double newline = paragraph, single newline = br)
    html = html.replace(/\n\n/g, '</p><p class="md-p">');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph
    html = `<p class="md-p">${html}</p>`;

    // Clean up empty paragraphs
    html = html.replace(/<p class="md-p"><\/p>/g, '');

    return html;
}
