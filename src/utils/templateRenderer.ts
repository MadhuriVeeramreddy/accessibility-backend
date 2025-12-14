import { readFileSync } from 'fs';
import { join } from 'path';
import { colors } from '../config/colors';
import { icons } from './icons';
import { getFixInstruction, getOwner, escapeHtml, truncate } from './issueHelpers';

/**
 * Issue interface
 */
export interface Issue {
  ruleId: string;
  severity: string;
  selector?: string;
  description: string;
  snippet?: string;
}

/**
 * Template data interface
 */
export interface TemplateData {
  websiteUrl: string;
  websiteName: string;
  scanDate: string;
  scanId: string;
  score: number;
  totalIssues: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  businessRisk: string;
  businessRiskDescription: string;
  gigwStatus: string;
  gigwPassed: number;
  gigwTotal: number;
  gigwViolations: Array<{ rule: string; description: string }>;
  dashboardUrl: string;
  issues: Issue[];
}

/**
 * Group issues by rule ID and count occurrences
 */
function groupIssuesByRule(issues: Issue[]): Map<string, Issue[]> {
  const grouped = new Map<string, Issue[]>();
  issues.forEach(issue => {
    if (!grouped.has(issue.ruleId)) {
      grouped.set(issue.ruleId, []);
    }
    grouped.get(issue.ruleId)!.push(issue);
  });
  return grouped;
}

/**
 * Generate HTML for a single issue card
 */
function generateIssueCard(ruleId: string, issueGroup: Issue[], dashboardUrl: string): string {
  const count = issueGroup.length;
  const severity = issueGroup[0].severity;
  const description = issueGroup[0].description;
  const fixInstruction = getFixInstruction(ruleId);
  const owner = getOwner(ruleId);
  
  // Get selectors (limit to 5)
  const selectors = issueGroup
    .map(i => i.selector)
    .filter((s): s is string => !!s)
    .slice(0, 5);
  
  const hasMoreSelectors = issueGroup.filter(i => i.selector).length > 5;
  
  // Generate selectors list HTML (modern monospace)
  let selectorsHtml = '';
  if (selectors.length > 0) {
    const selectorsList = selectors.map((selector, idx) => `
      <div class="elements-list" style="margin: 4pt 0;">
        <span style="color: #94a3b8; font-weight: 600;">${idx + 1}.</span> ${escapeHtml(truncate(selector, 100))}
      </div>`).join('\n');
    
    selectorsHtml = `
      <div style="margin: 12pt 0;">
        <p style="font-size: 9pt; font-weight: 600; color: #475569; margin: 0 0 8pt 0;">📍 Affected Elements</p>
        ${selectorsList}
        ${hasMoreSelectors ? `
          <div style="margin-top: 8pt; padding: 8pt 12pt; background: #eff6ff; border-radius: 6pt; border: 1pt solid #bfdbfe;">
            <p style="margin: 0; font-size: 8pt; color: #1e40af;">
              <strong>+${count - 5} more elements</strong> — <a href="${dashboardUrl}" style="color: #3b82f6;">View complete list</a>
            </p>
          </div>` : ''}
      </div>`;
  }
  
  // Severity styling (modern SaaS)
  const severityBadges: Record<string, string> = {
    critical: 'issue-badge critical',
    serious: 'issue-badge serious',
    moderate: 'issue-badge moderate',
    minor: 'issue-badge minor'
  };
  
  const badge = severityBadges[severity] || severityBadges.minor;
  const icon = severity === 'critical' ? '🚨' : severity === 'serious' ? '⚠️' : severity === 'moderate' ? '⚡' : 'ℹ️';
  
  return `
    <div class="issue-block">
      <div class="issue-header">
        <h4 class="issue-title">
          ${icon} ${escapeHtml(ruleId)}
        </h4>
        <span class="${badge}">${severity}</span>
      </div>
      
      <div class="issue-meta">
        <div class="issue-meta-item">
          <span>📍</span>
          <span>${count} element${count > 1 ? 's' : ''} affected</span>
        </div>
        <div class="issue-meta-item">
          <span class="owner-tag">👤 ${owner}</span>
        </div>
      </div>
      
      <p class="issue-description">${escapeHtml(description)}</p>
      
      <div style="margin: 12pt 0; padding: 12pt; background: #f0fdf4; border-radius: 6pt; border-left: 3pt solid #22c55e;">
        <p style="margin: 0 0 6pt 0; font-weight: 600; color: #16a34a; font-size: 9pt;">✨ Impact When Fixed</p>
        <p style="margin: 0; font-size: 9pt; color: #475569;">${count} element${count > 1 ? 's' : ''} ${escapeHtml(fixInstruction.whatImproves)}</p>
      </div>
      
      <div class="fix-instruction">
        <strong>🔧 How to Fix</strong>
        <div class="fix-content">${escapeHtml(fixInstruction.howToFix)}</div>
      </div>
      
      ${selectorsHtml}
    </div>`;
}

