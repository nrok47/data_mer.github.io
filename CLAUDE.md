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
- **Orders** — รายการออเดอร์
- **Members** — ข้อมูลผู้ใช้ (lineId, role)
- **Config** — ตั้งค่าระบบ
- SPREADSHEET_ID: `1miTkudbK9Gko3JssajCsc06XeM2jQkl_8pa9Qiufto8`

## Roles
- **Customer** — สั่งอาหาร, เห็นแค่ออเดอร์ตัวเอง
- **Chef** — เห็นทุกออเดอร์, finish/delete order ได้
- **Head Chef** — รวมสิทธิ์ Chef + แก้ไข Config ได้

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Frontend ทั้งหมด — tabs: ลูกค้า / งานเชฟ / จัดการ |
| `Code.gs` | GAS backend — doGet (read), doPost (write) |

## Development Notes

### Frontend (index.html)
- ใช้ Tailwind CSS จาก CDN (ไม่ต้อง build)
- Font: Kanit (Google Fonts)
- LINE LIFF SDK: `https://static.line-scdn.net/liff/edge/2/sdk.js`
- ทดสอบ UI ได้โดยเปิด index.html ตรงใน browser (LINE auth จะ fail แต่ UI ทำงานได้)
- กรอง Tailwind CDN warning ไว้แล้วใน console filter ช่วงต้นไฟล์

### Backend (Code.gs)
- Deploy เป็น Google Apps Script Web App
- แก้ไขผ่าน Google Apps Script editor แล้ว re-deploy (version ใหม่)
- **อย่า** commit credentials หรือ LIFF_ID จริงลง repo
- Security: ตรวจ role ทุก write operation ใน doPost

### ไม่มี
- Build pipeline
- Package manager (ไม่มี package.json)
- Test suite
- Environment variables (hardcoded ใน Code.gs)

## Coding Conventions
- ภาษาไทยใน UI text, comments ในโค้ดใช้ได้ทั้งไทยและอังกฤษ
- vanilla JS ไม่ใช้ framework
- GAS functions ใช้ camelCase
- แสดง error ต่อ user ด้วย SweetAlert2 (Swal.fire)

## Common Tasks

### เพิ่ม field ใน Order
1. แก้ `Code.gs` — updateOrder / getTableData ให้รองรับ column ใหม่
2. แก้ `index.html` — UI form และ display logic
3. Re-deploy GAS Web App

### เพิ่ม role permission
- แก้ `getUserRole()` และเพิ่ม check ใน `doPost()` ใน `Code.gs`

### Debug backend
- ดู log ใน Google Apps Script editor → Executions
- doGet/doPost return JSON เสมอ, error จะมี `{status: "error", message: "..."}`
