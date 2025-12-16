# PDF Generation Flow

## 🎯 Overview

PDFs are generated **on-demand** (lazy loading) when a user requests them, not during the scan process. This saves resources and ensures PDFs are always fresh.

## 📊 Complete Flow Diagram

```
1. User creates scan
   POST /api/v1/scan/create
   ↓
2. Scan processed in background
   - Runs accessibility tests (Axe, Lighthouse)
   - Saves issues to database
   - Updates scan status to "completed"
   ↓
3. Scan is completed ✅
   - Status: "completed"
   - Issues saved in database
   - PDF NOT generated yet
   ↓
4. User requests PDF
   GET /api/v1/scan/:id/pdf
   ↓
5. PDF Generation Triggered
   ├─ Check if PDF exists in S3/local storage
   ├─ If exists: Retrieve from storage
   └─ If not: Generate new PDF
   ↓
6. PDF Generated
   ├─ Render HTML template with scan data
   ├─ Convert HTML to PDF using Puppeteer
   └─ Save PDF to S3 (or local storage)
   ↓
7. PDF Returned to User
   - Download starts
   - PDF saved in S3 for future requests
```

## 🔄 Step-by-Step Process

### Step 1: Scan Creation
```bash
POST /api/v1/scan/create
{
  "websiteId": "cmj84ak9i00019tcuop5avmqy"
}
```

**What happens:**
- Scan created with status `"queued"`
- Background job starts processing
- **PDF is NOT generated at this stage**

### Step 2: Scan Processing (Background)
**File:** `src/queues/backgroundProcessor.ts`

**Process:**
1. Opens browser with Puppeteer
2. Runs Axe accessibility tests
3. Runs Lighthouse audit
4. Runs GIGW compliance checks
5. Saves issues to database
6. Updates scan status to `"completed"`

**Important:** PDF is **NOT** generated here. See comment:
```typescript
// PDF generation is done on-demand when user requests GET /scan/{id}/pdf
// This saves resources and ensures PDF is always fresh with latest data
```

### Step 3: PDF Request (Trigger)
```bash
GET /api/v1/scan/:id/pdf
```

**Endpoint:** `src/routes/scan.routes.ts`
```typescript
router.get('/:id/pdf', downloadPDF);
```

**Controller:** `src/controllers/scan.controller.ts`
```typescript
export const downloadPDF = async (req: Request, res: Response) => {
  // 1. Get scan data from database
  // 2. Check if PDF exists in storage
  // 3. Generate PDF if needed
  // 4. Save to S3
  // 5. Return PDF to user
}
```

### Step 4: PDF Generation Logic

**File:** `src/controllers/scan.controller.ts` (lines 120-158)

```typescript
// Check if PDF already exists in storage
const pdfExists = await storageService.exists(id);

if (pdfExists) {
  // ✅ PDF exists - retrieve from S3/local
  pdfBuffer = await storageService.get(id);
} else {
  // ❌ PDF doesn't exist - generate new one
  pdfBuffer = await generatePDFForScan(scan);
  
  // Save to S3/local storage
  await storageService.save(id, pdfBuffer);
  
  // Update scan with report URL
  const reportUrl = await storageService.getUrl(id);
  await prisma.scan.update({
    where: { id },
    data: { reportUrl },
  });
}
```

### Step 5: PDF Generation Process

**File:** `src/services/pdfGenerator.ts`

**Steps:**
1. **Prepare Data:**
   - Extract scan data (website, issues, score, GIGW results)
   - Calculate severity breakdown
   - Process WCAG categories

2. **Render HTML:**
   - Load template: `templates/report.ejs`
   - Render with scan data
   - Sanitize HTML for PDF

3. **Generate PDF:**
   - Launch Puppeteer/Chrome
   - Load HTML into page
   - Convert to PDF using `page.pdf()`
   - Return PDF buffer

4. **Save to Storage:**
   - Upload to S3 (if `STORAGE_TYPE=s3`)
   - Or save locally (if `STORAGE_TYPE=local`)

## 🎯 Key Points

### ✅ On-Demand Generation
- PDFs are **NOT** generated during scan
- PDFs are generated **only when requested**
- This saves server resources

### ✅ Caching
- First request: Generate PDF → Save to S3 → Return PDF
- Subsequent requests: Retrieve from S3 → Return PDF (faster)

### ✅ Storage Location
- **S3:** `s3://accesss-web-checker-s3-bucket/scans/scan-{ID}.pdf`
- **Local:** `/tmp/scan-{ID}.pdf`

## 📝 Code Flow

### 1. Route Definition
```typescript
// src/routes/scan.routes.ts
router.get('/:id/pdf', downloadPDF);
```

### 2. Controller Handler
```typescript
// src/controllers/scan.controller.ts
export const downloadPDF = async (req: Request, res: Response) => {
  // Validates scan exists and is completed
  // Checks if PDF exists in storage
  // Generates PDF if needed
  // Saves to storage
  // Returns PDF
}
```

### 3. PDF Generation
```typescript
// src/controllers/scan.controller.ts
async function generatePDFForScan(scan: any): Promise<Buffer> {
  // Calls pdfGenerator service
  // Passes scan data
  // Returns PDF buffer
}
```

### 4. PDF Service
```typescript
// src/services/pdfGenerator.ts
export async function generatePDF(data: PDFData): Promise<Buffer> {
  // Renders HTML template
  // Launches Puppeteer
  // Converts HTML to PDF
  // Returns buffer
}
```

## 🔍 When PDF is Generated

### ✅ Triggers PDF Generation:
- User requests: `GET /api/v1/scan/:id/pdf`
- Scan status is `"completed"`
- PDF doesn't exist in storage

### ❌ Does NOT Trigger:
- Scan creation (`POST /api/v1/scan/create`)
- Scan processing (background job)
- Scan status check (`GET /api/v1/scan/:id`)

## 🧪 Testing PDF Generation

### Manual Test:
```bash
# 1. Create scan
curl -X POST http://localhost:4000/api/v1/scan/create \
  -H "Content-Type: application/json" \
  -d '{"websiteId":"YOUR_WEBSITE_ID"}'

# 2. Wait for scan to complete (check status)
curl http://localhost:4000/api/v1/scan/YOUR_SCAN_ID

# 3. Request PDF (triggers generation)
curl -o report.pdf http://localhost:4000/api/v1/scan/YOUR_SCAN_ID/pdf
```

### What Happens:
1. **First request:** PDF generated → Saved to S3 → Returned
2. **Second request:** PDF retrieved from S3 → Returned (faster)

## 📋 Summary

**PDF Generation is Triggered By:**
- ✅ HTTP Request: `GET /api/v1/scan/:id/pdf`
- ✅ Scan must be completed
- ✅ PDF doesn't exist in storage

**PDF Generation is NOT Triggered By:**
- ❌ Scan creation
- ❌ Scan processing
- ❌ Background jobs

**Benefits of On-Demand Generation:**
- 💰 Saves server resources
- ⚡ Faster scan completion
- 🔄 Always fresh data
- 💾 Cached after first generation

