// ============================================================
// Hinilas Pro — GCash Auto-Approve Script
// Paste this into Google Apps Script (script.google.com)
// Set a time-driven trigger to run every 5 minutes
// ============================================================

var WEBHOOK_URL = "https://hinilas.pro/api/topup/approve";
var WEBHOOK_SECRET = "REPLACE_WITH_YOUR_TOPUP_WEBHOOK_SECRET";

function checkGCashEmails() {
  // Search for unread GCash received-money emails
  var threads = GmailApp.search('from:gcash is:unread subject:"You\'ve received" OR subject:"received money" OR subject:"GCash" newer_than:1d');

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();

    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      if (!msg.isUnread()) continue;

      var subject = msg.getSubject();
      var body = msg.getPlainBody();
      var fullText = subject + " " + body;

      Logger.log("Processing email: " + subject);

      // Parse amount — looks for patterns like "₱499.00" or "PHP 499" or "499.00"
      var amount = parseAmount(fullText);
      if (!amount) {
        Logger.log("Could not parse amount — skipping");
        msg.markRead();
        continue;
      }

      // Parse sender name — "from [Name]" or "received from [Name]"
      var senderName = parseSender(fullText);

      Logger.log("Amount: " + amount + " | Sender: " + senderName);

      // Call the approve endpoint
      var result = callApproveEndpoint(amount, senderName);
      Logger.log("Approve result: " + JSON.stringify(result));

      // Mark email as read so we don't process it again
      msg.markRead();
    }
  }
}

function parseAmount(text) {
  var m;
  m = text.match(/PHP\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (m) return Math.round(parseFloat(m[1].replace(/,/g, "")));

  m = text.match(/amount[:\s]+([\d,]+(?:\.\d{1,2})?)/i);
  if (m) return Math.round(parseFloat(m[1].replace(/,/g, "")));

  m = text.match(/received\s+([\d,]+(?:\.\d{1,2})?)/i);
  if (m) return Math.round(parseFloat(m[1].replace(/,/g, "")));

  return null;
}

function parseSender(text) {
  var m = text.match(/from\s+([A-Z][a-zA-Z\s]+?)(?:\s+via|\s+has|\s+sent|\.|,)/);
  if (m) return m[1].trim();
  return null;
}

function callApproveEndpoint(amount, senderName) {
  var payload = JSON.stringify({ amount: amount, senderName: senderName || "" });
  var options = {
    method: "post",
    contentType: "application/json",
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    payload: payload,
    muteHttpExceptions: true
  };
  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    return JSON.parse(response.getContentText());
  } catch (e) {
    Logger.log("Error: " + e.toString());
    return { error: e.toString() };
  }
}
