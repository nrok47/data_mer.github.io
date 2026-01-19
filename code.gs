// Google Apps Script for LINE OA Order System
// Sheet ID: 1W1-YHFHsc7tu3mwlsUNpKkp99JR5knYGh1pWej9rnB8

function doGet(e) {
  // Handle GET requests, e.g., for dashboard or fetching data
  var action = e.parameter.action;
  var lineId = e.parameter.lineId;
  var role = getUserRole(lineId);

  if (action === 'getOrders') {
    if (role === 'Chef' || role === 'Head Chef') {
      return ContentService
        .createTextOutput(JSON.stringify(getOrders()))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } else if (action === 'getMenu') {
    return ContentService
      .createTextOutput(JSON.stringify(getMenu()))
      .setMimeType(ContentService.MimeType.JSON);
  } else if (action === 'getDashboard') {
    if (role === 'Head Chef') {
      return ContentService
        .createTextOutput(JSON.stringify(getDashboard()))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } else if (action === 'placeOrder') {
    // Place order from customer
    var items = JSON.parse(e.parameter.items);
    var data = { lineId: e.parameter.lineId, items: items };
    placeOrder(data);
    return ContentService
      .createTextOutput('Order placed')
      .setMimeType(ContentService.MimeType.TEXT);
  } else if (action === 'updateOrder') {
    // Update order by Chef
    if (role === 'Chef' || role === 'Head Chef') {
      var data = {
        orderId: e.parameter.orderId,
        adjustedCB: parseInt(e.parameter.adjustedCB),
        priority: e.parameter.priority
      };
      updateOrder(data);
      return ContentService
        .createTextOutput('Order updated')
        .setMimeType(ContentService.MimeType.TEXT);
    }
  } else if (action === 'assessCapacity') {
    // Assess capacity using Gemini
    var assessment = assessCapacityWithGemini(parseInt(e.parameter.currentCB), parseInt(e.parameter.newCB));
    return ContentService
      .createTextOutput(JSON.stringify(assessment))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService
    .createTextOutput('Unauthorized')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  // Not used, moved to doGet to avoid CORS
  return ContentService
    .createTextOutput('Use GET requests')
    .setMimeType(ContentService.MimeType.TEXT);
}

function getUserRole(lineId) {
  var sheet = SpreadsheetApp.openById('1W1-YHFHsc7tu3mwlsUNpKkp99JR5knYGh1pWej9rnB8').getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == lineId) {
      return data[i][2]; // Role
    }
  }
  return null;
}

function placeOrder(data) {
  var sheet = SpreadsheetApp.openById('1W1-YHFHsc7tu3mwlsUNpKkp99JR5knYGh1pWej9rnB8').getSheetByName('Orders');
  var orderId = generateOrderId();
  var totalCB = calculateTotalCB(data.items);
  sheet.appendRow([orderId, data.lineId, JSON.stringify(data.items), totalCB, totalCB, 'Pending', 'Normal']);
}

function updateOrder(data) {
  var sheet = SpreadsheetApp.openById('1W1-YHFHsc7tu3mwlsUNpKkp99JR5knYGh1pWej9rnB8').getSheetByName('Orders');
  var dataRange = sheet.getDataRange().getValues();
  for (var i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] == data.orderId) {
      sheet.getRange(i+1, 5).setValue(data.adjustedCB); // Adjusted CB
      sheet.getRange(i+1, 7).setValue(data.priority); // Priority
      break;
    }
  }
}

function getOrders() {
  var sheet = SpreadsheetApp.openById('1W1-YHFHsc7tu3mwlsUNpKkp99JR5knYGh1pWej9rnB8').getSheetByName('Orders');
  return sheet.getDataRange().getValues();
}

function getDashboard() {
  var sheet = SpreadsheetApp.openById('1W1-YHFHsc7tu3mwlsUNpKkp99JR5knYGh1pWej9rnB8').getSheetByName('Orders');
  var data = sheet.getDataRange().getValues();
  var totalCB = 0;
  for (var i = 1; i < data.length; i++) {
    totalCB += data[i][4]; // Adjusted CB
  }
  return { totalYield: totalCB };
}

function calculateTotalCB(items) {
  var menuSheet = SpreadsheetApp.openById('1W1-YHFHsc7tu3mwlsUNpKkp99JR5knYGh1pWej9rnB8').getSheetByName('Menu');
  var menuData = menuSheet.getDataRange().getValues();
  var total = 0;
  for (var item of items) {
    for (var menu of menuData) {
      if (menu[0] == item.name) {
        total += menu[1] * item.quantity; // Base CB * quantity
        break;
      }
    }
  }
  return total;
}

function getMenu() {
  var sheet = SpreadsheetApp.openById('1W1-YHFHsc7tu3mwlsUNpKkp99JR5knYGh1pWej9rnB8').getSheetByName('Menu');
  var data = sheet.getDataRange().getValues();
  var menu = [];
  for (var i = 1; i < data.length; i++) {
    menu.push({ name: data[i][0], cb: data[i][1], category: data[i][2] });
  }
  return menu;
}

function assessCapacityWithGemini(currentCB, newCB) {
  // Gemini API integration
  // Note: You need to set up API key in script properties
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    return { error: 'API key not set' };
  }
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;
  var prompt = `หากวันนี้มี ${currentCB} CB และมี Order เข้ามาเพิ่ม ${newCB} CB เชฟจะไหวไหม โดยดูจากประวัติที่ผ่านมา`;
  var payload = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());
    return { assessment: json.candidates[0].content.parts[0].text };
  } catch (e) {
    return { error: e.message };
  }
}