/**
 * GIGW 3.0 (Guidelines for Indian Government Websites) Utility
 * Helpers and types for GIGW compliance checking
 */

export interface GIGWViolation {
  rule: string;
  description: string;
  severity: 'critical' | 'serious' | 'moderate';
}

export interface GIGWResults {
  passed: boolean;
  totalChecks: number;
  passedChecks: number;
  violations?: GIGWViolation[];
  details?: Record<string, { passed: boolean; severity?: string }>;
}

/**
 * Format GIGW rule name for display
 */
export function formatGIGWRule(rule: string): string {
  // Remove "GIGW 3.0 -" prefix if present
  return rule.replace(/^GIGW\s+3\.0\s+-\s+/i, '').trim();
}

/**
 * Get GIGW compliance level description
 */
export function getGIGWComplianceLevel(passedChecks: number, totalChecks: number): {
  level: string;
  description: string;
  color: string;
} {
  const percentage = (passedChecks / totalChecks) * 100;
  
  if (percentage === 100) {
    return {
      level: 'Fully Compliant',
      description: 'Excellent! Your website meets all GIGW 3.0 requirements for government websites.',
      color: '#059669'
    };
  } else if (percentage >= 75) {
    return {
      level: 'Largely Compliant',
      description: 'Good progress. Address remaining issues to achieve full GIGW 3.0 compliance.',
      color: '#F59E0B'
    };
  } else if (percentage >= 50) {
    return {
      level: 'Partially Compliant',
      description: 'Significant gaps remain. Priority remediation needed for government website standards.',
      color: '#EA580C'
    };
  } else {
    return {
      level: 'Non-Compliant',
      description: 'Critical compliance gaps. Immediate action required to meet mandatory government standards.',
      color: '#DC2626'
    };
  }
}

/**
 * Get GIGW section description
 */
export function getGIGWSectionDescription(section: string): string {
  const descriptions: Record<string, string> = {
    '4.1.1': 'Text Alternatives - All non-text content must have text alternatives',
    '4.1.2': 'Language Declaration - Page language must be declared',
    '4.1.3': 'Page Title - Every page must have a descriptive title',
    '4.2.1': 'Keyboard Access - All functionality available via keyboard',
    '4.2.3': 'Focus Indicators - Visible focus indicators for keyboard navigation',
    '4.2.4': 'Form Labels - All form inputs must have labels',
    '4.3.1': 'Auto-Refresh - No automatic page refresh without user control'
  };
  
  return descriptions[section] || '';
}

/**
 * Check if GIGW compliance is required for website
 */
export function isGIGWRequired(url: string): boolean {
  const urlLower = url.toLowerCase();
  return urlLower.includes('.gov.in') || 
         urlLower.includes('.nic.in') || 
         urlLower.includes('government');
}

/**
 * Get GIGW priority level for violation
 */
export function getGIGWPriority(severity: 'critical' | 'serious' | 'moderate'): {
  priority: string;
  timeline: string;
} {
  const priorityMap = {
    critical: {
      priority: 'P0 - Immediate',
      timeline: 'Must be fixed within 7 days'
    },
    serious: {
      priority: 'P1 - High',
      timeline: 'Should be fixed within 30 days'
    },
    moderate: {
      priority: 'P2 - Medium',
      timeline: 'Should be fixed within 90 days'
    }
  };
  
  return priorityMap[severity];
}

/**
 * Generate GIGW compliance summary
 */
export function generateGIGWSummary(results: GIGWResults): string {
  const { passed, passedChecks, totalChecks } = results;
  const percentage = Math.round((passedChecks / totalChecks) * 100);
  
  if (passed) {
    return `Your website passes all ${totalChecks} GIGW 3.0 compliance checks. Excellent work maintaining government website standards!`;
  } else {
    const failedChecks = totalChecks - passedChecks;
    return `Your website passes ${passedChecks} out of ${totalChecks} GIGW 3.0 checks (${percentage}%). ${failedChecks} check${failedChecks > 1 ? 's' : ''} require attention to meet mandatory government standards.`;
  }
}

/**
 * Get GIGW remediation guidance
 */
export function getGIGWRemediationGuidance(): {
  title: string;
  steps: string[];
} {
  return {
    title: 'GIGW 3.0 Remediation Guidance',
    steps: [
      'Review all failed GIGW checks and prioritize by severity',
      'Assign remediation tasks to appropriate teams (Development/Content/Design)',
      'Implement fixes following WCAG 2.1 Level AA guidelines',
      'Test fixes with assistive technologies (NVDA, JAWS, screen readers)',
      'Conduct internal accessibility audit before deployment',
      'Document all remediation efforts for compliance records',
      'Schedule regular accessibility audits (quarterly recommended)',
      'Provide accessibility training to content authors and developers',
      'Implement accessibility governance in approval workflows',
      'Publish accessibility statement on website as per GIGW requirements'
    ]
  };
}
