/**
 * Issue Grouping and Business Context
 * Groups issues, calculates business risks, and provides sector-specific guidance
 */

import { EnrichedIssue } from './wcag-categorizer';

export interface GroupedIssue {
  ruleId: string;
  description: string;
  severity: string;
  severityText: string;
  count: number;
  wcagCategory: any;
  owner: string;
  fixInstruction: any;
  whatImproves: string;
  selectors: string[];
  firstIssue: EnrichedIssue;
}

export interface SeverityBreakdown {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  total: number;
}

export interface BusinessRisk {
  level: 'Critical' | 'High' | 'Medium' | 'Low';
  score: number;
  description: string;
  legalRisk: string;
  reputationRisk: string;
  recommendations: string[];
}

export interface IndiaCompliance {
  rpwdStatus: 'Non-compliant' | 'Partially Compliant' | 'Compliant';
  is17802Status: 'Non-compliant' | 'Partially Compliant' | 'Compliant';
  criticalGaps: string[];
  timeline: string;
}

export interface SectorGuidance {
  sector: 'BFSI' | 'Government' | 'Education' | 'Healthcare' | 'E-commerce' | 'General';
  regulations: string[];
  specificRequirements: string[];
  complianceDeadline?: string;
  penalties?: string;
}

/**
 * Group issues by rule ID
 */
export function groupIssues(issues: EnrichedIssue[]): GroupedIssue[] {
  const grouped = new Map<string, GroupedIssue>();

  issues.forEach(issue => {
    if (grouped.has(issue.ruleId)) {
      const existing = grouped.get(issue.ruleId)!;
      existing.count++;
      if (issue.selector) {
        existing.selectors.push(issue.selector);
      }
    } else {
      grouped.set(issue.ruleId, {
        ruleId: issue.ruleId,
        description: issue.description,
        severity: issue.severity,
        severityText: issue.severityText,
        count: 1,
        wcagCategory: issue.wcagCategory,
        owner: issue.owner,
        fixInstruction: issue.fixInstruction,
        whatImproves: issue.whatImproves,
        selectors: issue.selector ? [issue.selector] : [],
        firstIssue: issue
      });
    }
  });

  return Array.from(grouped.values()).sort((a, b) => {
    // Sort by severity first, then by count
    const severityOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    const severityDiff = severityOrder[a.severity as keyof typeof severityOrder] - 
                         severityOrder[b.severity as keyof typeof severityOrder];
    if (severityDiff !== 0) return severityDiff;
    return b.count - a.count;
  });
}

/**
 * Calculate severity breakdown
 */
export function calculateSeverityBreakdown(issues: EnrichedIssue[]): SeverityBreakdown {
  const breakdown: SeverityBreakdown = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    total: issues.length
  };

  issues.forEach(issue => {
    if (issue.severity === 'critical') breakdown.critical++;
    else if (issue.severity === 'serious') breakdown.serious++;
    else if (issue.severity === 'moderate') breakdown.moderate++;
    else if (issue.severity === 'minor') breakdown.minor++;
  });

  return breakdown;
}

/**
 * Calculate business risk based on severity breakdown
 */
export function calculateBusinessRisk(breakdown: SeverityBreakdown): BusinessRisk {
  // Calculate risk score (0-100)
  const score = (
    breakdown.critical * 25 +
    breakdown.serious * 15 +
    breakdown.moderate * 8 +
    breakdown.minor * 2
  );

  let level: 'Critical' | 'High' | 'Medium' | 'Low';
  let description: string;
  let legalRisk: string;
  let reputationRisk: string;
  let recommendations: string[];

  if (breakdown.critical > 0 || score > 100) {
    level = 'Critical';
    description = 'Immediate action required. Your website has critical accessibility barriers that prevent users with disabilities from accessing essential features. This exposes your organization to significant legal and reputational risks.';
    legalRisk = 'High risk of legal action under RPWD Act 2016 and potential discrimination claims. Organizations have faced litigation and penalties for similar violations.';
    reputationRisk = 'Severe brand damage risk. Inaccessible websites generate negative publicity and can trigger social media backlash, affecting customer trust and market position.';
    recommendations = [
      'Establish an emergency remediation team to address critical issues within 7 days',
      'Conduct accessibility audit of all user-critical paths',
      'Implement accessibility governance framework immediately',
      'Consider engaging accessibility consultants for rapid remediation',
      'Document remediation efforts for legal protection'
    ];
  } else if (breakdown.serious > 5 || score > 50) {
    level = 'High';
    description = 'Significant accessibility barriers exist that limit access for users with disabilities. Prompt action needed to reduce legal exposure and improve user experience.';
    legalRisk = 'Elevated risk of complaints and legal notices. While not immediately critical, continued non-compliance increases vulnerability to legal action.';
    reputationRisk = 'Moderate brand risk. Accessibility issues may be discovered and shared, affecting customer perception and competitive position.';
    recommendations = [
      'Prioritize serious issues for remediation within 30 days',
      'Establish accessibility testing in development workflow',
      'Train development team on WCAG 2.1 Level AA standards',
      'Implement automated accessibility monitoring',
      'Create accessibility roadmap with quarterly goals'
    ];
  } else if (score > 20) {
    level = 'Medium';
    description = 'Moderate accessibility issues present. While not immediately blocking, these issues impact user experience and should be addressed to ensure full compliance.';
    legalRisk = 'Low to moderate risk. Current issues unlikely to trigger immediate legal action but should be addressed for comprehensive compliance.';
    reputationRisk = 'Limited reputational risk, but proactive improvement demonstrates commitment to inclusion and may provide competitive advantage.';
    recommendations = [
      'Address moderate and minor issues in next development sprint',
      'Integrate accessibility checks in QA process',
      'Conduct user testing with people with disabilities',
      'Review and update accessibility policies',
      'Schedule regular accessibility audits'
    ];
  } else {
    level = 'Low';
    description = 'Good accessibility foundation with minor improvements needed. Continue maintaining high standards and addressing remaining issues.';
    legalRisk = 'Minimal legal risk. Current state demonstrates good-faith effort toward accessibility compliance.';
    reputationRisk = 'Positive reputation potential. Strong accessibility demonstrates corporate responsibility and commitment to inclusion.';
    recommendations = [
      'Address remaining minor issues in regular maintenance cycles',
      'Maintain accessibility standards in new features',
      'Consider achieving WCAG 2.1 Level AAA for key user flows',
      'Share accessibility commitment in public communications',
      'Benchmark accessibility against industry leaders'
    ];
  }

  return {
    level,
    score: Math.min(100, score),
    description,
    legalRisk,
    reputationRisk,
    recommendations
  };
}

