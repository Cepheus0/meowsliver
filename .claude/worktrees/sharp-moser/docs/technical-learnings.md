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

## 8. CSV date/time ถูก parse ผิดเพราะ day-first format

**Commit:** `caf3bcd` Fix import normalization and preview deduplication

### Symptom
รายการจาก `Meowjot_Jan-Apr2026.csv` แสดงวัน/เดือนผิด เช่นข้อมูลที่ควรเป็น
`01/04/2026` ถูกตีความเป็นเดือน/วัน หรือบาง row ถูกเลื่อนไปคนละเดือน
ทำให้ dashboard และ reports สรุปรายเดือนผิดทั้งหมด แม้ยอดรวมทั้งไฟล์ดูเหมือนใกล้เคียง

### Root Cause
`xlsx` แปลง CSV date string บางรูปแบบจาก `01/04/2026` เป็น `1/4/26`
แล้ว parser เดิม fallback ไปใช้ `new Date(...)`
JavaScript date parser บนรูปแบบ ambiguous แบบนี้ตีความเป็น `MM/DD/YY`
ไม่ใช่ `DD/MM/YY` ตาม export ภาษาไทยของ Meowjot

อีกปัญหาหนึ่งคือ `เวลา` ยังไม่ได้ถูกเก็บเป็น first-class field
ทำให้ sorting และ fingerprint ใช้ date อย่างเดียว → รายการวันเดียวกันเรียงไม่ deterministic

### Fix
- เขียน `normalizeDate()` ให้รองรับ day-first เองแบบ explicit:
  `D/M/YY`, `D/M/YYYY`, `D-M-YY`, `D-M-YYYY`
- validate วันที่ด้วย `Date.UTC()` เพื่อกัน invalid date เช่น `31/02/2026`
- เพิ่ม `normalizeTime()` แล้วเก็บ `time` เข้า normalized row, DB, API และ UI
- Sort transaction ด้วย `date + time + id` แทน date อย่างเดียว

### Takeaway
- **อย่าใช้ `new Date()` กับ user-imported CSV ที่ ambiguous**
  โดยเฉพาะ locale ที่ใช้ `DD/MM/YYYY`
- **Date normalization ต้องเป็น deterministic contract**
  import pipeline, fingerprint, sorting, และ UI ต้องใช้ค่าที่ normalize แล้วเหมือนกัน
- **Time เป็นส่วนหนึ่งของ identity** สำหรับ ledger data —
  ถ้าไม่เก็บ time จะเพิ่มโอกาส dedup/sort ผิดในวันที่มีหลายรายการ

---

## 9. Browser local cache แสดงรายการเก่าหลังล้าง DB

**Commit:** `82eda75` Fix hydration mismatch and add browser smoke coverage

### Symptom
ล้าง `transactions`, `import_runs`, `import_run_rows` ใน Postgres แล้ว
`/api/transactions` คืน `[]` ถูกต้อง แต่หน้า `/transactions` ยังแสดงรายการเก่า 209 หรือ 745 records อยู่

### Root Cause
Zustand persist เก็บ `importedTransactions` ไว้ใน `localStorage`
หลังหน้า hydrate เสร็จ client store ยังมีข้อมูลเก่าจาก browser cache
และบางจังหวะ UI เชื่อ local state มากกว่า DB state

ปัญหานี้อันตรายเพราะทำให้ user เข้าใจผิดว่า DB ยังไม่ถูกล้าง
ทั้งที่ source of truth ฝั่ง server ว่างแล้ว

### Fix
- ใช้ `skipHydration: true` ใน Zustand persist เพื่อคุมจังหวะ rehydrate เอง
- เพิ่ม `TransactionsHydrator` ให้ fetch `/api/transactions` หลัง local rehydrate
- ทำให้ DB เป็น source of truth: ถ้า API คืน `[]` ต้อง `replaceImportedTransactions([])`
  เพื่อล้าง stale local cache ตาม DB
- เพิ่ม browser smoke test ที่ seed localStorage stale data แล้วตรวจว่า DB-backed hydration override ได้จริง

### Takeaway
- **localStorage เป็น cache ไม่ใช่ source of truth** เมื่อมี DB แล้ว
- **Clear DB ต้อง clear หรือ invalidate client cache ด้วย** ไม่งั้น UX จะเหมือนข้อมูลไม่หาย
- **Hydration order สำคัญมาก** ใน Next.js + persisted client store:
  server HTML, localStorage, และ DB fetch ต้องมี ownership ชัดเจน

---

## 10. Recharts pie/bar chart หายเพราะ container width/height = -1

**Commit:** `f4d0486` Polish reports charts and dashboard rendering

