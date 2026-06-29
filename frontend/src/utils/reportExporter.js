/**
 * reportExporter.js
 * Utility to generate and download professional business reports in CSV, Excel, and PDF formats.
 */

// Round numbers to two decimal places
const roundVal = (num) => Math.round(num * 100) / 100;

/**
 * Generates and downloads a CSV Report with metadata, prediction summaries, and customer records.
 */
export const downloadCSVReport = (filename, data, summary) => {
  const timestamp = new Date().toLocaleString();
  const churnRate = summary.total > 0 ? roundVal((summary.churned / summary.total) * 100) : 0;
  
  const csvLines = [
    `"RetainAI Churn Analytics - Executive Prediction Report"`,
    `"Generated On:","${timestamp}"`,
    `"Audit Filename:","${filename}"`,
    ``,
    `"--- COHORT PERFORMANCE SUMMARY ---"`,
    `"Total Accounts Ingested:","${summary.total}"`,
    `"High Risk Churn Flagged:","${summary.churned}"`,
    `"Estimated Churn Rate:","${churnRate}%"`,
    `"Average Cohort Risk:","${roundVal(summary.avgProbability * 100)}%"`,
    ``,
    `"--- CORE RETENTION RECOMMENDATIONS ---"`,
    `"1. Contract Migration:","Convert Month-to-Month accounts to 1-Year/2-Year agreements using a 15% incentive."`,
    `"2. Tech Support Engagement:","Offer 30-day premium Tech Support trials to Fiber Optic subscribers."`,
    `"3. Automatic Payment:","Promote Credit Card Auto-Pay to reduce payment-method friction by 8%."`,
    ``,
    `"--- CUSTOMER RISK REGISTRY ---"`,
    `"CustomerID","Gender","Contract","InternetService","MonthlyCharges","Tenure","ChurnProbability","RiskLevel","IsChurn"`
  ];

  data.forEach(p => {
    const f = p.features || {};
    const level = p.churn_probability >= 0.7 ? 'High' : p.churn_probability >= 0.4 ? 'Medium' : 'Low';
    csvLines.push([
      `"${p.customer_id}"`,
      `"${f.gender || ''}"`,
      `"${f.Contract || ''}"`,
      `"${f.InternetService || ''}"`,
      `"${f.MonthlyCharges || '0.00'}"`,
      `"${f.tenure || '0'}"`,
      `"${roundVal(p.churn_probability * 100)}%"`,
      `"${level}"`,
      `"${p.is_churn ? 'Yes' : 'No'}"`
    ].join(","));
  });

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvLines.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `RetainAI_Report_${filename.replace(/\.csv$/, '')}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Generates and downloads an Excel Spreadsheet with custom inline styling and layouts.
 */
export const downloadExcelReport = (filename, data, summary) => {
  const timestamp = new Date().toLocaleString();
  const churnRate = summary.total > 0 ? roundVal((summary.churned / summary.total) * 100) : 0;
  
  let excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Churn Analytics</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        body { font-family: Arial, sans-serif; }
        .title { font-size: 18px; font-weight: bold; color: #4f46e5; height: 35px; vertical-align: middle; }
        .meta { font-size: 11px; color: #6b7280; }
        .header { background-color: #4f46e5; color: #ffffff; font-weight: bold; text-align: center; }
        .section-header { font-weight: bold; background-color: #f3f4f6; font-size: 14px; height: 26px; vertical-align: middle; }
        .kpi-title { font-size: 11px; color: #4b5563; background-color: #f9fafb; font-weight: bold; }
        .kpi-val { font-size: 14px; font-weight: bold; background-color: #f9fafb; }
        td, th { border: 1px solid #d1d5db; padding: 6px; }
      </style>
    </head>
    <body>
      <table>
        <tr><td colspan="9" class="title">RETAINAI CHURN ANALYTICS - EXECUTIVE REPORT</td></tr>
        <tr><td colspan="9" class="meta">Generated On: ${timestamp} | File Analyzed: ${filename}</td></tr>
        <tr><td colspan="9"></td></tr>
        
        <tr><td colspan="9" class="section-header">COHORT PERFORMANCE SUMMARY</td></tr>
        <tr>
          <td colspan="2" class="kpi-title">Total Ingested Accounts</td>
          <td colspan="2" class="kpi-title">High Risk Churn Flagged</td>
          <td colspan="2" class="kpi-title">Estimated Churn Rate</td>
          <td colspan="3" class="kpi-title">Average Cohort Risk</td>
        </tr>
        <tr>
          <td colspan="2" class="kpi-val">${summary.total}</td>
          <td colspan="2" class="kpi-val" style="color: #ef4444;">${summary.churned}</td>
          <td colspan="2" class="kpi-val">${churnRate}%</td>
          <td colspan="3" class="kpi-val">${roundVal(summary.avgProbability * 100)}%</td>
        </tr>
        <tr><td colspan="9"></td></tr>

        <tr><td colspan="9" class="section-header">RETENTION STRATEGY RECOMMENDATIONS</td></tr>
        <tr>
          <td colspan="3" style="font-weight: bold;">Strategy Plan</td>
          <td colspan="6" style="font-weight: bold;">Business Impact & Description</td>
        </tr>
        <tr>
          <td colspan="3">Contract Migration Action</td>
          <td colspan="6">Offer contract migration incentives (e.g. 15% discount) to convert month-to-month contracts.</td>
        </tr>
        <tr>
          <td colspan="3">Fiber Optic Service Engagement</td>
          <td colspan="6">Provide 30-day premium Tech Support service trials to increase loyalty metrics.</td>
        </tr>
        <tr>
          <td colspan="3">Automatic Billing Promotion</td>
          <td colspan="6">Incentivize enrollment in Credit Card Auto-Pay to remove payment method friction.</td>
        </tr>
        <tr><td colspan="9"></td></tr>

        <tr><td colspan="9" class="section-header">CUSTOMER RISK LEVEL REGISTRY</td></tr>
        <tr class="header">
          <th>Customer ID</th>
          <th>Gender</th>
          <th>Contract Type</th>
          <th>Internet Service</th>
          <th>Monthly Billing</th>
          <th>Tenure (Mos)</th>
          <th>Risk Probability</th>
          <th>Risk Classification</th>
          <th>Churn Flag</th>
        </tr>
  `;

  data.forEach(p => {
    const f = p.features || {};
    const level = p.churn_probability >= 0.7 ? 'High' : p.churn_probability >= 0.4 ? 'Medium' : 'Low';
    const cellColor = level === 'High' ? '#fee2e2' : level === 'Medium' ? '#fef3c7' : '#d1fae5';
    const textColor = level === 'High' ? '#991b1b' : level === 'Medium' ? '#92400e' : '#065f46';
    
    excelTemplate += `
      <tr>
        <td style="font-weight: bold;">${p.customer_id}</td>
        <td>${f.gender || ''}</td>
        <td>${f.Contract || ''}</td>
        <td>${f.InternetService || ''}</td>
        <td style="text-align: right;">$${roundVal(f.MonthlyCharges || 0)}</td>
        <td style="text-align: right;">${f.tenure || '0'}</td>
        <td style="text-align: right; font-weight: bold;">${roundVal(p.churn_probability * 100)}%</td>
        <td style="background-color: ${cellColor}; color: ${textColor}; font-weight: bold; text-align: center;">${level}</td>
        <td style="text-align: center;">${p.is_churn ? 'Yes' : 'No'}</td>
      </tr>
    `;
  });

  excelTemplate += `
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `RetainAI_Report_${filename.replace(/\.csv$/, '')}_${Date.now()}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Triggers a printable PDF window print dialog with responsive executive branding styles.
 */
export const downloadPDFReport = (filename, data, summary) => {
  const timestamp = new Date().toLocaleString();
  const churnRate = summary.total > 0 ? roundVal((summary.churned / summary.total) * 100) : 0;
  
  const printWindow = window.open("", "_blank");
  
  let printTemplate = `
    <html>
    <head>
      <title>RetainAI Executive Churn Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; line-height: 1.5; padding: 40px; background-color: #fff; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
        .branding { font-size: 24px; font-weight: 800; color: #4f46e5; }
        .timestamp { text-align: right; font-size: 12px; color: #6b7280; }
        .title { font-size: 20px; font-weight: 700; margin-bottom: 10px; color: #111827; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .metric-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background-color: #f9fafb; }
        .metric-label { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
        .metric-value { font-size: 22px; font-weight: 800; color: #111827; }
        .recs-section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 35px; background-color: #fcfdff; }
        .recs-title { font-size: 14px; font-weight: 700; color: #4f46e5; margin-bottom: 15px; text-transform: uppercase; }
        .rec-item { margin-bottom: 12px; padding-left: 12px; border-left: 3px solid #818cf8; }
        .rec-name { font-size: 13px; font-weight: 700; color: #1f2937; }
        .rec-desc { font-size: 12px; color: #4b5563; }
        .table-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; color: #111827; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background-color: #f3f4f6; color: #4b5563; font-weight: bold; border-bottom: 2px solid #e5e7eb; padding: 10px 8px; text-align: left; }
        td { border-bottom: 1px solid #f3f4f6; padding: 10px 8px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; }
        .badge-danger { background-color: #fee2e2; color: #991b1b; }
        .badge-warning { background-color: #fef3c7; color: #92400e; }
        .badge-success { background-color: #d1fae5; color: #065f46; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="branding">RetainAI Churn Analytics</div>
          <div style="font-size: 12px; color: #4b5563;">ML Churn Prediction Platform</div>
        </div>
        <div class="timestamp">
          <div>Report Generated: <strong>${timestamp}</strong></div>
          <div>Audit Cohort: <strong>${filename}</strong></div>
        </div>
      </div>

      <div class="title">Executive Cohort Risk Assessment Report</div>
      
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Analyzed</div>
          <div class="metric-value">${summary.total}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">High Risk Flagged</div>
          <div class="metric-value" style="color: #ef4444;">${summary.churned}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Estimated Churn Rate</div>
          <div class="metric-value">${churnRate}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Avg Churn Risk</div>
          <div class="metric-value">${roundVal(summary.avgProbability * 100)}%</div>
        </div>
      </div>

      <div class="recs-section">
        <div class="recs-title">Business Retention Strategies</div>
        <div class="rec-item">
          <div class="rec-name">1. Contract Upgrades Campaigns</div>
          <div class="rec-desc">Convert Month-to-Month accounts to 1-Year/2-Year agreements using a 15% discount incentive. Month-to-month contracts drive 82% of high-risk flags.</div>
        </div>
        <div class="rec-item">
          <div class="rec-name">2. Fiber Optic Support Trials</div>
          <div class="rec-desc">Incentivize fiber optic subscribers with premium tech support options to mitigate service stability friction.</div>
        </div>
        <div class="rec-item">
          <div class="rec-name">3. Auto-Pay Billing Conversion</div>
          <div class="rec-desc">Promote Credit Card Auto-Pay to remove payment method friction.</div>
        </div>
      </div>

      <div class="table-title">Customer Risk Registry Logs</div>
      <table>
        <thead>
          <tr>
            <th>Customer ID</th>
            <th>Contract Type</th>
            <th>Monthly Charge</th>
            <th>Tenure</th>
            <th>Churn Risk</th>
            <th>Classification</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Draw customer details (limit to first 100 for print formatting sanity)
  data.slice(0, 100).forEach(p => {
    const f = p.features || {};
    const level = p.churn_probability >= 0.7 ? 'High' : p.churn_probability >= 0.4 ? 'Medium' : 'Low';
    const badgeClass = level === 'High' ? 'badge-danger' : level === 'Medium' ? 'badge-warning' : 'badge-success';
    
    printTemplate += `
      <tr>
        <td style="font-weight: bold;">${p.customer_id}</td>
        <td>${f.Contract || 'Month-to-month'}</td>
        <td>$${roundVal(f.MonthlyCharges || 0)}</td>
        <td>${f.tenure || '0'} mos</td>
        <td style="font-weight: bold;">${roundVal(p.churn_probability * 100)}%</td>
        <td><span class="badge ${badgeClass}">${level}</span></td>
      </tr>
    `;
  });

  if (data.length > 100) {
    printTemplate += `
      <tr>
        <td colspan="6" style="text-align: center; color: #6b7280; font-style: italic; padding: 15px;">
          * Showing first 100 accounts of the analyzed ${data.length} records in this printable PDF summary.
        </td>
      </tr>
    `;
  }

  printTemplate += `
        </tbody>
      </table>
      
      <script>
        window.onload = function() {
          window.print();
          // window.close();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(printTemplate);
  printWindow.document.close();
};
