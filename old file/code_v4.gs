/**
 * ระบบจัดการครัวของชยกร (Chef's Bandwidth & BP System)
*/
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('ครัวของชยกร (Chayagorn Kitchen)')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
 



// เชื่อมต่อ Sheet
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

// ดึงข้อมูลประเภทงาน (Config)
function getConfigData() {
  const data = getSheet('Config').getDataRange().getValues();
  return data.slice(1).map(r => ({id: r[0], category: r[1], cb: r[2], desc: r[3]}));
}

// บันทึกออเดอร์ใหม่ (Customer)
function submitOrder(formData) {
  const sheet = getSheet('Orders');
  sheet.appendRow([
    "ORD-" + new Date().getTime(),
    new Date(),
    formData.lineId,
    formData.name,
    formData.title,
    formData.detail,
    formData.type,
    formData.baseCb, // Chef_CB เบื้องต้น
    "Pending",      // Status
    "B",            // Default Priority (Tadpole)
    0               // BP_Earned
  ]);
  return "สั่งเมนูงานเรียบร้อยครับเชฟ!";
}

// ดึงงานทั้งหมด (Chef/Head Chef)
function getAllOrders() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    
    if (!sheet) {
      console.error("หา Sheet ชื่อ Orders ไม่เจอ");
      return [];
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return []; 

    // เปลี่ยนจากระบุ 11 คอลัมน์ เป็นดึงเท่าที่มีข้อมูล (getDataRange)
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1); // ตัดหัวตารางออก
    
// แก้ไขเฉพาะส่วน map ภายใน getAllOrders ใน code.gs
const orders = rows.map(r => ({
  id: String(r[0]),         // บังคับเป็น String
  date: r[1] instanceof Date ? r[1].toLocaleDateString('th-TH') : String(r[1]), // แปลงวันที่เป็นไทย
  lineId: String(r[2]),
  customer: String(r[3]),
  title: String(r[4]),
  type: String(r[6]),
  cb: Number(r[7]) || 0,    // บังคับเป็นตัวเลข
  status: String(r[8]),
  priority: String(r[9] || 'B')
}));

    // กรองเฉพาะงานที่ยังไม่เสร็จ (ถ้าอยากให้โชว์เฉพาะงานค้าง) 
    // หรือโชว์ทั้งหมดแล้วเรียง Priority
    return orders.sort((a, b) => {
      const pOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 };
      return (pOrder[a.priority] || 9) - (pOrder[b.priority] || 9);
    });
    
  } catch (e) {
    console.error("Error in getAllOrders: " + e.toString());
    return [];
  }
}

// อัปเดตงานและให้แต้มจิตพิสัย (Chef)
function finalizeOrder(orderId, finalCb, priority, bp, lineId) {
  const sheet = getSheet('Orders');
  const data = sheet.getDataRange().getValues();
  
  for(let i=1; i<data.length; i++) {
    if(data[i][0] == orderId) {
      sheet.getRange(i+1, 8, 1, 4).setValues([[finalCb, "Done", priority, bp]]);
      updateMemberBP(lineId, bp, finalCb);
      break;
    }
  }
}

// อัปเดตแต้มสมาชิก
function updateMemberBP(lineId, bp, cb) {
  const sheet = getSheet('Members');
  const data = sheet.getDataRange().getValues();
  let found = false;
  for(let i=1; i<data.length; i++) {
    if(data[i][0] == lineId) {
      let currentBP = data[i][3];
      let currentAccCB = data[i][2];
      sheet.getRange(i+1, 3).setValue(currentAccCB + cb);
      sheet.getRange(i+1, 4).setValue(currentBP + bp);
      found = true; break;
    }
  }
  if(!found) sheet.appendRow([lineId, "Unknown", cb, bp, bp, "Customer"]);
}

// CRUD สำหรับ Config & Rewards (ตัวอย่างการจัดการ)
function manageItem(action, tab, rowData) {
  const sheet = getSheet(tab);
  if(action === 'add') sheet.appendRow(rowData);
  // ... เพิ่มเติม logic แก้ไข/ลบ ตามต้องการ
}

// ดึงข้อมูลรางวัลทั้งหมด
function getRewardsData() {
  const data = getSheet('Rewards').getDataRange().getValues();
  return data.slice(1).map(r => ({id: r[0], name: r[1], points: r[2], stock: r[3], status: r[4]}));
}

