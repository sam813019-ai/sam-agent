import type { FormValues } from '../lib/mapping';

export interface FieldLocator {
  /** 探測腳本跑出的真實 id，主要定位手段 */
  id?: string;
  /** 後備定位手段：比對欄位旁的說明文字。官網改版換 id 時仍能運作 */
  labelPattern: RegExp;
}

/**
 * 真實 id 來自 docs/ascrs-field-map.md（2026-08-26 於實機探測）。
 *
 * ⚠️ flatK 對應 MainContent_MeasuredK（畫面上第一組 K），steepK 對應 MainContent_MeasuredK0。
 * 依據：客戶 2026-08-27 回覆「通常 K1 是輸入 Flat K、K2 輸入 Steep K」。
 * 頁面本身沒有印出平/陡字樣可供程式確認，故 fill.ts 另有 detectKOrientation()
 * 在執行時反向驗證：只要頁面上讀得到與此相反的字樣，就拒填 K 值而非填反。
 */
export const ASCRS_FIELD_MAP: Record<keyof FormValues, FieldLocator> = {
  patientName:      { id: 'MainContent_PatientName',    labelPattern: /^Patient(\s*Name)?$/i },
  patientId:        { id: 'MainContent_PatientNo',      labelPattern: /^(Patient\s*)?ID$/i },
  surgeonName:      { id: 'MainContent_DoctorName',     labelPattern: /^(Doctor|Surgeon)(\s*Name)?$/i },
  flatK:            { id: 'MainContent_MeasuredK',      labelPattern: /^(Flat\s*)?K$/i },
  flatKAxis:        { id: 'MainContent_MeasuredAxis',   labelPattern: /^(Flat\s*K\s*)?Axis$/i },
  steepK:           { id: 'MainContent_MeasuredK0',     labelPattern: /^Steep\s*K$/i },
  steepKAxis:       { id: 'MainContent_MeasuredAxis0',  labelPattern: /^Steep\s*K\s*Axis$/i },
  al:               { id: 'MainContent_AxLength',       labelPattern: /^Ax(ial)?\.?\s*Length$/i },
  acd:              { id: 'MainContent_OpticalACD',     labelPattern: /^(Optical\s*)?ACD$/i },
  lt:               { id: 'MainContent_LensThickness',  labelPattern: /^Lens\s*Thickness$/i },
  wtw:              { id: 'MainContent_WTW',            labelPattern: /^WTW$/i },
  sia:              { id: 'MainContent_InducedCyl',     labelPattern: /^Induced\s*Cyl(inder)?$/i },
  siaAxis:          { id: 'MainContent_IncisionAxis',   labelPattern: /^Incision\s*Axis$/i },
  targetRefraction: { id: 'MainContent_Refraction',     labelPattern: /^Refraction$/i },
};

/** 絕對不可觸發的控制項 */
export const FORBIDDEN_IDS = ['MainContent_Button1', 'MainContent_btnReset'] as const;

/** 唯讀／由網站計算，不得寫入 */
export const READONLY_IDS = ['MainContent_NetCornealAstig'] as const;

/** ASP.NET 內部狀態欄位，改動會使伺服器端驗證失敗 */
export const ASPNET_STATE_PREFIX = '__';
