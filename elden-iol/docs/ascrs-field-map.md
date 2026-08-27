# APACRS Toric Calculator V2.0 — 真實欄位對照表

來源：2026-08-26 於 `https://calc.apacrs.org/toric_calculator20/Toric%20Calculator.aspx`
以 `tools/ascrs-probe.js` 實測取得。**此表取代計畫中所有猜測的選擇器。**

## 平台事實

- **ASP.NET Web Forms**（`webForms: true`，react/angular/vue/jquery 全部 false）
- **`reactControlled: 0`** — 無受控元件，`setNativeValue` 繞 setter 的複雜手法**非必要**，
  直接指派 `.value` 即可。原本評估的最大技術風險確認不存在。
- 直接開啟計算器網址時 `iframes: 0`；從 ascrs.org 嵌入時它是跨域 iframe。
- 36 欄位 / 30 可見；6 個隱藏欄位是 ASP.NET 機制：
  `__EVENTTARGET` `__EVENTARGUMENT` `__LASTFOCUS` `__VIEWSTATE` `__VIEWSTATEGENERATOR` `__EVENTVALIDATION`
  → 這些**絕對不能碰**，改動會使伺服器端驗證失敗。

## 欄位對照（FormValues → 真實 id）

| FormValues | 真實 id | name | 頁面提示 |
|---|---|---|---|
| `patientName` | `MainContent_PatientName` | `ctl00$MainContent$PatientName` | |
| `patientId` | `MainContent_PatientNo` | `ctl00$MainContent$PatientNo` | Patient ID |
| `surgeonName` | `MainContent_DoctorName` | `ctl00$MainContent$DoctorName` | ⚠️ 是 DoctorName 不是 Surgeon |
| `flatK` | `MainContent_MeasuredK` | `ctl00$MainContent$MeasuredK` | (30~60 D) ⚠️ 見未決問題 1 |
| `flatKAxis` | `MainContent_MeasuredAxis` | `ctl00$MainContent$MeasuredAxis` | (0~180 degrees) |
| `steepK` | `MainContent_MeasuredK0` | `ctl00$MainContent$MeasuredK0` | (30~60 D) ⚠️ 見未決問題 1 |
| `steepKAxis` | `MainContent_MeasuredAxis0` | `ctl00$MainContent$MeasuredAxis0` | (0-180 degrees) |
| `al` | `MainContent_AxLength` | `ctl00$MainContent$AxLength` | (12~38 mm) |
| `acd` | `MainContent_OpticalACD` | `ctl00$MainContent$OpticalACD` | (0.0~6.0 mm) |
| ~~`aConstant`~~ | `MainContent_Aconstant` | `ctl00$MainContent$Aconstant` | (112~125) 🚫 2026-08-27 客戶決定不代填 |
| ~~`lensFactor`~~ | `MainContent_LensFactor` | `ctl00$MainContent$LensFactor` | (-2.0~5.0) 🚫 同上 |
| `sia` | `MainContent_InducedCyl` | `ctl00$MainContent$InducedCyl` | (0.0~2.0 D)，預設 "0" |
| `siaAxis` | `MainContent_IncisionAxis` | `ctl00$MainContent$IncisionAxis` | (0~360 degrees)，預設 "0" |
| `lt` | `MainContent_LensThickness` | `ctl00$MainContent$LensThickness` | (2.0~8.0 mm) 選填，null 則留空 |
| `wtw` | `MainContent_WTW` | `ctl00$MainContent$WTW` | (8~14 mm) 選填，null 則留空 |
| `targetRefraction` | `MainContent_Refraction` | `ctl00$MainContent$Refraction` | 預設 "0" |
| ~~`date`~~ | **不存在** | — | 已於 Task 5 fix round 1 移除 |

## 選項類控制項

| 用途 | id | name |
|---|---|---|
| K Index 1.3375 | `MainContent_RadioButtonList1_0` | `ctl00$MainContent$RadioButtonList1` |
| K Index 1.332 | `MainContent_RadioButtonList1_1` | 同上 |
| +ve Cylinder | `MainContent_RadioButtonList2_0` | `ctl00$MainContent$RadioButtonList2` |
| -ve Cylinder | `MainContent_RadioButtonList2_1` | 同上 |
| 眼別 OD | `MainContent_Rad1` | `ctl00$MainContent$Eye Select` ⚠️ name 含空白 |
| 眼別 OS | `MainContent_Rad2` | 同上 |

眼別兩個 radio 預設**皆為 false** — 使用者必須明確選擇，與 spec 安全關卡第 2 條天然吻合。

## 曾經計畫未涵蓋、現已納入的欄位

| 報告單資料 | 可填入的 id | 說明 |
|---|---|---|
（此節已完成，三欄全數納入上方主表，保留此處僅為說明來歷。）

## 不可寫入

- `MainContent_NetCornealAstig` — **readOnly: true**，由網站計算，不得填寫
- `MainContent_ConfirmCheckBox` — **disabled: true**，資料齊全後才啟用
- `MainContent_Koptional1` / `Koptional2` — 第二組選填 K 值，MVP 不使用
- 全部 6 個 `__` 開頭的 ASP.NET 隱藏欄位

## 按鈕（絕不可自動觸發）

| 用途 | id |
|---|---|
| Calculate | `MainContent_Button1` |
| Reset Form | `MainContent_btnReset` |

## IOL 型號下拉選單

`MainContent_IOLModel`（38 個選項）**內含 `J&J DIU`**，正是樣本用的散光片。
預設值為 `Personal Constant`。

選擇型號很可能會由網站自動帶入 A Constant / Lens Factor。

**設計決定（2026-08-27 客戶拍板，取代前一版決定）：這個下拉與其連動的兩個常數欄位，
代填一律不碰，由醫師自己選。** 客戶列出的必填清單裡沒有常數，且鏡片是醫師術前決定的事，
不是報告單上讀得到的事實。

前一版決定是「維持 Personal Constant 並由我們寫入 119.39 / 2.09」，已作廢。
`lens-constants.ts` 的對照表（ZCB00/ZCB00-1 → J&J DIU 119.39 / 2.09，經樣本驗證）
保留在 repo 但**未接線**，若日後客戶改要自動帶入可直接接回。

`MainContent_IOLPower` 下拉（6.0–34.0）是計算後才選的，不在代填範圍。

## 未決問題

1. 🔴 **`MeasuredK` 與 `MeasuredK0` 何者為 Flat？** 兩者頁面提示同為 "(30~60 D)"，
   探測腳本抓不到真正的可見標籤。DOM 順序為 MeasuredK → MeasuredAxis → MeasuredK0 → MeasuredAxis0，
   推測第一組為 Flat(K1)、第二組為 Steep(K2)，但**填反等同散光軸位全錯**，必須以肉眼確認。
2. ✅ 已解決：頁面沒有 Date 欄位，`FormValues.date` 與 `formatDate()` 已於 fix round 1 移除。
3. ✅ 已解決（2026-08-27 客戶回覆）：Refraction / LensThickness / WTW 三欄**全部納入**，
   客戶明列需帶入 AL、K1+軸、K2+軸、ACD、Target refraction(預設0)、LT、WTW。
   同一則回覆也確定 A Constant 與鏡片型號**不代填**，由醫師在 `MainContent_IOLModel` 自選。
4. 🟡 是否有欄位帶 AutoPostBack（`onchange` 含 `__doPostBack`）—— 探測腳本未擷取 onchange 屬性。
