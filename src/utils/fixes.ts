/**
 * Fix Instructions Dictionary
 * Maps Axe rule IDs to detailed fix instructions with before/after examples
 */

export interface FixInstruction {
  title: string;
  description: string;
  howToFix: string;
  codeExample?: {
    before: string;
    after: string;
  };
  owner: 'Developer' | 'Designer' | 'Content' | 'Tester';
  whatImproves: string;
}

export const fixInstructions: Record<string, FixInstruction> = {
  'color-contrast': {
    title: 'Color Contrast Issues',
    description: 'Text does not have sufficient color contrast against its background.',
    howToFix: 'Ensure text has a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (18pt or 14pt bold). Use online contrast checkers to verify colors meet WCAG standards.',
    codeExample: {
      before: '<p style="color: #777; background: #fff">Low contrast text</p>',
      after: '<p style="color: #595959; background: #fff">Better contrast text</p>'
    },
    owner: 'Designer',
    whatImproves: 'Users with low vision or color blindness can read content more easily. Improves readability for all users in various lighting conditions.'
  },
  
  'image-alt': {
    title: 'Missing Alternative Text',
    description: 'Images must have alternative text that describes their content and function.',
    howToFix: 'Add meaningful alt attributes to all images. For decorative images, use alt="" (empty alt). For informative images, describe what the image shows. For functional images (links/buttons), describe the action.',
    codeExample: {
      before: '<img src="product.jpg">',
      after: '<img src="product.jpg" alt="Blue cotton t-shirt, front view">'
    },
    owner: 'Content',
    whatImproves: 'Screen reader users can understand image content. Search engines can better index your content. Images display meaningful text when they fail to load.'
  },

  'page-has-heading-one': {
    title: 'Missing Main Heading',
    description: 'Page must have exactly one h1 heading that describes the main topic.',
    howToFix: 'Add a single h1 element that clearly describes the page\'s main content. Ensure it\'s the first heading on the page and accurately represents the page purpose.',
    codeExample: {
      before: '<div class="title">Welcome to Our Site</div>',
      after: '<h1>Welcome to Our Site</h1>'
    },
    owner: 'Developer',
    whatImproves: 'Screen reader users can quickly identify the page purpose. Better document structure for all users. Improved SEO and content organization.'
  },

  'region': {
    title: 'Content Not in Landmark',
    description: 'All page content should be contained in appropriate landmark regions.',
    howToFix: 'Wrap all page content in semantic HTML5 landmarks: <header>, <nav>, <main>, <aside>, <footer>. Use role attributes for older browsers if needed.',
    codeExample: {
      before: '<div class="content">Page content here</div>',
      after: '<main><div class="content">Page content here</div></main>'
    },
    owner: 'Developer',
    whatImproves: 'Screen reader users can navigate page regions quickly. Better document structure and semantic meaning. Easier keyboard navigation.'
  },

  'landmark-one-main': {
    title: 'Multiple or Missing Main Landmark',
    description: 'Page must have exactly one main landmark containing the primary content.',
    howToFix: 'Ensure the page has exactly one <main> element or role="main" that wraps the primary page content. Remove duplicate main landmarks.',
    codeExample: {
      before: '<div class="main-content">Primary content</div>',
      after: '<main>Primary content</main>'
    },
    owner: 'Developer',
    whatImproves: 'Screen reader users can skip directly to main content. Clear content hierarchy. Better accessibility and SEO.'
  },

  'label': {
    title: 'Form Input Missing Label',
    description: 'Form inputs must have associated labels that describe their purpose.',
    howToFix: 'Add a <label> element with a "for" attribute matching the input\'s id. Alternatively, wrap the input in a label element. Ensure label text clearly describes the expected input.',
    codeExample: {
      before: '<input type="text" id="email">',
      after: '<label for="email">Email Address</label>\n<input type="text" id="email">'
    },
    owner: 'Developer',
    whatImproves: 'Screen reader users understand what each form field expects. Clicking labels focuses inputs. Better form usability for all users.'
  },

  'link-name': {
    title: 'Link Has No Accessible Name',
    description: 'Links must have descriptive text or accessible names that indicate their purpose.',
    howToFix: 'Ensure all links have visible text content, aria-label, or aria-labelledby attributes. Avoid generic text like "click here" - be specific about the destination.',
    codeExample: {
      before: '<a href="/products"><img src="arrow.png"></a>',
      after: '<a href="/products" aria-label="View all products"><img src="arrow.png" alt=""></a>'
    },
    owner: 'Content',
    whatImproves: 'Screen reader users understand where links lead. Better context for all users. Improved navigation experience.'
  },

  'button-name': {
    title: 'Button Has No Accessible Name',
    description: 'Buttons must have descriptive text that indicates their purpose or action.',
    howToFix: 'Add text content to buttons, or use aria-label for icon buttons. Describe the action the button performs, not just the icon.',
    codeExample: {
      before: '<button><i class="icon-search"></i></button>',
      after: '<button aria-label="Search"><i class="icon-search"></i></button>'
    },
    owner: 'Developer',
    whatImproves: 'Screen reader users understand button purpose. Clearer user interface for everyone. Better touch target identification on mobile.'
  },

  'aria-allowed-attr': {
    title: 'Invalid ARIA Attribute',
    description: 'Element uses ARIA attributes that are not allowed for its role.',
    howToFix: 'Review ARIA specification and remove invalid attributes. Only use ARIA attributes that are allowed for the element\'s role. Consider if native HTML elements would be better.',
    owner: 'Developer',
    whatImproves: 'Assistive technologies function correctly. Proper ARIA usage prevents confusion. More reliable accessibility support.'
  },

  'aria-required-attr': {
    title: 'Missing Required ARIA Attribute',
    description: 'Element with ARIA role is missing required attributes for that role.',
    howToFix: 'Add all required ARIA attributes for the role. Consult ARIA specification for required attributes. Consider using native HTML elements instead.',
    owner: 'Developer',
    whatImproves: 'Assistive technologies can properly interpret widget state. Complete accessibility information. Better user experience with screen readers.'
  },

  'aria-valid-attr-value': {
    title: 'Invalid ARIA Attribute Value',
    description: 'ARIA attribute has an invalid value.',
    howToFix: 'Correct the ARIA attribute value to match the specification. For boolean attributes use "true" or "false". For ID references ensure the IDs exist.',
    owner: 'Developer',
    whatImproves: 'Assistive technologies interpret values correctly. Proper widget state communication. Reliable accessibility support.'
  },

  'duplicate-id': {
    title: 'Duplicate ID Values',
    description: 'Multiple elements have the same ID attribute value.',
    howToFix: 'Ensure all ID attributes are unique within the page. Update duplicate IDs to have unique values. Check that ARIA references point to correct IDs.',
    owner: 'Developer',
    whatImproves: 'Assistive technologies can properly reference elements. JavaScript functions work correctly. Better DOM structure and validation.'
  },

  'html-has-lang': {
    title: 'Missing Language Declaration',
    description: 'The html element must have a lang attribute to declare page language.',
    howToFix: 'Add lang attribute to <html> element with appropriate language code (e.g., lang="en" for English, lang="hi" for Hindi).',
    codeExample: {
      before: '<html>',
      after: '<html lang="en">'
    },
    owner: 'Developer',
    whatImproves: 'Screen readers use correct pronunciation. Translation tools work better. Search engines understand content language.'
  },

  'skip-link': {
    title: 'Missing Skip Navigation Link',
    description: 'Page should have a skip link to bypass repetitive navigation and jump to main content.',
    howToFix: 'Add a "Skip to main content" link as the first focusable element on the page. Link should point to the main content area using a fragment identifier.',
    codeExample: {
      before: '<body><nav>...</nav><main id="content">',
      after: '<body><a href="#content" class="skip-link">Skip to main content</a><nav>...</nav><main id="content">'
    },
    owner: 'Developer',
    whatImproves: 'Keyboard users can skip repetitive content. Faster navigation for screen reader users. Better user experience for power users.'
  },

  'table-duplicate-name': {
    title: 'Table Has Duplicate Accessible Names',
    description: 'Multiple data tables on the page have the same accessible name.',
    howToFix: 'Ensure each table has a unique and descriptive caption or aria-label that distinguishes it from other tables on the page.',
    owner: 'Content',
    whatImproves: 'Screen reader users can distinguish between different tables. Better content organization. Clearer data structure.'
  },

  'th-has-data-cells': {
    title: 'Table Header Has No Data Cells',
    description: 'Table header cells must be associated with data cells.',
    howToFix: 'Ensure table structure is correct with proper th and td elements. Use scope attribute on th elements. Verify table has data cells.',
    owner: 'Developer',
    whatImproves: 'Screen readers can properly announce table relationships. Better understanding of tabular data. Improved navigation within tables.'
  },

  'td-headers-attr': {
    title: 'Invalid Table Headers Attribute',
    description: 'Table data cell headers attribute does not reference valid header cells.',
    howToFix: 'Ensure headers attribute references valid IDs of th elements. For simple tables, use scope attribute instead. Verify all referenced IDs exist.',
    owner: 'Developer',
    whatImproves: 'Screen readers correctly associate data with headers. Better table comprehension. Proper semantic relationships.'
  },

  'form-field-multiple-labels': {
    title: 'Form Field Has Multiple Labels',
    description: 'Form inputs should have exactly one label, not multiple.',
    howToFix: 'Remove duplicate labels. Ensure each input has only one associated label element. Combine label text if needed.',
    owner: 'Developer',
    whatImproves: 'Screen readers announce form fields correctly. Less confusion for all users. Cleaner form structure.'
  },

  'heading-order': {
    title: 'Heading Levels Skip',
    description: 'Headings should increase by one level at a time (h1 → h2 → h3), not skip levels.',
    howToFix: 'Restructure headings to follow proper hierarchy. Don\'t skip levels (e.g., h1 → h3). Use CSS for visual styling instead of heading levels.',
    owner: 'Developer',
    whatImproves: 'Screen reader users understand document structure. Better content outline. Improved navigation and comprehension.'
  },

  'empty-heading': {
    title: 'Empty Heading Element',
    description: 'Heading elements must contain text content.',
    howToFix: 'Add meaningful text to heading elements or remove them. If heading is used for spacing, use CSS instead.',
    owner: 'Content',
    whatImproves: 'Screen readers don\'t announce meaningless headings. Better document structure. Cleaner semantic HTML.'
  },

  'list': {
    title: 'List Structure Invalid',
    description: 'List elements (ul, ol) can only contain li elements as direct children.',
    howToFix: 'Ensure ul and ol elements only contain li elements as direct children. Move other elements inside li elements or outside the list.',
    owner: 'Developer',
    whatImproves: 'Screen readers correctly announce list structure and item count. Proper semantic meaning. Better navigation through lists.'
  },

  'listitem': {
    title: 'List Item Outside List',
    description: 'li elements must be contained in ul, ol, or menu parent elements.',
    howToFix: 'Wrap li elements in appropriate parent list elements (ul or ol). Remove list item styling if not an actual list.',
    owner: 'Developer',
    whatImproves: 'Screen readers properly identify list structures. Correct semantic relationships. Better document outline.'
  },

  'meta-viewport': {
    title: 'Zoom and Scaling Disabled',
    description: 'Viewport meta tag should not disable zoom or set maximum scale.',
    howToFix: 'Remove user-scalable=no and maximum-scale restrictions from viewport meta tag. Allow users to zoom up to at least 200%.',
    codeExample: {
      before: '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">',
      after: '<meta name="viewport" content="width=device-width, initial-scale=1">'
    },
    owner: 'Developer',
    whatImproves: 'Users with low vision can zoom the page. Better mobile accessibility. Compliance with WCAG 2.1 Level AA.'
  },

  'frame-title': {
    title: 'Frame Missing Title',
    description: 'Frames and iframes must have title attributes that describe their content.',
    howToFix: 'Add a descriptive title attribute to all iframe and frame elements that explains what content they contain.',
    codeExample: {
      before: '<iframe src="video.html"></iframe>',
      after: '<iframe src="video.html" title="Product demonstration video"></iframe>'
    },
    owner: 'Developer',
    whatImproves: 'Screen reader users understand iframe content. Better navigation between frames. Clearer page structure.'
  },

  'input-image-alt': {
    title: 'Image Button Missing Alt Text',
    description: 'Image buttons (input type="image") must have alt attributes.',
    howToFix: 'Add alt attribute to image buttons describing the button action, not the image.',
    codeExample: {
      before: '<input type="image" src="search.png">',
      after: '<input type="image" src="search.png" alt="Search">'
    },
    owner: 'Developer',
    whatImproves: 'Screen reader users understand button purpose. Better form accessibility. Clearer user interface.'
  },

  'select-name': {
    title: 'Select Element Missing Label',
    description: 'Select dropdowns must have associated labels.',
    howToFix: 'Add a label element with for attribute matching the select id, or wrap the select in a label element.',
    owner: 'Developer',
    whatImproves: 'Screen reader users understand dropdown purpose. Better form usability. Clicking label focuses select.'
  },

  'video-caption': {
    title: 'Video Missing Captions',
    description: 'Video elements must have captions for deaf or hard-of-hearing users.',
    howToFix: 'Add captions using <track kind="captions"> element. Provide WebVTT caption files. Ensure captions are synchronized with audio.',
    owner: 'Content',
    whatImproves: 'Deaf and hard-of-hearing users can access video content. Better comprehension in sound-sensitive environments. Improved SEO.'
  },

  'audio-caption': {
    title: 'Audio Missing Transcript',
    description: 'Audio content must have text transcripts or captions.',
    howToFix: 'Provide a text transcript of audio content. Link to transcript near audio player. Ensure transcript is synchronized if possible.',
    owner: 'Content',
    whatImproves: 'Deaf users can access audio content. Better content indexing. Users can search and reference content easily.'
  },

  'object-alt': {
    title: 'Object Missing Alternative Text',
    description: 'Object elements must have alternative text via inner text or aria-label.',
    howToFix: 'Add descriptive text inside object element or use aria-label attribute to describe the object\'s content and purpose.',
    owner: 'Developer',
    whatImproves: 'Screen reader users can access object content. Fallback content for unsupported plugins. Better accessibility support.'
  },

  'aria-hidden-focus': {
    title: 'Focusable Element Inside aria-hidden',
    description: 'Elements with aria-hidden="true" should not contain focusable elements.',
    howToFix: 'Remove focusable elements from aria-hidden containers, or remove aria-hidden attribute. Use CSS visibility: hidden instead if needed.',
    owner: 'Developer',
    whatImproves: 'Keyboard users don\'t get trapped in hidden content. Consistent behavior between visual and screen reader users. Better navigation experience.'
  },

  'tabindex': {
    title: 'Invalid Tabindex Value',
    description: 'Positive tabindex values should be avoided as they disrupt natural tab order.',
    howToFix: 'Remove positive tabindex values. Use tabindex="0" to add elements to tab order or tabindex="-1" to remove from tab order. Restructure HTML for proper natural order.',
    owner: 'Developer',
    whatImproves: 'Predictable keyboard navigation. Better tab order for all users. Less maintenance overhead.'
  },

  'accesskeys': {
    title: 'Access Keys Conflict',
    description: 'Access keys may conflict with browser or assistive technology shortcuts.',
    howToFix: 'Avoid using accesskey attribute. If required, document all access keys clearly and avoid common browser shortcuts.',
    owner: 'Developer',
    whatImproves: 'No conflicts with assistive technology shortcuts. Better keyboard navigation. More reliable user experience.'
  },

  'marquee': {
    title: 'Marquee Element Used',
    description: 'Marquee elements are deprecated and inaccessible.',
    howToFix: 'Replace <marquee> with CSS animations that users can control. Provide pause controls for any auto-moving content.',
    owner: 'Developer',
    whatImproves: 'Users with cognitive disabilities can read content. No motion sickness from auto-scrolling. Better accessibility for everyone.'
  },

  'blink': {
    title: 'Blink Element Used',
    description: 'Blink elements are deprecated and cause accessibility issues.',
    howToFix: 'Remove <blink> elements. Use CSS for visual effects if needed, ensuring they can be controlled or disabled.',
    owner: 'Developer',
    whatImproves: 'Users with cognitive disabilities can focus. No seizure triggers. Better readability for all users.'
  }
};

/**
 * Get fix instruction for a specific rule
 */
export function getFixInstruction(ruleId: string): FixInstruction | null {
  return fixInstructions[ruleId] || null;
}

/**
 * Get all available fix instructions
 */
export function getAllFixInstructions(): Record<string, FixInstruction> {
  return fixInstructions;
}
