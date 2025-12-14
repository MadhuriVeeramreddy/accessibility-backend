/**
 * WCAG Categorization and Issue Enrichment
 * Maps accessibility issues to WCAG 2.1 principles and success criteria
 */

import { getFixInstruction, FixInstruction } from './fixes';

export interface WCAGCategory {
  principle: 'Perceivable' | 'Operable' | 'Understandable' | 'Robust';
  guideline: string;
  successCriteria: string;
  level: 'A' | 'AA' | 'AAA';
}

export interface EnrichedIssue {
  ruleId: string;
  severity: string;
  severityText: string;
  selector: string | null;
  description: string;
  snippet: string | null;
  wcagCategory: WCAGCategory;
  owner: 'Developer' | 'Designer' | 'Content' | 'Tester';
  fixInstruction?: FixInstruction;
  whatImproves: string;
  impact: string;
}

/**
 * WCAG mapping for common accessibility issues
 */
const wcagMapping: Record<string, WCAGCategory> = {
  'color-contrast': {
    principle: 'Perceivable',
    guideline: '1.4 Distinguishable',
    successCriteria: '1.4.3 Contrast (Minimum)',
    level: 'AA'
  },
  'image-alt': {
    principle: 'Perceivable',
    guideline: '1.1 Text Alternatives',
    successCriteria: '1.1.1 Non-text Content',
    level: 'A'
  },
  'page-has-heading-one': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'region': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'landmark-one-main': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'label': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'link-name': {
    principle: 'Operable',
    guideline: '2.4 Navigable',
    successCriteria: '2.4.4 Link Purpose (In Context)',
    level: 'A'
  },
  'button-name': {
    principle: 'Operable',
    guideline: '2.4 Navigable',
    successCriteria: '2.4.4 Link Purpose (In Context)',
    level: 'A'
  },
  'skip-link': {
    principle: 'Operable',
    guideline: '2.4 Navigable',
    successCriteria: '2.4.1 Bypass Blocks',
    level: 'A'
  },
  'html-has-lang': {
    principle: 'Understandable',
    guideline: '3.1 Readable',
    successCriteria: '3.1.1 Language of Page',
    level: 'A'
  },
  'aria-allowed-attr': {
    principle: 'Robust',
    guideline: '4.1 Compatible',
    successCriteria: '4.1.2 Name, Role, Value',
    level: 'A'
  },
  'aria-required-attr': {
    principle: 'Robust',
    guideline: '4.1 Compatible',
    successCriteria: '4.1.2 Name, Role, Value',
    level: 'A'
  },
  'aria-valid-attr-value': {
    principle: 'Robust',
    guideline: '4.1 Compatible',
    successCriteria: '4.1.2 Name, Role, Value',
    level: 'A'
  },
  'duplicate-id': {
    principle: 'Robust',
    guideline: '4.1 Compatible',
    successCriteria: '4.1.1 Parsing',
    level: 'A'
  },
  'heading-order': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'empty-heading': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'list': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'listitem': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'meta-viewport': {
    principle: 'Operable',
    guideline: '1.4 Distinguishable',
    successCriteria: '1.4.4 Resize Text',
    level: 'AA'
  },
  'frame-title': {
    principle: 'Operable',
    guideline: '2.4 Navigable',
    successCriteria: '2.4.1 Bypass Blocks',
    level: 'A'
  },
  'form-field-multiple-labels': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'table-duplicate-name': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'th-has-data-cells': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'td-headers-attr': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'video-caption': {
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    successCriteria: '1.2.2 Captions (Prerecorded)',
    level: 'A'
  },
  'audio-caption': {
    principle: 'Perceivable',
    guideline: '1.2 Time-based Media',
    successCriteria: '1.2.1 Audio-only and Video-only',
    level: 'A'
  },
  'aria-hidden-focus': {
    principle: 'Operable',
    guideline: '2.1 Keyboard Accessible',
    successCriteria: '2.1.1 Keyboard',
    level: 'A'
  },
  'tabindex': {
    principle: 'Operable',
    guideline: '2.4 Navigable',
    successCriteria: '2.4.3 Focus Order',
    level: 'A'
  },
  'select-name': {
    principle: 'Perceivable',
    guideline: '1.3 Adaptable',
    successCriteria: '1.3.1 Info and Relationships',
    level: 'A'
  },
  'input-image-alt': {
    principle: 'Perceivable',
    guideline: '1.1 Text Alternatives',
    successCriteria: '1.1.1 Non-text Content',
    level: 'A'
  }
};

/**
 * Default WCAG category for unmapped issues
 */
