# data_mer.github.io

## LINE OA Order System with GAS and Gemini AI

This project implements a LINE OA-based order system using Google Apps Script (GAS), Google Sheets, and Google AI Studio (Gemini API).

### System Architecture

- **Frontend**: LINE OA with Rich Menu and LIFF for Order page and Chef Dashboard.
- **Backend**: GAS as Web App for API endpoints.
- **Database**: Google Sheets for storing users, menu, and orders.
- **AI Layer**: Gemini API for capacity assessment and recommendations.

### Google Sheets Structure

Create a Google Sheet with ID: `1W1-YHFHsc7tu3mwlsUNpKkp99JR5knYGh1pWej9rnB8`

Sheets:
- **Menu**: Item Name | Base CB | Category
- **Orders**: Order ID | Line ID | Items (JSON) | Total CB | Adjusted CB | Status | Priority
- **Users**: Line ID | Name | Role (Customer/Chef/Head Chef)

### Setup Instructions

1. **Google Apps Script**:
   - Create a new GAS project.
   - Copy the code from `code.gs` into the script editor.
   - Set the script properties: Add `GEMINI_API_KEY` with your Gemini API key from Google AI Studio.
   - Deploy as Web App: Publish > Deploy as web app, set to execute as 'Me', access 'Anyone, even anonymous' (สำคัญสำหรับ CORS จาก client).
   - คัดลอก Web App URL (เช่น https://script.google.com/macros/s/SCRIPT_ID/exec) และแทนที่ 'YOUR_GAS_WEB_APP_URL' ใน liff/index.html และ liff/chef.html

2. **Google API Key for Sheets**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create a new project or select existing.
   - Enable **Google Sheets API**.
   - Create an **API Key** in Credentials.
   - Share your Google Sheet with "Anyone with the link" as Viewer.
   - Replace `'YOUR_GOOGLE_API_KEY'` in `liff/index.html` with your API key.

3. **Gemini API Key**:
   - Go to Google AI Studio (aistudio.google.com).
   - Create a new project or use existing.
   - Generate an API key for Gemini.

3. **LINE OA Setup**:
   - Use your existing LINE OA and Developer Console.
   - Create LIFF apps for Customer Order page and Chef Dashboard.
   - Set up Rich Menu with links to LIFF URLs.

4. **Frontend (LIFF)**:
   - Implement HTML/JS pages for ordering and dashboard.
   - Use `liff.getProfile()` for authentication.

### API Endpoints

- `GET /?action=getMenu`: Get menu items from Sheet.
- `GET /?action=getOrders&lineId=<lineId>`: Get orders for Chef/Head Chef.
- `GET /?action=getDashboard&lineId=<lineId>`: Get dashboard for Head Chef.
- `GET /?action=placeOrder&lineId=<lineId>&items=<json>`: Place order from customer.
- `GET /?action=updateOrder&lineId=<lineId>&orderId=<id>&adjustedCB=<num>&priority=<str>`: Update order by Chef/Head Chef.
- `GET /?action=assessCapacity&currentCB=<num>&newCB=<num>`: Assess capacity using Gemini.

### Notes

- Ensure the GAS script has permission to access the Google Sheet.
- For production, secure the API keys and access controls.