/**
 * Generate HTML for a severity section
 */
function generateSeveritySection(
  severity: string,
  icon: string,
  count: number,
  issues: Issue[],
  dashboardUrl: string
): string {
  if (count === 0) return '';
  
  const grouped = groupIssuesByRule(issues);
  const ruleIds = Array.from(grouped.keys()).slice(0, 5); // Show max 5 different issue types
  const hasMore = grouped.size > 5;
  
  const issueCards = ruleIds.map(ruleId => 
    generateIssueCard(ruleId, grouped.get(ruleId)!, dashboardUrl)
  ).join('\n');
  
  const moreMessage = hasMore ? `
                    <div style="background-color: #E3F2FD; border: 1px solid #90CAF9; padding: 16px; border-radius: 6px; margin-top: 16px;">
                        <div style="color: #1565C0; font-weight: 600; font-size: 13px;">
                            + ${grouped.size - 5} more ${severity.toLowerCase()} issue type${grouped.size - 5 > 1 ? 's' : ''}. <a href="${dashboardUrl}" style="color: #1565C0; text-decoration: underline;">View all in dashboard</a>
                        </div>
                    </div>` : '';
  
  const severityIcons: Record<string, string> = {
    Critical: '🚨',
    Serious: '⚠️',
    Moderate: '⚡',
    Minor: 'ℹ️'
  };
  
  return `
    <div style="margin: 20pt 0;">
      <h3 style="display: flex; align-items: center; gap: 8pt; margin-bottom: 16pt;">
        <span style="font-size: 18pt;">${severityIcons[severity] || icon}</span>
        <span>${severity} Issues</span>
        <span style="font-size: 9pt; font-weight: 600; padding: 3pt 10pt; background: #f1f5f9; color: #64748b; border-radius: 12pt;">${count} total</span>
      </h3>
      ${issueCards}
      ${hasMore ? `
        <div class="alert alert-info" style="margin-top: 16pt;">
          <div class="alert-icon">📊</div>
          <div class="alert-content">
            <p style="margin: 0; font-size: 9pt;">
              <strong>+${grouped.size - 5} more ${severity.toLowerCase()} issue types</strong> — <a href="${dashboardUrl}" style="color: #3b82f6;">View all in dashboard</a>
            </p>
          </div>
        </div>` : ''}
    </div>`;
}

/**
 * Calculate business risk level based on issue counts
 */
function calculateBusinessRisk(criticalCount: number, seriousCount: number): { level: string; description: string } {
  // High Risk: Only when critical issues exist
  if (criticalCount > 0) {
    return {
      level: 'High Risk',
      description: 'Critical accessibility barriers detected that may block users with disabilities and expose your organization to compliance risks under the RPWD Act 2016.'
    };
  } 
  // Medium/High Risk: Many serious issues but no critical
  else if (seriousCount > 15) {
    return {
      level: 'Medium/High Risk',
      description: 'Significant serious accessibility issues detected that severely impact user experience and require immediate attention for RPWD Act 2016 compliance.'
    };
  }
  // Medium Risk: Some serious issues
  else if (seriousCount > 5) {
    return {
      level: 'Medium Risk',
      description: 'Notable accessibility issues detected that may impact users with disabilities and require prompt attention for RPWD Act 2016 compliance.'
    };
  } 
  // Low Risk: Few or no serious issues
  else {
    return {
      level: 'Low Risk',
      description: 'Minor accessibility issues detected. Continue improving accessibility to provide the best experience for all users.'
    };
  }
}

/**
 * Calculate score arc values for SVG circle
 */
function calculateScoreArc(score: number): { dasharray: string; dashoffset: string } {
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // 439.8
  const percentage = score / 100;
  const dasharray = `${circumference} ${circumference}`;
  const dashoffset = `${circumference * (1 - percentage)}`;
  return { dasharray, dashoffset };
}

/**
 * Render HTML template with colors, icons, and dynamic data
 */
