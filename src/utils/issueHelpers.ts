/**
 * Issue Helpers - Fix instructions and owner mappings for accessibility issues
 */

export interface FixInstruction {
  title: string;
  howToFix: string;
  whatImproves: string;
  owner: 'Developer' | 'Designer' | 'Content';
}

/**
 * Fix instructions for common accessibility issues
 */
export const fixInstructions: Record<string, FixInstruction> = {
  'button-name': {
    title: 'Buttons must have discernible text',
    howToFix: 'Add accessible text to the button using textContent, aria-label, or aria-labelledby.',
    whatImproves: 'will have accessible names, allowing screen reader users to understand their purpose.',
    owner: 'Developer'
  },
  'color-contrast': {
    title: 'Ensure sufficient color contrast',
    howToFix: 'Increase color contrast ratio to at least 4.5:1 for normal text or 3:1 for large text (18pt+).',
    whatImproves: 'will meet the minimum contrast ratio, making text readable for users with low vision.',
    owner: 'Designer'
  },
  'image-alt': {
    title: 'Images must have alternate text',
    howToFix: 'Add meaningful alt text to all images. For decorative images, use alt="".',
    whatImproves: 'will have descriptive text alternatives, allowing screen reader users to understand image content.',
    owner: 'Content'
  },
  'link-name': {
    title: 'Links must have discernible text',
    howToFix: 'Ensure links have descriptive text. Avoid "click here" or empty links. Use aria-label if needed.',
    whatImproves: 'will have descriptive text, helping users understand where they lead.',
    owner: 'Developer'
  },
  'label': {
    title: 'Form elements must have labels',
    howToFix: 'Associate each form input with a <label> element using the "for" attribute, or use aria-label.',
    whatImproves: 'will be properly labeled, allowing screen reader users to understand form fields.',
    owner: 'Developer'
  },
  'html-has-lang': {
    title: 'HTML element must have a lang attribute',
    howToFix: 'Add lang attribute to the <html> element (e.g., <html lang="en">).',
    whatImproves: 'Screen readers will use the correct language pronunciation.',
    owner: 'Developer'
  },
  'page-has-heading-one': {
    title: 'Page must contain a level-one heading',
    howToFix: 'Add an <h1> element to the page that describes the main content.',
    whatImproves: 'Page structure will be clearer for screen reader users navigating by headings.',
    owner: 'Developer'
  },
  'landmark-one-main': {
    title: 'Document must have a main landmark',
    howToFix: 'Add a <main> element or role="main" to wrap the primary content.',
    whatImproves: 'Screen reader users can quickly navigate to the main content.',
    owner: 'Developer'
  },
  'region': {
    title: 'Page content must be contained by landmarks',
    howToFix: 'Wrap all page content in semantic HTML5 elements (header, nav, main, aside, footer) or ARIA landmarks.',
    whatImproves: 'Screen reader users can efficiently navigate through page sections.',
    owner: 'Developer'
  },
  'aria-required-attr': {
    title: 'ARIA roles must have required attributes',
    howToFix: 'Add all required ARIA attributes for the specified role. Check ARIA specification for details.',
    whatImproves: 'ARIA widgets will function correctly for assistive technologies.',
    owner: 'Developer'
  },
  'aria-valid-attr-value': {
    title: 'ARIA attributes must have valid values',
    howToFix: 'Ensure ARIA attribute values match the expected format (e.g., aria-expanded="true" not "yes").',
    whatImproves: 'ARIA attributes will be recognized and interpreted correctly by assistive technologies.',
    owner: 'Developer'
  },
  'duplicate-id': {
    title: 'IDs must be unique',
    howToFix: 'Ensure each id attribute value is used only once per page.',
    whatImproves: 'ARIA references and form labels will work correctly.',
    owner: 'Developer'
  },
  'heading-order': {
    title: 'Heading levels should increase by one',
    howToFix: 'Use headings in sequential order (h1, h2, h3) without skipping levels.',
    whatImproves: 'Document structure will be logical and easier to navigate.',
    owner: 'Developer'
  },
  'landmark-unique': {
    title: 'Landmarks must be unique',
    howToFix: 'Give each landmark a unique accessible name using aria-label or aria-labelledby.',
    whatImproves: 'Screen reader users can distinguish between multiple landmarks of the same type.',
    owner: 'Developer'
  },
  'list': {
    title: 'Lists must contain only list items',
    howToFix: 'Ensure <ul> and <ol> elements only contain <li> elements as direct children.',
    whatImproves: 'Lists will be properly announced by screen readers.',
    owner: 'Developer'
  },
  'listitem': {
    title: 'List items must be contained in lists',
    howToFix: 'Ensure <li> elements are only used inside <ul>, <ol>, or <menu> elements.',
    whatImproves: 'List structure will be properly announced by screen readers.',
    owner: 'Developer'
  },
  'meta-viewport': {
    title: 'Viewport meta tag should allow scaling',
    howToFix: 'Remove user-scalable=no or maximum-scale values less than 5 from viewport meta tag.',
    whatImproves: 'Users can zoom the page to increase text size.',
    owner: 'Developer'
  },
  'tabindex': {
    title: 'Avoid positive tabindex values',
    howToFix: 'Remove tabindex values greater than 0. Use 0 or -1 instead.',
    whatImproves: 'Keyboard navigation order will match visual order.',
    owner: 'Developer'
  },
  'aria-hidden-focus': {
    title: 'Focusable elements must not be hidden',
    howToFix: 'Remove aria-hidden="true" from focusable elements or make them non-focusable.',
    whatImproves: 'Screen reader users won\'t encounter hidden focusable elements.',
    owner: 'Developer'
  },
  'frame-title': {
    title: 'Frames must have a title',
    howToFix: 'Add a title attribute to <iframe> elements that describes the frame content.',
    whatImproves: 'Screen reader users will understand what each frame contains.',
    owner: 'Developer'
  },
  'skip-link': {
    title: 'Skip link must have a valid target',
    howToFix: 'Ensure the skip link\'s href points to a valid focusable target (for example, id="main" on the main content container). The target element should have tabindex="-1" if it\'s not naturally focusable.',
    whatImproves: 'Keyboard users can efficiently bypass repetitive navigation and jump directly to main content.',
    owner: 'Developer'
  },
  'bypass': {
    title: 'Page must have a skip link',
    howToFix: 'Add a skip link as the first interactive element: <a href="#main">Skip to main content</a>. Ensure the target element has id="main" and tabindex="-1" if needed.',
    whatImproves: 'Keyboard users can efficiently bypass repetitive navigation and jump directly to main content.',
    owner: 'Developer'
  }
};

/**
 * Get fix instruction for a rule ID
 */
export function getFixInstruction(ruleId: string): FixInstruction {
  return fixInstructions[ruleId] || {
    title: 'Review WCAG 2.1 guidelines',
    howToFix: 'Review the WCAG 2.1 guidelines for this rule and implement the recommended fixes.',
    whatImproves: 'will meet accessibility standards.',
    owner: 'Developer'
  };
}

/**
 * Determine owner based on rule ID
 */
export function getOwner(ruleId: string): 'Developer' | 'Designer' | 'Content' {
  const instruction = fixInstructions[ruleId];
  return instruction?.owner || 'Developer';
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
