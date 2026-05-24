export function printReceipt(r) {
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(buildReceiptHTML(r));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }
  
  export function downloadReceiptPDF(r) {
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(buildReceiptHTML(r, true));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }
  
  function buildReceiptHTML(r, forDownload = false) {
    const items = (r.items || []).map(item => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px dashed #e5e7eb;font-size:13px;">${item.product_name}</td>
        <td style="padding:6px 0;border-bottom:1px dashed #e5e7eb;font-size:13px;text-align:center;">${item.quantity_sold}</td>
        <td style="padding:6px 0;border-bottom:1px dashed #e5e7eb;font-size:13px;text-align:right;">₦${fmt(item.unit_price)}</td>
        <td style="padding:6px 0;border-bottom:1px dashed #e5e7eb;font-size:13px;text-align:right;">₦${fmt(item.total_amount)}</td>
      </tr>`).join('');
  
    return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8"/>
    <title>Receipt #${r.receipt_id}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Courier New', monospace;
        background: #fff;
        color: #111;
        padding: 24px;
        max-width: 380px;
        margin: 0 auto;
      }
      .pharmacy-name {
        font-size: 20px;
        font-weight: 700;
        text-align: center;
        letter-spacing: 1px;
        margin-bottom: 2px;
      }
      .pharmacy-sub {
        font-size: 11px;
        text-align: center;
        color: #555;
        margin-bottom: 16px;
      }
      .divider {
        border: none;
        border-top: 2px dashed #111;
        margin: 12px 0;
      }
      .receipt-meta {
        font-size: 12px;
        margin-bottom: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
      }
      thead th {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-bottom: 6px;
        border-bottom: 1px dashed #111;
        color: #555;
      }
      thead th:last-child,
      thead th:nth-child(3),
      thead th:nth-child(2) { text-align: right; }
      thead th:nth-child(2) { text-align: center; }
      .total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-top: 2px dashed #111;
        margin-top: 4px;
      }
      .total-label { font-size: 14px; font-weight: 700; }
      .total-amount { font-size: 18px; font-weight: 700; }
      .footer {
        text-align: center;
        font-size: 11px;
        color: #555;
        margin-top: 20px;
        line-height: 1.6;
      }
      @media print {
        body { padding: 0; }
        @page { margin: 12mm; size: 80mm auto; }
      }
    </style>
  </head>
  <body>
    <div class="pharmacy-name">WELLSPRING</div>
    <div class="pharmacy-sub">Pharmacy & Medical Store</div>
    <hr class="divider"/>
    <div class="receipt-meta">Receipt No: <strong>#${r.receipt_id}</strong></div>
    <div class="receipt-meta">Date: <strong>${fmtReceiptDate(r.created_at)}</strong></div>
    <div class="receipt-meta">Sold By: <strong>${r.sold_by || '—'}</strong></div>
    <hr class="divider"/>
    <table>
      <thead>
        <tr>
          <th style="text-align:left;">Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${items}</tbody>
    </table>
    <div class="total-row">
      <span class="total-label">TOTAL</span>
      <span class="total-amount">₦${fmt(r.grand_total)}</span>
    </div>
    <hr class="divider"/>
    <div class="footer">
      Thank you for your purchase!<br/>
      Please keep this receipt for your records.
    </div>
  </body>
  </html>`;
  }
  
  function fmt(n) {
    return Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  function fmtReceiptDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }