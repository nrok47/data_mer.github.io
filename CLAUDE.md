# Chayagorn Kitchen — Claude Code Guide

## Project Overview
Kitchen order management web app สำหรับ "Chayagorn Kitchen" ใช้ LINE LIFF เป็น auth layer และ Google Apps Script (GAS) เป็น backend เชื่อมกับ Google Sheets เป็นฐานข้อมูล

UI ภาษาไทย, mobile-first, ไม่มี build step

## Architecture

```
index.html     ← Single-page app (vanilla JS + Tailwind CDN + SweetAlert2)
Code.gs        ← Google Apps Script backend (doGet / doPost)
                 deployed as Web App URL
```

### Data Flow
```
LINE LIFF (auth) → index.html (frontend) → GAS Web App URL → Google Sheets
```

### Google Sheets Structure
- **Orders** sheet — columns: `[id, date, lineId, name, title, detail, type, cb, status, priority, bp]`
- **Members** sheet — columns: `[lineId, name, accCb, currentBp, totalEarnedBp, role, pictureUrl]`
- **Config** sheet — columns: `[id, category, cb, note]`
- SPREADSHEET_ID: `1miTkudbK9Gko3JssajCsc06XeM2jQkl_8pa9Qiufto8`

## Roles
| Role | สิทธิ์ |
|------|--------|
| **User** | สั่งออเดอร์, แก้ไข/ลบ order ตัวเอง |
| **Chef** | เห็นทุกออเดอร์, finish/edit/delete ได้ |
| **Head Chef** | รวมสิทธิ์ Chef + แก้ Config + จัดการ User |

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Frontend ทั้งหมด — tabs: ลูกค้า / งานเชฟ / จัดการ |
| `Code.gs` | GAS backend — doGet (read), doPost (write) |

---

## Development Notes

### Frontend (index.html)
- Tailwind CSS CDN — ไม่ต้อง build, กรอง CDN warning ไว้แล้วช่วงต้นไฟล์
- Font: Kanit (Google Fonts)
- LINE LIFF SDK: `https://static.line-scdn.net/liff/edge/2/sdk.js`
- SweetAlert2 v11 สำหรับ modal และ loading indicator
- ทดสอบ UI ได้โดยเปิด `index.html` ใน browser ตรงๆ (LINE auth จะ fail แต่ UI ทำงานได้)

### Backend (Code.gs)
- Deploy เป็น Google Apps Script Web App → ต้อง re-deploy ทุกครั้งที่แก้
- แก้ไขผ่าน Google Apps Script editor → Deploy → Manage deployments → New version
- **อย่า** commit credentials หรือ LIFF_ID จริงลง repo
- Security: ตรวจ role ทุก write operation ใน `doPost()` และใน function ย่อย
- `doGet` / `doPost` return JSON เสมอ, error จะมี `{status: "error", message: "..."}`

### ไม่มี
- Build pipeline / package manager / test suite
- Environment variables (ค่าต่างๆ hardcode ใน Code.gs และ index.html)

---

## Coding Conventions

### JavaScript (index.html)
- Vanilla JS ไม่ใช้ framework
- ใช้ `escHtml(str)` ทุกครั้งที่ render user content ลง innerHTML — ป้องกัน XSS
- `Swal.showLoading()` ต้องเรียกใน `didOpen` callback เสมอ:
  ```js
  Swal.fire({ title: 'กำลังโหลด...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  ```
- fetch ไปยัง GAS ต้องส่ง `lineId` ทุกครั้ง เพื่อให้ backend กรองข้อมูลตาม role
- แสดง error ต่อ user ด้วย `Swal.fire(...)` เสมอ

### GAS (Code.gs)
- GAS functions ใช้ camelCase
- ทุก action ใน `doPost` ต้องผ่าน authorization check ก่อน
- `tab` parameter ใน `deleteRowItem` whitelist เฉพาะ `'Orders'` และ `'Config'`

### UI Patterns
- สีหลัก: เหลือง-ส้ม (`yellow-400` → `orange-500`)
- Card แบ่งตาม status ด้วย color bar ด้านบน (CSS class: `top-pending`, `top-doing`, `top-done`, `top-cancel`)
- Priority badge ใช้ CSS class: `rank-a` (แดง) → `rank-b` (ส้ม) → `rank-c` (เหลือง) → `rank-d` (เขียว) → `rank-e` (เทา)
- ปุ่มใช้ `btn-action` class เพื่อให้มี hover transition
- Section header ใช้ gradient พร้อม text ขาว ตามตัวอย่างในแต่ละหน้า

---

## Common Tasks

### เพิ่ม field ใน Order
1. แก้ `Code.gs`:
   - `submitOrder()` — เพิ่มใน `sheet.appendRow([...])`
   - `updateOrder()` — เพิ่ม `sheet.getRange(...).setValue(...)`
   - `getTableData('Orders')` ไม่ต้องแก้ (คืน array ตาม column อัตโนมัติ)
2. แก้ `index.html`:
   - form UI + display ใน `renderOrders()`
   - index ของ column ใน array เริ่มจาก 0 (เช่น `o[7]` = CB, `o[8]` = status)
3. Re-deploy GAS Web App

### เพิ่ม action ใน doPost
1. เพิ่ม authorization check บน `doPost()` ถ้าจำเป็น
2. เพิ่ม `if (action === 'myAction') return jsonResponse(myFunction(data));`
3. สร้าง function ใหม่ที่ return object (ไม่ใช่ jsonResponse)

### เพิ่ม role permission
- แก้ `getUserRole()` และ `doPost()` ใน `Code.gs`
- แก้ `ROLE_PERMISSIONS` object ใน `hasPermission()` ใน `index.html`

### Debug backend
- ดู log ใน Google Apps Script editor → Executions
- ทดสอบ doGet ได้ผ่าน browser: `GAS_URL?action=getConfig`

---

## Security Rules (ห้ามทำ)
- ห้าม render user content ลง innerHTML โดยไม่ผ่าน `escHtml()`
- ห้าม trust `lineId` จาก request body เพื่อยกระดับสิทธิ์ — ต้องเช็ค role จาก Sheets เสมอ
- ห้าม `deleteRowItem` ลบจาก sheet อื่นนอกจาก `Orders` / `Config`
- ห้าม commit LIFF_ID หรือ GAS_URL ที่เป็น production ลง repo สาธารณะ
