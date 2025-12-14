const fs = require('fs');
const path = require('path');
const colors = require('../config/colors');
const icons = require('./icons');

/**
 * Render HTML template with colors and icons
 */
function renderTemplate() {
  const templatePath = path.join(__dirname, '../templates/report.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  
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
  
  return html;
}

module.exports = {
  renderTemplate
};