/**
 * Calculate India compliance status
 */
export function calculateIndiaComplianceStatus(breakdown: SeverityBreakdown, isGovernment: boolean): IndiaCompliance {
  const criticalGaps: string[] = [];
  
  if (breakdown.critical > 0) {
    criticalGaps.push('Critical WCAG 2.1 Level A violations must be remediated immediately');
  }
  if (breakdown.serious > 0) {
    criticalGaps.push('Serious accessibility barriers impact RPWD Act 2016 compliance');
  }
  if (isGovernment) {
    criticalGaps.push('Government websites must meet GIGW 3.0 and IS 17802 standards');
  }

  let rpwdStatus: 'Non-compliant' | 'Partially Compliant' | 'Compliant';
  let is17802Status: 'Non-compliant' | 'Partially Compliant' | 'Compliant';
  let timeline: string;

  if (breakdown.critical > 0) {
    rpwdStatus = 'Non-compliant';
    is17802Status = 'Non-compliant';
    timeline = 'Immediate action required. Recommend 30-day sprint for critical issues, 90 days for full compliance.';
  } else if (breakdown.serious > 3) {
    rpwdStatus = 'Partially Compliant';
    is17802Status = 'Partially Compliant';
    timeline = 'Moderate compliance gaps. Recommend 60-day remediation plan for serious issues, 120 days for complete compliance.';
  } else if (breakdown.total > 5) {
    rpwdStatus = 'Partially Compliant';
    is17802Status = 'Partially Compliant';
    timeline = 'Minor gaps remain. Recommend addressing in next 90 days to achieve full compliance.';
  } else {
    rpwdStatus = 'Compliant';
    is17802Status = 'Compliant';
    timeline = 'Strong compliance foundation. Maintain standards and address minor issues in regular maintenance.';
  }

  return {
    rpwdStatus,
    is17802Status,
    criticalGaps,
    timeline
  };
}

/**
 * Detect sector type from URL
 */
export function getSectorType(url: string): SectorGuidance['sector'] {
  const urlLower = url.toLowerCase();
  
  // Government sites
  if (urlLower.includes('.gov.in') || urlLower.includes('.nic.in') || urlLower.includes('government')) {
    return 'Government';
  }
  
  // Banking and Financial Services
  if (urlLower.includes('bank') || urlLower.includes('finance') || urlLower.includes('insurance') || 
      urlLower.includes('mutual') || urlLower.includes('nbfc')) {
    return 'BFSI';
  }
  
  // Education
  if (urlLower.includes('university') || urlLower.includes('.edu') || urlLower.includes('college') || 
      urlLower.includes('school') || urlLower.includes('academy')) {
    return 'Education';
  }
  
  // Healthcare
  if (urlLower.includes('hospital') || urlLower.includes('clinic') || urlLower.includes('health') || 
      urlLower.includes('medical') || urlLower.includes('pharma')) {
    return 'Healthcare';
  }
  
  // E-commerce
  if (urlLower.includes('shop') || urlLower.includes('store') || urlLower.includes('cart') || 
      urlLower.includes('ecommerce') || urlLower.includes('marketplace')) {
    return 'E-commerce';
  }
  
  return 'General';
}

/**
 * Check if site is government
 */
export function isGovernmentSite(url: string): boolean {
  return getSectorType(url) === 'Government';
}

