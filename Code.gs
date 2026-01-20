function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.openById("ใส่_ID_ของ_Google_Sheet_ตรงนี้");
  var sheet = ss.getSheetByName("Orders"); // เปลี่ยนชื่อชีตให้ตรง
  
  sheet.appendRow([
    new Date(), 
    data.lineId, 
    data.name, 
    data.title, 
    data.detail, 
    data.type,
    "Pending"
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}

// ต้องมี doGet ไว้สำหรับดึงข้อมูลด้วย (ถ้าต้องการ)
function doGet(e) {
  var ss = SpreadsheetApp.openById("ใส่_ID_ของ_Google_Sheet_ตรงนี้");
  var sheet = ss.getSheetByName("Orders");
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}