### Symptom
หลัง import ข้อมูลจริง หน้า dashboard/reports โหลดได้ แต่บาง chart โดยเฉพาะ pie chart
แสดงแค่ legend หรือพื้นที่ว่าง และ console มี warning:
`The width(-1) and height(-1) of chart should be greater than 0`

### Root Cause
`ClientOnlyChart` กัน SSR mismatch ได้ แต่ยังไม่พอสำหรับ Recharts runtime sizing
เพราะ `ResponsiveContainer` ยังอ่าน parent dimension ในจังหวะที่ layout ยังไม่ stable
โดยเฉพาะ card/grid ที่ render พร้อมข้อมูลจริงและมี responsive container หลายชั้น

### Fix
- สร้าง `ChartViewport` wrapper ที่ใช้ `ResizeObserver`
- Render chart เฉพาะเมื่อได้ `{ width, height } > 0` แล้ว
- ส่ง explicit width/height เข้า chart แทนปล่อย `ResponsiveContainer` เดาขนาดเอง
- ใช้ skeleton fallback ระหว่างรอ measurement เพื่อไม่ให้ UI กระพริบหรือ collapse

### Takeaway
- **Client-only ไม่ได้แปลว่า layout-ready**
  component อาจ mount แล้วแต่ parent ยังไม่มีขนาดที่ใช้ได้
- **Chart rendering ควรรอ measured dimensions**
  โดยเฉพาะ dashboard/report ที่เป็น responsive grid
- **Console warning จาก chart library มักเป็น product bug**
  ไม่ใช่ noise เพราะ user เห็น chart หายจริง

---

## 11. Single-year report chart ให้ insight ต่ำ

**Commit:** `f4d0486` Polish reports charts and dashboard rendering

### Symptom
กราฟ `ยอดสุทธิสะสมย้อนหลัง` ในหน้า reports มีข้อมูลเพียงปี 2026 ปีเดียว
ทำให้ line chart แสดงเป็นจุดเดียว ดูเหมือน chart พังหรือไม่มี insight
ทั้งที่ข้อมูลรายเดือนมีเพียงพอให้วิเคราะห์ได้

### Root Cause
Visualization เลือกมิติ `year-over-year` เป็น default โดยไม่ดู data cardinality
ถ้ามีแค่ 1 ปี การเทียบหลายปีไม่มีความหมาย แต่ UI ยังฝืนใช้ chart type เดิม

### Fix
- เพิ่ม helper `getMonthlyNetWorthTrendFromTransactions()`
- ถ้า dataset มีเพียง 1 ปี ให้ switch chart เป็น `ยอดสุทธิสะสมรายเดือน ปี {selectedYear}`
- ถ้ามีหลายปี ค่อยใช้ yearly trend เดิม

### Takeaway
- **Chart type ต้อง adaptive ตาม shape ของข้อมูล**
  ไม่ใช่ lock ตาม design แรก
- **1-point line chart เป็น anti-pattern**
  เพราะ user แยกไม่ออกว่า "ไม่มีข้อมูล" หรือ "chart เสีย"
- **Fallback visualization ที่ดีควรตอบคำถามใกล้เคียงที่สุด**
  มีปีเดียว → ดู monthly cumulative trend ดีกว่า YoY

---

## 12. Bun-provided `node` ทำให้ Vitest/tsx smoke script fail

**Commit:** `6b7abfb` Stabilize Node-based repo scripts

### Symptom
คำสั่งอย่าง `bun run test:unit`, `bun run test:smoke:api`, `bun run test:smoke:browser`
fail ด้วย error เช่น:
`Coverage APIs are not supported`
หรือ `Cannot find module './cjs/index.cjs'`

แต่เมื่อรันด้วย Node จริงผ่าน `/usr/local/bin/node` กลับผ่านทั้งหมด

### Root Cause
บนเครื่องนี้ `node` ใน PATH ชี้ไปที่ Bun-provided Node wrapper (`~/.bun/bin/node`)
ซึ่งไม่รองรับบาง behavior ที่ Vitest coverage, `tsx`, `pg`, และ Playwright smoke scripts ต้องใช้

ผลคือ package scripts ที่ดูเหมือน generic กลายเป็น environment-dependent และ fail เฉพาะเครื่อง

### Fix
- เพิ่ม `scripts/run-node-tool.sh`
- ให้ wrapper เลือก `/usr/local/bin/node` ก่อน ถ้ามีอยู่
- ปรับ `package.json` scripts ที่ต้องใช้ Node runtime จริงให้เรียกผ่าน wrapper:
  - `test:unit`
  - `test:smoke:api`
  - `test:smoke:browser`
  - `test:report`
  - `db:migrate`

