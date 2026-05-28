const SPREADSHEET_ID = '1miTkudbK9Gko3JssajCsc06XeM2jQkl_8pa9Qiufto8';

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'getStats')      return jsonResponse(getUserStats(e.parameter.lineId, e.parameter.name, e.parameter.pictureUrl));
    if (action === 'getConfig')     return jsonResponse(getTableData('Config'));
    if (action === 'getDashboard')  return jsonResponse(getDashboardData());
    if (action === 'getAllUsers')   return jsonResponse(getTableData('Members'));
    if (action === 'getSprintView') return jsonResponse(getSprintView(e.parameter.lineId));

    const lineId = e.parameter.lineId;
    const orders = getTableData('Orders');
    if (lineId) {
      const role = getUserRole(lineId);
      if (role === 'Chef' || role === 'Head Chef') return jsonResponse(orders);
      const filtered = orders.filter((row, i) => i === 0 || row[2] == lineId);
      return jsonResponse(filtered);
    }
    return jsonResponse(orders);
  } catch (err) {
    Logger.log('doGet error: ' + err.toString());
    return jsonResponse({ status: 'error', message: 'An error occurred.' });
  }
}

function doPost(e) {
  const data     = JSON.parse(e.postData.contents);
  const action   = data.action;
  const userRole = getUserRole(data.lineId);

  if ((action === 'finishOrder' || action === 'deleteOrder') && userRole !== 'Chef' && userRole !== 'Head Chef')
    return jsonResponse({ status: 'error', message: 'Unauthorized: Chef role required' });
  if ((action === 'saveConfig' || action === 'updateUserRole') && userRole !== 'Head Chef')
    return jsonResponse({ status: 'error', message: 'Unauthorized: Head Chef role required' });

  if (action === 'submitOrder')    return jsonResponse(submitOrder(data));
  if (action === 'finishOrder')    return jsonResponse(finishOrder(data));
  if (action === 'updateOrder')    return jsonResponse(updateOrder(data));
  if (action === 'assignSprint')   return jsonResponse(assignSprint(data));
  if (action === 'deleteOrder')    return jsonResponse(deleteRowItem(data.tab, data.id, data.lineId, userRole));
  if (action === 'saveConfig')     return jsonResponse(saveConfig(data));
  if (action === 'updateUserRole') return jsonResponse(updateUserRole(data));
  return jsonResponse({ status: 'error', message: 'No action found' });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getTableData(tabName) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(tabName).getDataRange().getValues();
}

function getUserRole(lineId) {
  const data = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Members').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == lineId) return data[i][5];
  }
  return 'User';
}

function getUserStats(lineId, name, pic) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Members');
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == lineId)
      return { name: data[i][1], accCb: data[i][2], currentBp: data[i][3], totalEarnedBp: data[i][4], role: data[i][5] };
  }
  sheet.appendRow([lineId, name, 0, 0, 0, 'User', pic]);
  return { name, accCb: 0, currentBp: 0, totalEarnedBp: 0, role: 'User' };
}

// Orders columns: A=id B=date C=lineId D=name E=title F=detail G=type H=cb I=status J=priority K=bp L=sprint M=dueDate
function submitOrder(d) {
  try {
    if (!d.lineId || typeof d.lineId !== 'string')                            return { status: 'error', message: 'Invalid lineId' };
    if (!d.title  || typeof d.title  !== 'string' || d.title.length  > 200)  return { status: 'error', message: 'Title must be 1-200 characters' };
    if (!d.type   || typeof d.type   !== 'string' || d.type.length   > 100)  return { status: 'error', message: 'Invalid type' };
    const baseCb = Number(d.baseCb);
    if (isNaN(baseCb) || baseCb <= 0 || baseCb > 10000) return { status: 'error', message: 'Base CB must be between 1-10000' };
    const detail  = String(d.detail  || '').substring(0, 1000);
    const sprint  = String(d.sprint  || '');
    const dueDate = d.dueDate ? new Date(d.dueDate) : '';
    SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Orders')
      .appendRow(['ORD-' + new Date().getTime(), new Date(), d.lineId, d.name, d.title, detail, d.type, baseCb, 'Pending', 'B', 0, sprint, dueDate]);
    return { status: 'success', message: 'สั่งเมนูงานเรียบร้อย!' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function updateOrder(d) {
  const role   = getUserRole(d.lineId);
  const sheet  = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Orders');
  const data   = sheet.getDataRange().getValues();
  const valid  = ['Pending', 'Doing', 'Done', 'Cancel'];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] != d.id) continue;
    if (role !== 'Chef' && role !== 'Head Chef' && data[i][2] !== d.lineId)
      return { status: 'error', message: 'Unauthorized' };
    const cb = Number(d.cb);
    if (isNaN(cb) || cb < 0 || cb > 10000) return { status: 'error', message: 'Invalid CB' };
    sheet.getRange(i+1, 6).setValue(String(d.detail  || '').substring(0, 1000));
    sheet.getRange(i+1, 8).setValue(cb);
    sheet.getRange(i+1, 9).setValue(valid.includes(d.status)                           ? d.status   : data[i][8]);
    sheet.getRange(i+1, 10).setValue(typeof d.priority === 'string' && d.priority.length <= 5 ? d.priority : data[i][9]);
    sheet.getRange(i+1, 12).setValue(d.sprint  !== undefined ? String(d.sprint)  : (data[i][11] || ''));
    sheet.getRange(i+1, 13).setValue(d.dueDate ? new Date(d.dueDate) : (data[i][12] || ''));
    break;
  }
  return { status: 'success' };
}

function assignSprint(d) {
  const role  = getUserRole(d.lineId);
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Orders');
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] != d.id) continue;
    if (role !== 'Chef' && role !== 'Head Chef' && data[i][2] !== d.lineId)
      return { status: 'error', message: 'Unauthorized' };
    sheet.getRange(i+1, 12).setValue(String(d.sprint || ''));
    break;
  }
  return { status: 'success' };
}

function finishOrder(d) {
  const role        = getUserRole(d.lineId);
  const ss          = SpreadsheetApp.openById(SPREADSHEET_ID);
  const orderSheet  = ss.getSheetByName('Orders');
  const memberSheet = ss.getSheetByName('Members');
  const orders      = orderSheet.getDataRange().getValues();
  for (let i = 1; i < orders.length; i++) {
    if (orders[i][0] != d.id) continue;
    if (role !== 'Chef' && role !== 'Head Chef' && orders[i][2] !== d.lineId)
      return { status: 'error', message: 'Unauthorized' };
    const finalCb = Number(d.cb);
    const bp      = Number(d.bp);
    if (isNaN(finalCb) || finalCb < 0 || finalCb > 10000) return { status: 'error', message: 'Invalid CB' };
    if (isNaN(bp)      || bp      < 0 || bp      > 20000) return { status: 'error', message: 'Invalid BP' };
    orderSheet.getRange(i+1, 8).setValue(finalCb);
    orderSheet.getRange(i+1, 9).setValue('Done');
    orderSheet.getRange(i+1, 11).setValue(bp);
    const members = memberSheet.getDataRange().getValues();
    for (let j = 1; j < members.length; j++) {
      if (members[j][0] == orders[i][2]) {
        memberSheet.getRange(j+1, 3).setValue(Number(members[j][2]) + finalCb);
        memberSheet.getRange(j+1, 4).setValue(Number(members[j][3]) + bp);
        memberSheet.getRange(j+1, 5).setValue(Number(members[j][4]) + bp);
        break;
      }
    }
    break;
  }
  return { status: 'success' };
}

function getDashboardData() {
  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const orderData  = ss.getSheetByName('Orders').getDataRange().getValues();
  const memberData = ss.getSheetByName('Members').getDataRange().getValues();
  const stats      = { doneJobs: 0, totalCb: 0, userExp: [] };
  for (let i = 1; i < orderData.length; i++) {
    if (orderData[i][8] === 'Done') { stats.doneJobs++; stats.totalCb += Number(orderData[i][7]); }
  }
  for (let j = 1; j < memberData.length; j++) {
    stats.userExp.push({ name: memberData[j][1], cb: memberData[j][2], bp: memberData[j][4], role: memberData[j][5] });
  }
  return stats;
}

function getSprintView(lineId) {
  const role     = getUserRole(lineId);
  const rows     = getTableData('Orders').slice(1);
  const active   = rows.filter(r => r[8] !== 'Done' && r[8] !== 'Cancel');
  const visible  = (role === 'Chef' || role === 'Head Chef') ? active : active.filter(r => r[2] == lineId);
  const thisWeek = getWeekLabel(new Date());
  const nd       = new Date(); nd.setDate(nd.getDate() + 7);
  const nextWeek = getWeekLabel(nd);
  const toItem   = r => ({
    id: r[0], date: r[1], lineId: r[2], name: r[3], title: r[4], detail: r[5],
    type: r[6], cb: r[7], status: r[8], priority: r[9], bp: r[10],
    sprint: String(r[11] || ''), dueDate: r[12] || ''
  });
  const result = { thisWeek, nextWeek, backlog: [], thisWeekItems: [], nextWeekItems: [], otherSprints: [] };
  visible.forEach(r => {
    const item = toItem(r);
    if      (!item.sprint || item.sprint === 'Backlog') result.backlog.push(item);
    else if (item.sprint === thisWeek)                  result.thisWeekItems.push(item);
    else if (item.sprint === nextWeek)                  result.nextWeekItems.push(item);
    else                                                result.otherSprints.push(item);
  });
  const doneThisWeek = rows.filter(r => r[8] === 'Done' && String(r[11] || '') === thisWeek);
  result.velocity = {
    doneCb:    doneThisWeek.reduce((s, r) => s + Number(r[7]), 0),
    doneCount: doneThisWeek.length,
    plannedCb: rows.filter(r => String(r[11] || '') === thisWeek).reduce((s, r) => s + Number(r[7]), 0)
  };
  return result;
}

function deleteRowItem(tab, id, requestorLineId, requestorRole) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(tab);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] != id) continue;
    if (requestorRole !== 'Chef' && requestorRole !== 'Head Chef' && data[i][2] !== requestorLineId)
      return { status: 'error', message: 'You can only delete your own orders' };
    sheet.deleteRow(i + 1);
    return { status: 'success' };
  }
  return { status: 'success' };
}

function saveConfig(d) {
  if (!d.category || typeof d.category !== 'string' || d.category.length > 100) return { status: 'error', message: 'Invalid category' };
  const cb = Number(d.cb);
  if (isNaN(cb) || cb <= 0 || cb > 10000) return { status: 'error', message: 'Invalid CB value' };
  SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Config')
    .appendRow(['CFG-' + new Date().getTime(), d.category, cb, '']);
  return { status: 'success' };
}

function updateUserRole(d) {
  if (!d.targetLineId) return { status: 'error', message: 'No targetLineId' };
  if (!['User', 'Chef', 'Head Chef'].includes(d.newRole)) return { status: 'error', message: 'Invalid role' };
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Members');
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == d.targetLineId) { sheet.getRange(i+1, 6).setValue(d.newRole); return { status: 'success' }; }
  }
  return { status: 'error', message: 'User not found' };
}

function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
}

function getWeekLabel(date) {
  return `${date.getFullYear()}-W${String(getISOWeek(date)).padStart(2, '0')}`;
}