/**
 * Get sector-specific guidance
 */
export function getSectorGuidance(url: string): SectorGuidance {
  const sector = getSectorType(url);
  
  const guidanceMap: Record<SectorGuidance['sector'], SectorGuidance> = {
    'Government': {
      sector: 'Government',
      regulations: [
        'GIGW 3.0 (Guidelines for Indian Government Websites)',
        'RPWD Act 2016 - Section 46',
        'IS 17802:2023 Indian Standard on Information Technology Accessibility',
        'Central Government Digital Accessibility Policy'
      ],
      specificRequirements: [
        'All government websites must comply with GIGW 3.0 standards',
        'Accessibility statement must be prominently displayed',
        'WCAG 2.1 Level AA compliance mandatory',
        'Regular accessibility audits required',
        'Screen reader compatibility certification needed',
        'Multilingual accessibility support for Indian languages'
      ],
      complianceDeadline: 'Immediate compliance required under RPWD Act 2016',
      penalties: 'Non-compliance may result in audit observations, public interest litigation, and reputational damage'
    },
    'BFSI': {
      sector: 'BFSI',
      regulations: [
        'RPWD Act 2016',
        'RBI Master Direction on Customer Service',
        'SEBI Accessibility Guidelines (for market infrastructure)',
        'IRDAI Accessibility Requirements (for insurance)'
      ],
      specificRequirements: [
        'Critical user journeys (account access, transactions) must be fully accessible',
        'Alternative accessible formats for financial documents',
        'Accessible mobile banking applications',
        'Keyboard-only navigation for all functions',
        'Strong authentication accessible to users with disabilities',
        'Clear error messages and form validation'
      ],
      complianceDeadline: 'RBI guidelines recommend immediate compliance',
      penalties: 'Regulatory scrutiny, potential customer complaints, and reputational risk in sensitive sector'
    },
    'Education': {
      sector: 'Education',
      regulations: [
        'RPWD Act 2016 - Right to Education',
        'UGC Guidelines on Equal Opportunity',
        'AICTE Accessibility Norms'
      ],
      specificRequirements: [
        'Learning Management Systems must be accessible',
        'Online course materials in accessible formats',
        'Accessible examination and assessment systems',
        'Screen reader compatible educational content',
        'Captioned videos and transcribed audio lectures',
        'Accessible library and research databases'
      ],
      complianceDeadline: 'Progressive implementation recommended over 6-12 months',
      penalties: 'May face discrimination complaints, loss of accreditation points, and limited government funding'
    },
    'Healthcare': {
      sector: 'Healthcare',
      regulations: [
        'RPWD Act 2016',
        'Clinical Establishments Act 2010',
        'National Health Policy (Digital Health Mission)'
      ],
      specificRequirements: [
        'Patient portals and health records accessible',
        'Appointment booking systems accessible',
        'Telemedicine platforms compliant',
        'Critical health information in accessible formats',
        'Emergency contact and services easily accessible',
        'Prescription and medication information accessible'
      ],
      complianceDeadline: 'Critical for patient safety - immediate compliance recommended',
      penalties: 'Patient safety risks, potential medical negligence implications, and licensing concerns'
    },
    'E-commerce': {
      sector: 'E-commerce',
      regulations: [
        'RPWD Act 2016',
        'Consumer Protection Act 2019 (Digital Consumer Rights)',
        'IS 17802:2023'
      ],
      specificRequirements: [
        'Product browsing and search accessible',
        'Shopping cart and checkout fully accessible',
        'Product information in accessible formats',
        'Accessible payment and authentication',
        'Order tracking and customer service accessible',
        'Returns and refunds processes accessible'
      ],
      complianceDeadline: 'Recommended within 90 days to avoid customer complaints',
      penalties: 'Loss of customer base (15%+ market), potential consumer complaints, competitive disadvantage'
    },
    'General': {
      sector: 'General',
      regulations: [
        'RPWD Act 2016',
        'IS 17802:2023',
        'Information Technology Act 2000 (Digital Inclusion)'
      ],
      specificRequirements: [
        'WCAG 2.1 Level AA compliance',
        'Keyboard accessibility for all functions',
        'Screen reader compatibility',
        'Clear navigation and content structure',
        'Accessible forms and error handling',
        'Sufficient color contrast and text sizing'
      ],
      complianceDeadline: 'Progressive compliance recommended over 3-6 months',
      penalties: 'Reputational risk, potential discrimination complaints, reduced market reach'
    }
  };
  
  return guidanceMap[sector];
}

/**
 * Group issues by severity
 */
export function groupIssuesBySeverity(groupedIssues: GroupedIssue[]): Record<string, GroupedIssue[]> {
  return {
    critical: groupedIssues.filter(i => i.severity === 'critical'),
    serious: groupedIssues.filter(i => i.severity === 'serious'),
    moderate: groupedIssues.filter(i => i.severity === 'moderate'),
    minor: groupedIssues.filter(i => i.severity === 'minor')
  };
}