const defaultWCAGCategory: WCAGCategory = {
  principle: 'Robust',
  guideline: '4.1 Compatible',
  successCriteria: '4.1.1 Parsing',
  level: 'A'
};

/**
 * Severity text mapping
 */
const severityTextMap: Record<string, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor'
};

/**
 * Impact descriptions for severity levels
 */
const impactDescriptions: Record<string, string> = {
  critical: 'Blocks access for users with disabilities. Must be fixed immediately.',
  serious: 'Significantly impacts usability for users with disabilities. Should be fixed as priority.',
  moderate: 'Impacts some users with disabilities. Should be addressed in upcoming sprint.',
  minor: 'Minor accessibility improvement. Can be addressed in regular maintenance.'
};

/**
 * Enrich a single issue with additional context
 */
export function enrichIssue(issue: any): EnrichedIssue {
  const fixInstruction = getFixInstruction(issue.ruleId) || undefined;
  const wcagCategory = wcagMapping[issue.ruleId] || defaultWCAGCategory;
  
  return {
    ruleId: issue.ruleId,
    severity: issue.severity,
    severityText: severityTextMap[issue.severity] || 'Unknown',
    selector: issue.selector,
    description: issue.description,
    snippet: issue.snippet,
    wcagCategory,
    owner: fixInstruction?.owner || 'Developer',
    fixInstruction,
    whatImproves: fixInstruction?.whatImproves || 'Improves accessibility for users with disabilities.',
    impact: impactDescriptions[issue.severity] || 'Impacts accessibility.'
  };
}

/**
 * Enrich multiple issues
 */
export function enrichIssues(issues: any[]): EnrichedIssue[] {
  return issues.map(enrichIssue);
}

/**
 * Calculate WCAG conformance level based on issues
 */
export interface WCAGConformance {
  level: 'AAA' | 'AA' | 'A' | 'Non-conformant';
  passedCriteria: number;
  totalCriteria: number;
  failedCriteria: {
    criterion: string;
    level: string;
    count: number;
  }[];
}

export function calculateWCAGConformance(issues: EnrichedIssue[]): WCAGConformance {
  const failedCriteria = new Map<string, { level: string; count: number }>();
  
  issues.forEach(issue => {
    const key = issue.wcagCategory.successCriteria;
    if (failedCriteria.has(key)) {
      const existing = failedCriteria.get(key)!;
      existing.count++;
    } else {
      failedCriteria.set(key, {
        level: issue.wcagCategory.level,
        count: 1
      });
    }
  });

  const hasLevelA = Array.from(failedCriteria.values()).some(f => f.level === 'A');
  const hasLevelAA = Array.from(failedCriteria.values()).some(f => f.level === 'AA');
  
  let conformanceLevel: 'AAA' | 'AA' | 'A' | 'Non-conformant';
  if (hasLevelA) {
    conformanceLevel = 'Non-conformant';
  } else if (hasLevelAA) {
    conformanceLevel = 'A';
  } else if (failedCriteria.size === 0) {
    conformanceLevel = 'AAA';
  } else {
    conformanceLevel = 'AA';
  }

  return {
    level: conformanceLevel,
    passedCriteria: 0, // Would need full WCAG test suite to determine
    totalCriteria: 50, // WCAG 2.1 has 50 Level A criteria
    failedCriteria: Array.from(failedCriteria.entries()).map(([criterion, data]) => ({
      criterion,
      level: data.level,
      count: data.count
    }))
  };
}

/**
 * Group issues by WCAG category
 */
export interface WCAGCategoryGroup {
  principle: string;
  issues: EnrichedIssue[];
  count: number;
}

export function groupIssuesByWCAGCategory(issues: EnrichedIssue[]): WCAGCategoryGroup[] {
  const grouped = new Map<string, EnrichedIssue[]>();
  
  issues.forEach(issue => {
    const principle = issue.wcagCategory.principle;
    if (!grouped.has(principle)) {
      grouped.set(principle, []);
    }
    grouped.get(principle)!.push(issue);
  });

  return Array.from(grouped.entries()).map(([principle, issues]) => ({
    principle,
    issues,
    count: issues.length
  }));
}

/**
 * Get WCAG principle description
 */
export function getWCAGPrincipleDescription(principle: string): string {
  const descriptions: Record<string, string> = {
    'Perceivable': 'Information and user interface components must be presentable to users in ways they can perceive.',
    'Operable': 'User interface components and navigation must be operable by all users.',
    'Understandable': 'Information and the operation of user interface must be understandable.',
    'Robust': 'Content must be robust enough that it can be interpreted by a wide variety of user agents, including assistive technologies.'
  };
  return descriptions[principle] || '';
}