// ลบรายการ (ใช้ได้ทั้ง Config และ Rewards)
function deleteRowItem(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return "ลบข้อมูลสำเร็จ";
    }
  }
}

// เพิ่มหรือแก้ไข Config
function saveConfig(data) {
  const sheet = getSheet('Config');
  const vals = sheet.getDataRange().getValues();
  let foundRow = -1;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0] == data.id) { foundRow = i + 1; break; }
  }
  
  const rowData = [data.id || "CFG-"+new Date().getTime(), data.category, data.cb, data.desc];
  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, 4).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return "บันทึก Config สำเร็จ";
}

// เพิ่มหรือแก้ไข Rewards
function saveReward(data) {
  const sheet = getSheet('Rewards');
  const vals = sheet.getDataRange().getValues();
  let foundRow = -1;
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0] == data.id) { foundRow = i + 1; break; }
  }
  
  const rowData = [data.id || "RW-"+new Date().getTime(), data.name, data.points, data.stock, "Active"];
  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, 5).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return "บันทึกของรางวัลสำเร็จ";
}

// ฟังก์ชันแก้ไขข้อมูลงาน (Update)
function updateOrder(data) {
  const sheet = getSheet('Orders');
  const vals = sheet.getDataRange().getValues();
  
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0] == data.id) {
      // อัปเดต Column G (index 6) = Type, H (7) = CB, I (8) = Status, J (9) = Priority
      sheet.getRange(i + 1, 5).setValue(data.title); // ชื่อโครงการ
      sheet.getRange(i + 1, 7).setValue(data.type);  // ประเภท
      sheet.getRange(i + 1, 8).setValue(data.cb);    // ค่า CB
      sheet.getRange(i + 1, 9).setValue(data.status); // สถานะ
      sheet.getRange(i + 1, 10).setValue(data.priority); // ลำดับกบ
      return "อัปเดตข้อมูลงานเรียบร้อย!";
    }
  }
  throw new Error("ไม่พบรหัสงานที่ต้องการแก้ไข");
}

// ฟังก์ชันลบงาน (Delete)
function deleteOrder(id) {
  const sheet = getSheet('Orders');
  const vals = sheet.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0] == id) {
      sheet.deleteRow(i + 1);
      return "ลบงานออกจากครัวแล้ว";
    }
  }
}

// ดึงข้อมูลคะแนนรวมของ User
function getUserStats(lineId) {
  const sheet = getSheet('Members');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == lineId) {
      return {
        name: data[i][1],          // Display_Name
        accCb: data[i][2] || 0,     // Total_CB_Accumulated
        currentBp: data[i][3] || 0, // Current_BP_Balance
        totalEarnedBp: data[i][4] || 0, // Total_BP_Earned
        role: data[i][5] || "Member"    // Role
      };
    }
  }
  return { name: "Guest", accCb: 0, currentBp: 0, totalEarnedBp: 0, role: "Unknown" };
}

function finishOrder(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const orderSheet = ss.getSheetByName('Orders');
  const memberSheet = ss.getSheetByName('Members');
  
  // 1. อัปเดตสถานะงานใน Orders เป็น 'Done'
  const orderVals = orderSheet.getDataRange().getValues();
  let customerLineId = "";
  let orderCb = 0;
  
  for (let i = 1; i < orderVals.length; i++) {
    if (orderVals[i][0] == data.id) {
      customerLineId = orderVals[i][1]; // เก็บ Line ID ลูกค้า
      orderCb = orderVals[i][7]; // เก็บค่า CB
      orderSheet.getRange(i + 1, 9).setValue('Done');
      break;
    }
  }
  
  // 2. สะสมคะแนน BP และ CB ให้ลูกค้าใน Members
  const memberVals = memberSheet.getDataRange().getValues();
  let memberFound = false;
  
  for (let j = 1; j < memberVals.length; j++) {
    if (memberVals[j][0] == customerLineId) {
      let currentCb = Number(memberVals[j][2]) || 0;
      let currentBp = Number(memberVals[j][3]) || 0;
      
      memberSheet.getRange(j + 1, 3).setValue(currentCb + orderCb); // บวก CB สะสม
      memberSheet.getRange(j + 1, 4).setValue(currentBp + Number(data.bp)); // บวก BP ที่เชฟให้
      memberFound = true;
      break;
    }
  }
  
  return "จบงานเรียบร้อย! มอบ " + data.bp + " BP ให้ลูกค้าแล้ว";
}
