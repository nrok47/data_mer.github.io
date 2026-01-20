const SPREADSHEET_ID = '1miTkudbK9Gko3JssajCsc06XeM2jQkl_8pa9Qiufto8';


function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getStats') return jsonResponse(getUserStats(e.parameter.lineId, e.parameter.name, e.parameter.pictureUrl));
  if (action === 'getConfig') return jsonResponse(getTableData('Config'));
  if (action === 'getRewards') return jsonResponse(getTableData('Rewards'));
  if (action === 'getDashboard') {
    const stats = getUserStats(e.parameter.lineId);
    if (stats.role === 'Head Chef') return jsonResponse(getDashboard());
  }
  
  // Default: ดึงรายการ Orders ทั้งหมด
  const data = getTableData('Orders');
  return jsonResponse(data);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === 'submitOrder') return jsonResponse(submitOrder(data));
  if (action === 'finishOrder') return jsonResponse(finishOrder(data));
  if (action === 'updateOrder') return jsonResponse(updateOrder(data));
  if (action === 'deleteOrder') return jsonResponse(deleteRowItem(data.tab, data.id));
  if (action === 'saveConfig') return jsonResponse(saveConfig(data));
  if (action === 'saveReward') return jsonResponse(saveReward(data));
  
  return jsonResponse({status: "error", message: "No action found"});
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// --- Logic Functions ---

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
  // ถ้าไม่เจอ ให้ลงทะเบียนใหม่
  sheet.appendRow([lineId, name, 0, 0, 0, 'User', pic]);
  return { name: name, accCb: 0, currentBp: 0, totalEarnedBp: 0, role: 'User' };
}

function submitOrder(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Orders');
  sheet.appendRow(["ORD-"+new Date().getTime(), new Date(), d.lineId, d.name, d.title, d.detail, d.type, d.baseCb, "Pending", "B", 0]);
  return {status: "success", message: "สั่งเมนูงานเรียบร้อย!"};
}

function finishOrder(d) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const orderSheet = ss.getSheetByName('Orders');
  const memberSheet = ss.getSheetByName('Members');
  const orders = orderSheet.getDataRange().getValues();
  
  for (let i = 1; i < orders.length; i++) {
    if (orders[i][0] == d.id) {
      const customerId = orders[i][2];
      const cbValue = Number(orders[i][7]);
      orderSheet.getRange(i+1, 9).setValue("Done");
      orderSheet.getRange(i+1, 11).setValue(d.bp);
      
      // อัปเดต Member
      const members = memberSheet.getDataRange().getValues();
      for (let j = 1; j < members.length; j++) {
        if (members[j][0] == customerId) {
          memberSheet.getRange(j+1, 3).setValue(Number(members[j][2]) + cbValue);
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

function saveReward(d) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Rewards');
  sheet.appendRow(["RW-"+new Date().getTime(), d.name, d.points, 99, "Active"]);
  return {status: "success"};
}