export function renderTemplate(data: TemplateData): string {
  const templatePath = join(__dirname, '../../templates/report.html');
  let html = readFileSync(templatePath, 'utf8');
  
  // Calculate business risk
  const businessRisk = calculateBusinessRisk(data.criticalCount, data.seriousCount);
  
  // Calculate score arc for SVG
  const scoreArc = calculateScoreArc(data.score);
  
  // Truncate GIGW violations to first 5
  const gigwViolationsDisplay = data.gigwViolations.slice(0, 5);
  const hasMoreGigwViolations = data.gigwViolations.length > 5;
  
  // Generate GIGW violations HTML (modern SaaS style)
  let gigwViolationsHtml = '';
  if (gigwViolationsDisplay.length > 0) {
    gigwViolationsHtml = gigwViolationsDisplay.map((v, idx) => `
      <div style="margin: 10pt 0; padding: 12pt 14pt; background: #ffffff; border: 1pt solid #fee2e2; border-radius: 6pt; border-left: 3pt solid #dc2626;">
        <p style="margin: 0 0 6pt 0; font-weight: 600; color: #991b1b; font-size: 9pt;">${escapeHtml(v.rule)}</p>
        <p style="margin: 0; font-size: 9pt; color: #64748b; line-height: 1.6;">${escapeHtml(v.description)}</p>
      </div>`).join('\n');
    
    if (hasMoreGigwViolations) {
      gigwViolationsHtml += `
      <div class="alert alert-info" style="margin: 12pt 0;">
        <div class="alert-icon" style="font-size: 14pt;">📊</div>
        <div class="alert-content">
          <p style="margin: 0; font-size: 9pt;">
            <strong>+${data.gigwViolations.length - 5} more violations</strong> — <a href="${data.dashboardUrl}" style="color: #3b82f6;">View complete list in dashboard</a>
          </p>
        </div>
      </div>`;
    }
  } else {
    gigwViolationsHtml = '<div class="alert alert-success"><div class="alert-icon">✅</div><div class="alert-content"><p style="margin: 0; font-weight: 600;">All GIGW 3.0 checks passed!</p></div></div>';
  }
  
  // Group issues by severity
  const criticalIssues = data.issues.filter(i => i.severity === 'critical');
  const seriousIssues = data.issues.filter(i => i.severity === 'serious');
  const moderateIssues = data.issues.filter(i => i.severity === 'moderate');
  const minorIssues = data.issues.filter(i => i.severity === 'minor');
  
  // Generate dynamic issues HTML for each severity
  const criticalIssuesHtml = generateSeveritySection('Critical', '🚨', data.criticalCount, criticalIssues, data.dashboardUrl);
  const seriousIssuesHtml = generateSeveritySection('Serious', '⚠️', data.seriousCount, seriousIssues, data.dashboardUrl);
  const moderateIssuesHtml = generateSeveritySection('Moderate', '⚡', data.moderateCount, moderateIssues, data.dashboardUrl);
  const minorIssuesHtml = generateSeveritySection('Minor', 'ℹ️', data.minorCount, minorIssues, data.dashboardUrl);
  
  // Combine all issues HTML
  const allIssuesHtml = criticalIssuesHtml + seriousIssuesHtml + moderateIssuesHtml + minorIssuesHtml;
  
  // Replace color placeholders
  html = html.replace(/\{\{HEADER_BACKGROUND\}\}/g, colors.headerBackground);
  html = html.replace(/\{\{HEADER_TEXT\}\}/g, colors.headerText);
  html = html.replace(/\{\{SECTION_TITLE_COLOR\}\}/g, colors.sectionTitle);
  html = html.replace(/\{\{CARD_BORDER\}\}/g, colors.cardBorder);
  html = html.replace(/\{\{HIGH_RISK_BACKGROUND\}\}/g, colors.highRiskBackground);
  html = html.replace(/\{\{HIGH_RISK_TEXT\}\}/g, colors.highRiskText);
  html = html.replace(/\{\{INFO_BOX_BLUE\}\}/g, colors.infoBoxBlue);
  html = html.replace(/\{\{INFO_BOX_BLUE_BORDER\}\}/g, colors.infoBoxBlueBorder);
  html = html.replace(/\{\{INFO_BOX_BLUE_TEXT\}\}/g, colors.infoBoxBlueText);
  html = html.replace(/\{\{INFO_BOX_GREEN\}\}/g, colors.infoBoxGreen);
  html = html.replace(/\{\{INFO_BOX_GREEN_BORDER\}\}/g, colors.infoBoxGreenBorder);
  html = html.replace(/\{\{INFO_BOX_GREEN_TEXT\}\}/g, colors.infoBoxGreenText);
  html = html.replace(/\{\{INFO_BOX_GREEN_CONTENT_TEXT\}\}/g, colors.infoBoxGreenContentText);
  html = html.replace(/\{\{STATUS_BUTTON\}\}/g, colors.statusButton);
  html = html.replace(/\{\{DISCLAIMER_BACKGROUND\}\}/g, colors.disclaimerBackground);
  html = html.replace(/\{\{DISCLAIMER_BORDER\}\}/g, colors.disclaimerBorder);
  html = html.replace(/\{\{EXECUTIVE_SUMMARY_BACKGROUND\}\}/g, colors.executiveSummaryBackground);
  html = html.replace(/\{\{EXECUTIVE_SUMMARY_BORDER\}\}/g, colors.executiveSummaryBorder);
  html = html.replace(/\{\{QUESTION_COLOR\}\}/g, colors.questionColor);
  html = html.replace(/\{\{BOLD_TEXT_COLOR\}\}/g, colors.boldTextColor);
  html = html.replace(/\{\{NORMAL_TEXT_COLOR\}\}/g, colors.normalTextColor);
  html = html.replace(/\{\{CARD_LEFT_BORDER\}\}/g, colors.cardLeftBorder);
  html = html.replace(/\{\{INFO_BOX_GREEN_CONTENT_BACKGROUND\}\}/g, colors.infoBoxGreenContentBackground);
  html = html.replace(/\{\{DISCLAIMER_TEXT_COLOR\}\}/g, colors.disclaimerTextColor);
  html = html.replace(/\{\{DIVIDER_GRAY\}\}/g, colors.dividerGray);
  html = html.replace(/\{\{DIVIDER_BLUE\}\}/g, colors.dividerBlue);
  html = html.replace(/\{\{ISSUE_CARD_BORDER\}\}/g, colors.issueCardBorder);
  html = html.replace(/\{\{ACCESSIBILITY_SCORE_CONTAINER_BORDER\}\}/g, colors.accessibilityScoreContainerBorder);
  html = html.replace(/\{\{CRITICAL_ISSUE_COLOR\}\}/g, colors.criticalIssueColor);
  html = html.replace(/\{\{SERIOUS_ISSUE_COLOR\}\}/g, colors.seriousIssueColor);
  html = html.replace(/\{\{MODERATE_ISSUE_COLOR\}\}/g, colors.moderateIssueColor);
  html = html.replace(/\{\{MINOR_ISSUE_COLOR\}\}/g, colors.minorIssueColor);
  html = html.replace(/\{\{PAGE_BORDER_COLOR\}\}/g, colors.pageBorderColor);
  
  // Replace icon placeholders
  html = html.replace(/\{\{SEARCH_ICON\}\}/g, icons.search);
  html = html.replace(/\{\{CHART_ICON\}\}/g, icons.chart);
  html = html.replace(/\{\{REFRESH_ICON\}\}/g, icons.refresh);
  html = html.replace(/\{\{WARNING_ICON\}\}/g, icons.warning);
  html = html.replace(/\{\{CHECKMARK_ICON\}\}/g, icons.checkmark);
  html = html.replace(/\{\{INDIA_ICON\}\}/g, icons.india);
  html = html.replace(/\{\{DOCUMENT_ICON\}\}/g, icons.document);
  
  // Replace dynamic data placeholders
  html = html.replace(/\{\{WEBSITE_URL\}\}/g, data.websiteUrl);
  html = html.replace(/\{\{WEBSITE_NAME\}\}/g, data.websiteName);
  html = html.replace(/\{\{SCAN_DATE\}\}/g, data.scanDate);
  html = html.replace(/\{\{SCORE\}\}/g, data.score.toString());
  html = html.replace(/\{\{TOTAL_ISSUES\}\}/g, data.totalIssues.toString());
  html = html.replace(/\{\{CRITICAL_COUNT\}\}/g, data.criticalCount.toString());
  html = html.replace(/\{\{SERIOUS_COUNT\}\}/g, data.seriousCount.toString());
  html = html.replace(/\{\{MODERATE_COUNT\}\}/g, data.moderateCount.toString());
  html = html.replace(/\{\{MINOR_COUNT\}\}/g, data.minorCount.toString());
  html = html.replace(/\{\{BUSINESS_RISK\}\}/g, businessRisk.level);
  html = html.replace(/\{\{BUSINESS_RISK_DESCRIPTION\}\}/g, businessRisk.description);
  html = html.replace(/\{\{GIGW_STATUS\}\}/g, data.gigwStatus);
  html = html.replace(/\{\{GIGW_PASSED\}\}/g, data.gigwPassed.toString());
  html = html.replace(/\{\{GIGW_TOTAL\}\}/g, data.gigwTotal.toString());
  html = html.replace(/\{\{GIGW_VIOLATIONS_COUNT\}\}/g, (data.gigwTotal - data.gigwPassed).toString());
  html = html.replace(/\{\{SCORE_DASHARRAY\}\}/g, scoreArc.dasharray);
  html = html.replace(/\{\{SCORE_DASHOFFSET\}\}/g, scoreArc.dashoffset);
  html = html.replace(/\{\{DASHBOARD_URL\}\}/g, data.dashboardUrl);
  html = html.replace(/\{\{SCAN_ID\}\}/g, data.scanId);
  html = html.replace(/\{\{GIGW_VIOLATIONS_HTML\}\}/g, gigwViolationsHtml);
  html = html.replace(/\{\{DYNAMIC_ISSUES_HTML\}\}/g, allIssuesHtml);
  
  return html;
}