### Takeaway
- **Bun เป็น package manager/runtime ที่ดี แต่ไม่ควร assume ว่าแทน Node ได้ 100%**
  โดยเฉพาะ tooling ที่ใช้ inspector, coverage, loader หรือ native module resolution
- **Repo scripts ต้อง encode runtime assumption เอง**
  อย่าปล่อยให้ PATH ของเครื่องตัดสิน behavior สำคัญ
- **ถ้า command ผ่านเมื่อใช้ binary ตรง แต่ fail ผ่าน script**
  ให้ตรวจ `which node`, shell PATH, และ runtime shim ก่อนสงสัย app code

---

## 13. Savings Goals เริ่มจาก placeholder ทำให้ mental model ไม่ตรงกับ user

**Commit:** `d742fbd` Add DB-backed savings goals

### Symptom
หน้า Buckets/Savings Goals ยังเหมือน placeholder:
สร้างเป้าหมายได้ไม่ครบ flow, card กดเข้าไปดู status ไม่ได้,
และ user คาดหวังว่าจะเปิดแต่ละเป้าเพื่อดู progress, growth, movement history ได้

### Root Cause
Product concept เดิมยังเป็น "bucket overview" มากกว่า "goal portfolio"
ไม่มี data model สำหรับ goal และ entries แยกกัน
จึงไม่สามารถตอบคำถามสำคัญได้ เช่น:
- ตอนนี้เก็บได้เท่าไร
- กำไร/เติบโตเท่าไร
- ต้องเก็บอีกเดือนละเท่าไร
- movement ไหนเป็น contribution/growth/withdrawal

### Fix
- เพิ่ม Postgres tables:
  - `savings_goals`
  - `savings_goal_entries`
- เพิ่ม API สำหรับ create/update goal และ add entry
- เพิ่ม detail page `/buckets/[goalId]`
- Card ใน `/buckets` กดได้ทั้งใบเพื่อเข้า detail
- คำนวณ metrics แยกชัดเจน:
  `currentAmount`, `totalContributions`, `totalGrowth`, `growthPercent`,
  `progressPercent`, `monthlyPaceNeeded`

### Takeaway
- **Financial goal ไม่ใช่แค่ label + target**
  ต้องมี movement ledger ถึงจะดู progress และ growth ได้จริง
- **Card-based overview ควร deep-link ได้เสมอ**
  ถ้า card แสดง metric สำคัญ user จะคาดหวังว่ากดเพื่อ drill down ได้
- **แยก contribution vs growth ตั้งแต่ data model**
  ไม่งั้น % กำไรจะปนกับเงินที่เราใส่เอง

---

## 14. Dev server / port switching ทำให้ทดสอบผิด working copy

**Commit:** operational learning during `meowsliver` → `meowsliver-clean` migration

### Symptom
ช่วงย้าย repo ใหม่แบบ clean มี dev server ค้างทั้ง `:3000` และ `:3001`
ทำให้บางครั้ง browser เปิดแอปคนละ working copy กับ code ที่เพิ่งแก้
ผลคือ user เห็น behavior เก่า แม้โค้ดใหม่ใน repo ถูกต้องแล้ว

### Root Cause
ตอน migration ใช้สอง workspace พร้อมกัน:
- repo เดิม: `/Users/woraweechanlongrat/Documents/projects/meowsliver`
- repo ใหม่: `/Users/woraweechanlongrat/Documents/projects/meowsliver-clean`

แล้วใช้ port แยกเพื่อทดสอบก่อนสลับจริง
แต่ถ้าไม่ kill process เก่าและ verify cwd ของ running server
จะเกิด environment drift ได้ง่าย

### Fix
- ปิด process เดิมบน `:3000` และ `:3001`
- ย้าย `meowsliver-clean` มา run ที่ `:3000`
- Verify ด้วย API/page status และ process cwd ก่อนให้ user ทดสอบ
- ต่อมาเปลี่ยนบางช่วงเป็น detached session เพื่อไม่ต้องเปิด terminal interactive ค้าง

### Takeaway
- **Port ไม่ได้บอกว่า code มาจาก repo ไหน**
  ต้อง verify process cwd หรือ startup command ด้วย
- **Migration ควรมี cutover checklist**
  kill old server → start new server → verify URL → verify API → verify git remote
- **User-facing QA ต้องผูกกับ environment เดียวกับที่ commit**
  ไม่งั้นแก้ถูก repo แต่ทดสอบผิด app

---

## General Patterns ที่เห็นจาก 14 เคสข้างบน

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
