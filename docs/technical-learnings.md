# Technical Learnings

บันทึกปัญหาเชิง technical ที่เจอระหว่างพัฒนา Meowsliver — เอาไว้เรียนรู้และกันไม่ให้ซ้ำรอยเดิม
แต่ละหัวข้อสรุป 4 อย่าง: **Symptom** (อาการที่เห็น), **Root Cause** (สาเหตุจริง),
**Fix** (วิธีแก้), **Takeaway** (บทเรียนที่เอาไปใช้ต่อได้)

---

## 1. Silent data loss จาก fingerprint-based dedup

**Commit:** `6e617d2` Preserve field-identical rows during import dedup

### Symptom
Dashboard แสดง net ก.พ. 2026 = +75 บาท ทั้งที่ CSV ต้นฉบับ balance เป็น 0 พอดี
Import ไม่ error ไม่ warn ข้อมูลหายเงียบๆ จนกว่าจะเจอใน aggregate report ที่ไม่ balance

### Root Cause
`buildExactFingerprintSeed()` hash จาก field ของ transaction เท่านั้น
(`date + time + amount + type + category + ... + recipient`) ทำให้ 2 แถวที่ทุก field เหมือนกันเป๊ะ
(เช่น สั่ง Grab 2 ออเดอร์ร้านเดียวกันราคาเท่ากันในนาทีเดียวกัน) ได้ fingerprint ตัวเดียวกัน
→ preview pipeline mark แถวที่ 2 เป็น `"duplicate"` → commit ข้าม → ข้อมูลหาย 1 record

CSV ที่ user ใช้มี 2 แถวซ้ำกันเป๊ะที่ `2026-02-10 08:50 WWW.GRAB.COM 75` → หาย 75 บาท

### Fix
เพิ่ม **occurrence counter** ต่อท้าย fingerprint (`base#1`, `base#2`, ...)
- ฝั่ง DB: เรียง `existingTransactions` ตาม `date → time → id` ให้ stable ก่อนนับ
- ฝั่ง CSV: นับตาม source order
- Pass occurrence-aware fingerprint ผ่านจาก preview → commit insert เพื่อไม่ชน `UNIQUE(fingerprint)` constraint

### Takeaway
- **Dedup 2 context ต้องแยกกันให้ชัด**
  - Intra-file: "แถวนี้ซ้ำในไฟล์เดียวกันมั้ย" — ต้องอนุญาตให้ซ้ำได้ตามความเป็นจริง
  - Cross-file: "แถวนี้เคยเข้า DB แล้วมั้ย" — ต้อง skip ตอน upload ทับกัน
- **Set vs Multiset semantics** — ถ้าข้อมูลจริงอนุญาตให้ซ้ำได้ (bag semantics) แต่ dedup ใช้ Set → ข้อมูลหาย
- **Silent data loss จับยาก** — ระบบไม่ throw แต่ผลรวมผิด ถ้าไม่มี ground truth (เช่น "เดือนนี้ควรเป็น 0")
  จะไม่มีทางสังเกตได้เลย
- **Unique constraint = safety net ไม่ใช่ dedup logic** —
  `onConflictDoNothing({ target: fingerprint })` รับได้เฉพาะกรณี preview หลุด
  ถ้าใช้ constraint เป็น primary dedup จะ swallow ข้อมูลจริง

---

## 2. Import post-commit ทำให้แอป reload เต็มหน้า

**Commit:** early March 2026 (อ้างถึงใน `progress.md` "Import Persistence Fix")

### Symptom
หลัง confirm import ข้อมูลหายไปจาก store หน้าแอปโหลดใหม่หมด

### Root Cause
Navigation หลัง commit ใช้ hard redirect → React tree ถูก remount →
Zustand store in-memory reset → ข้อมูลที่เพิ่ง commit หลุด

### Fix
- เปลี่ยนเป็น Next.js client-side routing (router.push)
- Persist `importedTransactions`, `selectedYear`, `sidebarCollapsed` ผ่าน Zustand `persist` middleware → localStorage

