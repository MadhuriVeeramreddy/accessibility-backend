/**
 * PDF HTML Sanitizer
 * Cleans and sanitizes HTML content for safe PDF generation with Puppeteer
 */

/**
 * Sanitize HTML content for PDF generation
 * Fixes common issues that cause Puppeteer PDF generation to fail
 */
export function sanitizeHtmlForPdf(html: string): string {
  let sanitized = html;

  // Remove null bytes and other problematic control characters
  sanitized = sanitized.replace(/\0/g, '');
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');

  // Remove invalid Unicode characters
  sanitized = sanitized.replace(/[\uFFFE\uFFFF]/g, '');
  
  // Fix unclosed meta tags
  sanitized = sanitized.replace(/<meta([^>]*)(?<!\/)\s*>/gi, '<meta$1 />');
  
  // Fix unclosed img tags
  sanitized = sanitized.replace(/<img([^>]*)(?<!\/)\s*>/gi, '<img$1 />');
  
  // Fix unclosed br tags
  sanitized = sanitized.replace(/<br(?![^>]*\/)>/gi, '<br />');
  
  // Fix unclosed hr tags
  sanitized = sanitized.replace(/<hr(?![^>]*\/)>/gi, '<hr />');
  
  // Fix unclosed input tags
  sanitized = sanitized.replace(/<input([^>]*)(?<!\/)\s*>/gi, '<input$1 />');
  
  // Remove calc(NaN) and other invalid CSS calc values
  sanitized = sanitized.replace(/calc\(NaN[^)]*\)/gi, '0');
  sanitized = sanitized.replace(/calc\(Infinity[^)]*\)/gi, '0');
  sanitized = sanitized.replace(/calc\(undefined[^)]*\)/gi, '0');
  
  // Fix invalid stroke-dasharray values in SVG
  sanitized = sanitized.replace(/stroke-dasharray="NaN"/gi, 'stroke-dasharray="0"');
  sanitized = sanitized.replace(/stroke-dasharray="Infinity"/gi, 'stroke-dasharray="0"');
  sanitized = sanitized.replace(/stroke-dasharray="undefined"/gi, 'stroke-dasharray="0"');
  
  // Remove NaN and Infinity from other SVG attributes
  sanitized = sanitized.replace(/="NaN"/gi, '="0"');
  sanitized = sanitized.replace(/="Infinity"/gi, '="0"');
  sanitized = sanitized.replace(/="undefined"/gi, '=""');
  
  // Fix invalid style attribute values
  sanitized = sanitized.replace(/style="[^"]*NaN[^"]*"/gi, match => {
    return match.replace(/NaN/g, '0');
  });
  
  sanitized = sanitized.replace(/style="[^"]*Infinity[^"]*"/gi, match => {
    return match.replace(/Infinity/g, '0');
  });
  
  // Remove empty style attributes
  sanitized = sanitized.replace(/\s*style\s*=\s*[""]\s*[""]?/gi, '');
  
  // Fix malformed HTML entities
  sanitized = sanitized.replace(/&(?![a-zA-Z]+;|#[0-9]+;|#x[0-9a-fA-F]+;)/g, '&amp;');
  
  // Ensure proper DOCTYPE
  if (!sanitized.trim().toLowerCase().startsWith('<!doctype')) {
    sanitized = '<!DOCTYPE html>\n' + sanitized;
  }
  
  // Fix multiple consecutive spaces in text content (but preserve in pre/code tags)
  sanitized = sanitized.replace(/(?<!<(?:pre|code)[^>]*>.*?)  +(?!.*?<\/(?:pre|code)>)/g, ' ');
  
  // Remove zero-width characters that can cause rendering issues
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Fix script tags that might interfere with PDF generation
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove problematic CSS properties that cause PDF rendering issues
  sanitized = sanitized.replace(/position\s*:\s*fixed/gi, 'position: absolute');
  sanitized = sanitized.replace(/position\s*:\s*sticky/gi, 'position: relative');
  
  // Ensure all tags are properly closed
  sanitized = fixUnclosedTags(sanitized);
  
  return sanitized;
}

/**
 * Fix unclosed HTML tags
 */
function fixUnclosedTags(html: string): string {
  // This is a simplified version - for production consider using a proper HTML parser
  const selfClosingTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
                           'link', 'meta', 'param', 'source', 'track', 'wbr'];
  
  // Stack to track open tags
  const tagStack: string[] = [];
  const fixedParts: string[] = [];
  let currentPos = 0;
  
  // Simple regex to find tags (not perfect but works for most cases)
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const tagName = match[1].toLowerCase();
    
    // Add content before this tag
    fixedParts.push(html.substring(currentPos, match.index));
    currentPos = match.index + fullTag.length;
    
    if (fullTag.startsWith('</')) {
      // Closing tag
      if (tagStack[tagStack.length - 1] === tagName) {
        tagStack.pop();
      }
      fixedParts.push(fullTag);
    } else if (selfClosingTags.includes(tagName) || fullTag.endsWith('/>')) {
      // Self-closing tag
      fixedParts.push(fullTag);
    } else {
      // Opening tag
      tagStack.push(tagName);
      fixedParts.push(fullTag);
    }
  }
  
  // Add remaining content
  fixedParts.push(html.substring(currentPos));
  
  // Close any remaining open tags
  while (tagStack.length > 0) {
    const tagToClose = tagStack.pop()!;
    fixedParts.push(`</${tagToClose}>`);
  }
  
  return fixedParts.join('');
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, char => htmlEscapeMap[char]);
}

/**
 * Sanitize CSS for safe inclusion in HTML
 */
export function sanitizeCss(css: string): string {
  let sanitized = css;
  
  // Remove potentially harmful CSS
  sanitized = sanitized.replace(/@import[^;]+;/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/expression\(/gi, '');
  
  // Fix invalid values
  sanitized = sanitized.replace(/:\s*NaN\s*[;}]/gi, ': 0;');
  sanitized = sanitized.replace(/:\s*Infinity\s*[;}]/gi, ': 0;');
  sanitized = sanitized.replace(/:\s*undefined\s*[;}]/gi, ': initial;');
  
  return sanitized;
}

/**
 * Validate and fix SVG content
 */
export function sanitizeSvg(svg: string): string {
  let sanitized = svg;
  
  // Fix NaN and Infinity in SVG attributes
  sanitized = sanitized.replace(/\b(x|y|width|height|cx|cy|r|rx|ry)="NaN"/gi, '$1="0"');
  sanitized = sanitized.replace(/\b(x|y|width|height|cx|cy|r|rx|ry)="Infinity"/gi, '$1="0"');
  
  // Fix stroke-dasharray
  sanitized = sanitized.replace(/stroke-dasharray="[^"]*NaN[^"]*"/gi, 'stroke-dasharray="0"');
  
  // Fix viewBox
  sanitized = sanitized.replace(/viewBox="[^"]*NaN[^"]*"/gi, 'viewBox="0 0 100 100"');
  
  // Remove script tags from SVG
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  return sanitized;
}

/**
 * Clean up selector strings for display
 */
export function sanitizeSelector(selector: string): string {
  if (!selector) return '';
  
  // Truncate very long selectors
  const maxLength = 200;
  if (selector.length > maxLength) {
    return selector.substring(0, maxLength) + '...';
  }
  
  // Remove null bytes and control characters
  return selector.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
}

/**
 * Prepare text for safe inclusion in PDF
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Remove null bytes
  let sanitized = text.replace(/\0/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '');
  
  return sanitized;
}
