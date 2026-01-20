const SPREADSHEET_ID = '1miTkudbK9Gko3JssajCsc06XeM2jQkl_8pa9Qiufto8';

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getStats') return jsonResponse(getUserStats(e.parameter.lineId, e.parameter.name, e.parameter.pictureUrl));
    if (action === 'getConfig') return jsonResponse(getTableData('Config'));
    if (action === 'getDashboard') return jsonResponse(getDashboardData());
    
    const data = getTableData('Orders');
    return jsonResponse(data);
  } catch (err) {
    return jsonResponse({status: "error", message: err.toString()});
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  if (action === 'submitOrder') return jsonResponse(submitOrder(data));
  if (action === 'finishOrder') return jsonResponse(finishOrder(data));
  if (action === 'updateOrder') return jsonResponse(updateOrder(data));
  if (action === 'deleteOrder') return jsonResponse(deleteRowItem(data.tab, data.id));
  if (action === 'saveConfig') return jsonResponse(saveConfig(data));
  return jsonResponse({status: "error", message: "No action found"});
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getTableData(tabName) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(tabName);
  return sheet.getDataRange().getValues();
}

function getUserStats(lineId, name, pic) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Members');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == lineId) {
      return { name: data[i][1], accCb: data[i][2], currentBp: data[i][3], totalEarnedBp: data[i][4], role: data[i][5] };
    }
  }
  sheet.appendRow([lineId, name, 0, 0, 0, 'User', pic]);
  return { name: name, accCb: 0, currentBp: 0, totalEarnedBp: 0, role: 'User' };
}

function submitOrder(d) {
  try {
    if (!d.title || !d.type || d.baseCb <= 0) {
      return {status: "error", message: "Invalid input data"};
    }
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Orders');
    sheet.appendRow(["ORD-"+new Date().getTime(), new Date(), d.lineId, d.name, d.title, d.detail, d.type, d.baseCb, "Pending", "B", 0]);
    Logger.log('Order submitted: ' + d.title);
    return {status: "success", message: "สั่งเมนูงานเรียบร้อย!"};
  } catch (e) {
    Logger.log('Error in submitOrder: ' + e.message);
    return {status: "error", message: e.message};
  }
}

function updateOrder(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == d.id) {
      sheet.getRange(i+1, 6).setValue(d.detail);
      sheet.getRange(i+1, 8).setValue(d.cb);
      sheet.getRange(i+1, 9).setValue(d.status);
      sheet.getRange(i+1, 10).setValue(d.priority);
      break;
    }
  }
  return {status: "success"};
}

function finishOrder(d) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const orderSheet = ss.getSheetByName('Orders');
  const memberSheet = ss.getSheetByName('Members');
  const orders = orderSheet.getDataRange().getValues();
  for (let i = 1; i < orders.length; i++) {
    if (orders[i][0] == d.id) {
      const customerId = orders[i][2];
      const finalCb = Number(d.cb);
      orderSheet.getRange(i+1, 8).setValue(finalCb);
      orderSheet.getRange(i+1, 9).setValue("Done");
      orderSheet.getRange(i+1, 11).setValue(d.bp);
      const members = memberSheet.getDataRange().getValues();
      for (let j = 1; j < members.length; j++) {
        if (members[j][0] == customerId) {
          memberSheet.getRange(j+1, 3).setValue(Number(members[j][2]) + finalCb);
          memberSheet.getRange(j+1, 4).setValue(Number(members[j][3]) + Number(d.bp));
          memberSheet.getRange(j+1, 5).setValue(Number(members[j][4]) + Number(d.bp));
          break;
        }
      }
      break;
    }
  }
  return {status: "success"};
}

function getDashboardData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const orderData = ss.getSheetByName('Orders').getDataRange().getValues();
  const memberData = ss.getSheetByName('Members').getDataRange().getValues();
  let stats = { doneJobs: 0, totalCb: 0, userExp: [] };
  for (let i = 1; i < orderData.length; i++) {
    if (orderData[i][8] === 'Done') {
      stats.doneJobs++;
      stats.totalCb += Number(orderData[i][7]);
    }
  }
  for (let j = 1; j < memberData.length; j++) {
    stats.userExp.push({ name: memberData[j][1], cb: memberData[j][2], bp: memberData[j][4], role: memberData[j][5] });
  }
  return stats;
}

function deleteRowItem(tab, id) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(tab);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) { sheet.deleteRow(i + 1); break; }
  }
  return {status: "success"};
}

function saveConfig(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Config');
  sheet.appendRow(["CFG-"+new Date().getTime(), d.category, d.cb, ""]);
  return {status: "success"};
}