### Takeaway
- **Full page reload = state wipeout** ใน SPA ที่ใช้ in-memory store
- **Persistence layer ต้องเลือก partialize ให้ชัด** — อย่าเก็บทุกอย่างลง localStorage
  (เช่น computed values, transient UI state) จะ bloat และ sync ยาก
- Zustand `skipHydration: true` สำคัญใน Next.js App Router เพื่อ avoid SSR mismatch

---

## 3. Recharts prerender sizing warning / SSR hydration mismatch

**Commits:** `82eda75` Fix hydration mismatch, เริ่มต้นใน `progress.md` entry แรก

### Symptom
Console warning เรื่อง chart width/height ตอน SSR + hydration mismatch error
หลัง Next.js 16 upgrade

### Root Cause
Recharts `ResponsiveContainer` คำนวณขนาดจาก DOM parent — ตอน SSR ไม่มี DOM จริง →
render มิติเริ่มต้นผิด → hydration diff กับ client

### Fix
ห่อทุก chart ด้วย `ClientOnlyChart` wrapper ที่ return `null` จนกว่า `useEffect` จะรัน
(= mount ฝั่ง client แล้วเท่านั้นจึงเริ่ม render chart จริง)

### Takeaway
- **Chart libraries ส่วนใหญ่ไม่ SSR-friendly** — Recharts, Chart.js, Nivo
  ควรใช้ client-only boundary เสมอ
- **Hydration mismatch = เงียบแต่ร้ายแรง** — ทำให้ React fall back ไป client render
  ทั้ง subtree เสีย perf และ SEO
- Pattern เดียวกันใช้ได้กับทุก component ที่ depend กับ DOM measurement หรือ `window`

---

## 4. Dark mode flash / inconsistent chart colors

**Commits:** `fffd609` Add dark mode system, `d617240` Polish dark mode

### Symptom
สลับ theme แล้วสีกราฟไม่เปลี่ยน หรือเปลี่ยนช้ากว่า UI อื่น บางหน้ามี flash ตอนโหลด

### Root Cause
- สีในกราฟ hardcode ไว้ใน component
- Theme state อยู่ใน React state → paint หลัง hydration → flash

### Fix
- ย้ายสีทั้งหมดไปเป็น CSS custom properties (`--app-text`, `--chart-income`, ...)
- Set theme class บน `<html>` ผ่าน inline script ก่อน React hydrate
- Recharts อ่านสีผ่าน `getComputedStyle` หรือ resolve ผ่าน shared chart tokens

### Takeaway
- **Design tokens via CSS variables** scale ดีกว่า JS theme objects สำหรับ runtime switching
- **Theme init ต้องเกิดก่อน React** — ไม่งั้น FOUC (flash of unstyled content) หลีกเลี่ยงไม่ได้
- Chart library ต้อง "breathe" เข้ากับ token system — อย่าแยก color palette ต่างหาก

---

## 5. Playwright MCP unreliable → CLI fallback

**Commit:** `d617240` Add Playwright fallback. ดูรายละเอียดใน `docs/playwright-cli-fallback.md`

### Symptom
Codex Playwright MCP server connection หลุดบ่อย เทสต์ browser แบบ interactive ทำไม่ได้

### Root Cause
MCP server ใช้งานร่วมกับ Codex runtime แล้ว unstable บนเครื่องนี้
(ไม่ใช่ bug ของโค้ดเราตรงๆ แต่ block workflow)

### Fix
มี CLI-first Playwright fallback (`npx playwright test`) + smoke test suite
ที่รันแบบ headless ได้โดยไม่พึ่ง MCP

### Takeaway
- **Tooling ควรมี fallback path เสมอ** อย่าให้ QA depend กับ layer ใดชั้นเดียว
- **Smoke test > integration test** สำหรับ local validation —
  เร็วพอที่จะรันบ่อย และพอจับ regression หลักได้
- เอกสาร fallback procedure ไว้ใน repo (ดู `docs/playwright-cli-fallback.md`)
  จะช่วย future-self และ collaborator

