/**
 * Chayagorn Kitchen - Backend API
 * รองรับหน้าเว็บ และการดึงข้อมูลแบบ JSON สำหรับ PC & Mobile


function doGet(e) {
  var action = e.parameter.action;
  
  // 1. ถ้าไม่มี Action ให้แสดงหน้าเว็บ (Index.html)
  if (!action) {
    return HtmlService.createTemplateFromFile('Index')
        .evaluate()
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setTitle('Chayagorn Kitchen')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // 2. ถ้ามี Action ให้ทำงานแบบ API (JSON)
  var result;
  try {
    switch (action) {
      case 'getUserStats':
        result = getUserStats(e.parameter.lineId);
        break;
      case 'getOrders':
        result = getAllOrders();
        break;
      case 'getConfig':
        result = getConfigData();
        break;
      case 'getRewards':
        result = getRewardsData();
        break;
      case 'submitOrder':
        result = { message: submitOrder(e.parameter) };
        break;
      case 'finishOrder':
        result = { message: finishOrder(e.parameter) };
        break;
      default:
        result = { error: 'Unknown Action' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
}

// --- ฟังก์ชันจัดการข้อมูล ---

function submitOrder(p) {
  // *** ใส่ ID ของสเปรดชีตคุณที่นี่ ***
  var ss = SpreadsheetApp.openById("1W1-YHFHsc7tu3mwlsUNpKkp99JR5knYGh1pWej9rnB8");
  var sheet = ss.getSheetByName("Orders");
  
  var id = "ORD-" + new Date().getTime();
  // บันทึก: [ID, LINE_ID, ชื่อ, ชื่อโครงการ, รายละเอียด, ประเภท, Priority, CB, Status, Timestamp]
  sheet.appendRow([
    id, 
    p.lineId, 
    p.name, 
    p.title, 
    p.detail || "", 
    p.type, 
    "C", 
    p.cb, 
    "Pending", 
    new Date()
  ]);
  return "เชฟรับออเดอร์เรียบร้อยแล้ว!";
}

function getUserStats(lineId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Members');
  var data = sheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == lineId) {
      return {
        name: data[i][1],
        accCb: data[i][2] || 0,
        currentBp: data[i][3] || 0,
        totalEarnedBp: data[i][4] || 0,
        role: data[i][5] || "Member"
      };
    }
  }
  // ถ้าไม่เจอข้อมูลสมาชิก ให้สร้างเป็น Guest
  return { name: "Guest User", accCb: 0, currentBp: 0, totalEarnedBp: 0, role: "Member" };
}

function getAllOrders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  var data = sheet.getDataRange().getValues();
  return data.slice(1).map(function(r) {
    return {
      id: r[0], customer: r[2], title: r[3], detail: r[4],
      type: r[5], priority: r[6] || 'C', cb: r[7] || 0, status: r[8]
    };
  });
}

function finishOrder(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orderSheet = ss.getSheetByName('Orders');
  var memberSheet = ss.getSheetByName('Members');
  
  var oData = orderSheet.getDataRange().getValues();
  var custLineId = "";
  var orderCb = 0;
  
  // 1. อัปเดตสถานะใน Orders
  for (var i = 1; i < oData.length; i++) {
    if (oData[i][0] == p.id) {
      custLineId = oData[i][1];
      orderCb = Number(oData[i][7]);
      orderSheet.getRange(i + 1, 9).setValue('Done');
      break;
    }
  }
  
  // 2. บวกแต้มใน Members
  var mData = memberSheet.getDataRange().getValues();
  for (var j = 1; j < mData.length; j++) {
    if (mData[j][0] == custLineId) {
      var currentAccCb = Number(mData[j][2]) || 0;
      var currentBp = Number(mData[j][3]) || 0;
      var totalBp = Number(mData[j][4]) || 0;
      
      memberSheet.getRange(j + 1, 3).setValue(currentAccCb + orderCb);
      memberSheet.getRange(j + 1, 4).setValue(currentBp + Number(p.bp));
      memberSheet.getRange(j + 1, 5).setValue(totalBp + Number(p.bp));
      break;
    }
  }
  return "จบงานสำเร็จ!";
}

function getConfigData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  return sheet.getDataRange().getValues().slice(1).map(function(r) { 
    return { id: r[0], category: r[1], cb: r[2] }; 
  });
}

function getRewardsData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Rewards');
  if(!sheet) return [];
  return sheet.getDataRange().getValues().slice(1).map(function(r) { 
    return { id: r[0], name: r[1], points: r[2] }; 
  });
}

 */