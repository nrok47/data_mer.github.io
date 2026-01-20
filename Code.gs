const SPREADSHEET_ID = '1miTkudbK9Gko3JssajCsc06XeM2jQkl_8pa9Qiufto8';

// 1. ฟังก์ชันดึงข้อมูล (Read)
function doGet(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const action = e.parameter.action;

  if (action === 'getStats') {
    const lineId = e.parameter.lineId;
    return jsonResponse(getUserStats(lineId));
  }
  
  // Default: ดึงรายการ Orders ทั้งหมด
  const sheet = ss.getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();
  return jsonResponse(data);
}

// 2. ฟังก์ชันรับข้อมูลและอัปเดต (Write/Update)
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  if (action === 'submitOrder') return jsonResponse(submitOrder(data));
  if (action === 'finishOrder') return jsonResponse(finishOrder(data));
  if (action === 'deleteOrder') return jsonResponse(deleteOrder(data.id));
  
  return jsonResponse({status: "error", message: "No action found"});
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- LOGIC FUNCTIONS ---

function submitOrder(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Orders');
  sheet.appendRow([
    "ORD-" + new Date().getTime(),
    new Date(),
    data.lineId,
    data.name,
    data.title,
    data.detail,
    data.type,
    data.cb || 3, // Default CB
    "Pending",
    data.priority || "B",
    0 // BP_Earned
  ]);
  return {status: "success", message: "สั่งเมนูงานเรียบร้อย!"};
}

function finishOrder(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const orderSheet = ss.getSheetByName('Orders');
  const memberSheet = ss.getSheetByName('Members');
  
  let customerLineId = "";
  let orderCb = 0;
  
  // 1. อัปเดต Orders
  const orderVals = orderSheet.getDataRange().getValues();
  for (let i = 1; i < orderVals.length; i++) {
    if (orderVals[i][0] == data.id) {
      customerLineId = orderVals[i][2];
      orderCb = Number(orderVals[i][7]) || 0;
      orderSheet.getRange(i + 1, 9).setValue('Done');
      orderSheet.getRange(i + 1, 11).setValue(data.bp); // บันทึกแต้มที่ได้ในใบงาน
      break;
    }
  }
  
  // 2. สะสมคะแนนให้สมาชิก
  const memberVals = memberSheet.getDataRange().getValues();
  let found = false;
  for (let j = 1; j < memberVals.length; j++) {
    if (memberVals[j][0] == customerLineId) {
      let currentAccCb = Number(memberVals[j][2]) || 0;
      let currentBp = Number(memberVals[j][3]) || 0;
      memberSheet.getRange(j + 1, 3).setValue(currentAccCb + orderCb);
      memberSheet.getRange(j + 1, 4).setValue(currentBp + Number(data.bp));
      found = true; break;
    }
  }
  if (!found) memberSheet.appendRow([customerLineId, "New Member", orderCb, data.bp, data.bp, "Customer"]);
  
  return {status: "success"};
}

function getUserStats(lineId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Members');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == lineId) {
      return { accCb: data[i][2], currentBp: data[i][3], role: data[i][5] };
    }
  }
  return { accCb: 0, currentBp: 0, role: "User" };
}

function deleteOrder(id) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return {status: "success"};
    }
  }
}