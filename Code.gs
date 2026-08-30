/**
 * RanchAssist™ Water Requirement Calculator
 * Google Apps Script backend
 * Tool ID: water-requirement-calculator
 * Version: 1.0.1
 */

const RA_TOOL = Object.freeze({
  id: 'water-requirement-calculator',
  name: 'Water Requirement Calculator',
  version: '1.0.1'
});

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Water Requirement Calculator | RanchAssist™')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Sends a user-requested calculation summary through Apps Script MailApp.
 * No credentials are sent to the browser and no project data is persisted.
 */
function sendWaterRequirementEmail(payload) {
  payload = payload || {};

  const recipient = sanitizeEmail_(payload.email);
  if (!recipient) {
    throw new Error('Enter a valid email address.');
  }

  const subject = String(payload.subject || 'RanchAssist Water Requirement Summary')
    .trim()
    .slice(0, 150);

  const summary = payload.summary || {};
  const projectName = cleanText_(summary.projectName || 'Water Requirement Project', 120);
  const timestamp = cleanText_(summary.timestamp || new Date().toISOString(), 80);

  const metrics = Array.isArray(summary.metrics) ? summary.metrics.slice(0, 20) : [];
  const warnings = Array.isArray(summary.warnings) ? summary.warnings.slice(0, 20) : [];
  const assumptions = Array.isArray(summary.assumptions) ? summary.assumptions.slice(0, 30) : [];
  const notes = cleanMultiline_(summary.notes || '', 3000);
  const groups = Array.isArray(summary.groups) ? summary.groups.slice(0, 50) : [];
  const waterPoints = Array.isArray(summary.waterPoints) ? summary.waterPoints.slice(0, 50) : [];

  const metricRows = metrics.map(function(item) {
    return '<tr>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #deded8;color:#666660">' + escapeHtml_(item.label) + '</td>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #deded8;text-align:right;font-weight:600">' + escapeHtml_(item.value) + '</td>' +
      '</tr>';
  }).join('');

  const groupRows = groups.map(function(item) {
    return '<tr>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea">' + escapeHtml_(item.name) + '</td>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea">' + escapeHtml_(item.livestockClass) + '</td>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea;text-align:right">' + escapeHtml_(item.head) + '</td>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea;text-align:right">' + escapeHtml_(item.gpdPerHead) + '</td>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea;text-align:right">' + escapeHtml_(item.normalDemand) + '</td>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea;text-align:right">' + escapeHtml_(item.peakDemand) + '</td>' +
      '</tr>';
  }).join('');

  const pointRows = waterPoints.map(function(item) {
    return '<tr>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea">' + escapeHtml_(item.name) + '</td>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea;text-align:right">' + escapeHtml_(item.allocation) + '</td>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea;text-align:right">' + escapeHtml_(item.peakDemand) + '</td>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea;text-align:right">' + escapeHtml_(item.troughCapacity) + '</td>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea;text-align:right">' + escapeHtml_(item.sourceGpm) + '</td>' +
      '<td style="padding:7px 8px;border-bottom:1px solid #eeeeea;text-align:right">' + escapeHtml_(item.requiredGpm) + '</td>' +
      '</tr>';
  }).join('');

  const warningHtml = warnings.length
    ? '<div style="margin:18px 0;padding:14px 16px;border:1px solid #d8c2a5;background:#f4ece1;border-radius:8px">' +
        '<strong>Planning notes</strong><ul style="margin:8px 0 0 18px;padding:0">' +
        warnings.map(function(x){ return '<li style="margin:5px 0">' + escapeHtml_(x) + '</li>'; }).join('') +
        '</ul></div>'
    : '';

  const assumptionsHtml = assumptions.length
    ? '<h3 style="font-size:16px;margin:24px 0 8px">Assumptions</h3><ul style="padding-left:20px;color:#4d4d48">' +
        assumptions.map(function(x){ return '<li style="margin:5px 0">' + escapeHtml_(x) + '</li>'; }).join('') +
        '</ul>'
    : '';

  const htmlBody = '<!doctype html><html><body style="margin:0;background:#f7f7f4;font-family:Arial,Helvetica,sans-serif;color:#171715">' +
    '<div style="max-width:760px;margin:0 auto;padding:28px 18px">' +
      '<div style="background:#ffffff;border:1px solid #deded8;border-radius:12px;overflow:hidden">' +
        '<div style="padding:22px 24px;border-bottom:1px solid #deded8">' +
          '<div style="font-size:12px;letter-spacing:.08em;font-weight:700;color:#666660">RANCHASSIST™ · WATER</div>' +
          '<h1 style="font-size:26px;line-height:1.15;margin:7px 0 5px">Water Requirement Calculator</h1>' +
          '<div style="color:#666660">' + escapeHtml_(projectName) + '</div>' +
        '</div>' +
        '<div style="padding:20px 24px">' +
          '<table style="width:100%;border-collapse:collapse;font-size:14px">' + metricRows + '</table>' +
          warningHtml +
          '<h3 style="font-size:16px;margin:24px 0 8px">Livestock groups</h3>' +
          '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">' +
            '<thead><tr style="background:#f1f1ed">' +
              '<th style="padding:7px 8px;text-align:left">Group</th><th style="padding:7px 8px;text-align:left">Class</th>' +
              '<th style="padding:7px 8px;text-align:right">Head</th><th style="padding:7px 8px;text-align:right">Gal/head/day</th>' +
              '<th style="padding:7px 8px;text-align:right">Normal</th><th style="padding:7px 8px;text-align:right">Peak</th>' +
            '</tr></thead><tbody>' + groupRows + '</tbody></table></div>' +
          (pointRows ? '<h3 style="font-size:16px;margin:24px 0 8px">Water points</h3><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f1f1ed"><th style="padding:7px 8px;text-align:left">Water point</th><th style="padding:7px 8px;text-align:right">Allocation</th><th style="padding:7px 8px;text-align:right">Peak gal/day</th><th style="padding:7px 8px;text-align:right">Trough gal</th><th style="padding:7px 8px;text-align:right">Source GPM</th><th style="padding:7px 8px;text-align:right">Required GPM</th></tr></thead><tbody>' + pointRows + '</tbody></table></div>' : '') +
          assumptionsHtml +
          (notes ? '<h3 style="font-size:16px;margin:24px 0 8px">Project notes</h3><p style="white-space:pre-wrap;color:#4d4d48;font-size:13px;line-height:1.5">' + escapeHtml_(notes) + '</p>' : '') +
          '<p style="margin:24px 0 0;color:#666660;font-size:12px;line-height:1.5">Planning aid only. This calculator does not certify animal-welfare, plumbing, pump, well, storage, or engineering compliance. Verify assumptions against actual livestock, weather, water quality, source reliability, equipment, and local professional guidance.</p>' +
          '<p style="margin:10px 0 0;color:#81817a;font-size:11px">Generated ' + escapeHtml_(timestamp) + '</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</body></html>';

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    htmlBody: htmlBody,
    body: buildPlainTextSummary_(summary)
  });

  return { ok: true, message: 'Email sent.' };
}

function buildPlainTextSummary_(summary) {
  const lines = [
    'RanchAssist™ Water Requirement Calculator',
    cleanText_(summary.projectName || 'Water Requirement Project', 120),
    ''
  ];
  (summary.metrics || []).forEach(function(item) {
    lines.push(cleanText_(item.label, 80) + ': ' + cleanText_(item.value, 80));
  });
  if (summary.notes) { lines.push('', 'Project notes:', cleanMultiline_(summary.notes, 3000)); }
  if ((summary.warnings || []).length) {
    lines.push('', 'Planning notes:');
    summary.warnings.forEach(function(item) { lines.push('- ' + cleanText_(item, 250)); });
  }
  lines.push('', 'Planning aid only; not a certification of animal-welfare or engineering compliance.');
  return lines.join('\n');
}

function sanitizeEmail_(value) {
  const email = String(value || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email.slice(0, 254);
}

function cleanText_(value, maxLen) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLen || 500);
}

function cleanMultiline_(value, maxLen) {
  return String(value == null ? '' : value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLen || 3000);
}

function escapeHtml_(value) {
  return cleanMultiline_(value, 3000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