---

## 6. Transfer transactions ทำให้ income/expense รวมผิด

**Commit:** `0a50125` Support transfer transactions in import flow

### Symptom
รายการประเภท "ย้ายเงิน" ถูกนับรวมเป็น income หรือ expense → ยอดรวมของเดือนบวม

### Root Cause
Import pipeline แต่ก่อนรู้จักแค่ `income` / `expense` → รายการ transfer
ถูก map เข้าอย่างใดอย่างหนึ่งหรือถูก drop

### Fix
- เพิ่ม `type: "transfer"` ในทั้ง normalized schema และ DB enum
- Analytics (`getMonthlyCashflowFromTransactions`) filter ออกจาก net calculation
  (เพราะ transfer = internal movement ไม่ใช่ real income/expense)
- Preview summary แสดง transfer count แยกต่างหาก

### Takeaway
- **Domain model ต้อง first-class support ทุก transaction type** ที่ bank export ส่งมา
  อย่าพยายาม squeeze ทุกอย่างเข้า binary income/expense
- **Accounting logic: transfer ≠ cashflow** — ย้ายจากกระเป๋าซ้ายไปขวาไม่ทำให้รวยขึ้น
- Summary card ควรแสดง transfer rows เพื่อให้ user สังเกตได้ว่าข้อมูลครบ

---

## 7. Import normalization ทำค่าเป็น 0 เงียบๆ

**Commit:** `caf3bcd` Fix import normalization and preview deduplication

### Symptom
บาง row หลัง normalize มี amount = 0 หรือ field สำคัญเป็น null ทั้งที่ CSV มีข้อมูลครบ

### Root Cause
- Excel parser อ่านค่าที่เป็น string ตัวเลข (`"-700"`) แล้ว parse ไม่ robust
- Category/note ที่เป็น `-` ใน CSV ถูกเก็บตรงๆ ไม่ canonicalize
- Fingerprint hash field ที่ canonicalize ไม่สม่ำเสมอ → dedup พลาด

### Fix
- Normalize ทุก field ผ่าน `canonicalize()` (trim, lowercase, strip `-` placeholder)
- Parse amount ด้วย regex ที่รองรับเครื่องหมาย/comma/whitespace
- Separate `buildExactFingerprintSeed` vs `buildConflictFingerprintSeed`
  (exact = ทุก field, conflict = date + amount + type + identity)

### Takeaway
- **Normalize ครั้งเดียวจุดเดียว** ก่อนทุกการใช้งาน — อย่ากระจายไปตาม call site
- **Test matrix ตามรูปแบบ export จริง** — Thai bank CSV มี quirks เยอะ
  (placeholder `-`, BOM, format วันที่ d/m/Y, negative amount แทน expense)
- Bug ใน parsing มักทำให้ดาวน์สตรีม dedup พลาดตาม

---

## General Patterns ที่เห็นจาก 7 เคสข้างบน

1. **Silent failures เยอะกว่าที่คิด** — ทุก bug ข้างบนไม่มี error thrown
   แต่ละเคสจับได้ด้วย ground truth จาก user หรือ aggregate check
   → ใส่ sanity check / invariant assertion ใน critical path ช่วยได้มาก
2. **Boundary layer (import/export, SSR/CSR, theme switching) เป็น bug magnet** —
   ต้องมี integration test หรือ smoke test คุม
3. **Next.js App Router + persist-based stores = subtle hydration traps** —
   ต้อง `skipHydration` + manual hydrate ใน useEffect แทบทุกครั้ง
4. **Thai-specific edge cases:** encoding (UTF-8 BOM), date format (d/m/Y),
   BE year (2568), placeholder (`-`), Thai number formatting — test ด้วยไฟล์จริงทุกครั้ง
5. **Dedup / merge / reconcile logic เป็นพื้นที่อันตราย** —
   ถ้าออกแบบ key ผิด ข้อมูลหายโดยไม่รู้ตัว ควร review logic นี้หนักกว่าส่วนอื่น
