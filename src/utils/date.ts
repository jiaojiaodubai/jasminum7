import { setPref } from "./prefs";

/**
 * 若时间字符串date1比date2要早则返回`true`，否则返回`false`
 * @param date1 表示时间的字符串，应遵循“yyyy-MM-dd HH:mm:ss”格式
 * @param date2 表示时间的字符串，应遵循“yyyy-MM-dd HH:mm:ss”格式
 */
export function isEarlier(date1: string, date2: string): boolean {
    return new Date(date1) < new Date(date2);
}
  
/**
 * @returns 若本次调用时间和上一次检查时间中包含整点，则返回`true`，否则返回`false`
 */
export function checkUpdate(): boolean {
  const now = Date.now();
  const lastCheck = addon.data.prefs.lastCheck;
  const HOUR_RATIO = 1000 * 60 * 60;
  function pastHours(timeStamp: number) {
      return Math.floor(timeStamp / HOUR_RATIO);
  }
  addon.data.prefs.lastCheck = now;
  setPref("lastCheck", now);
  return pastHours(now) - pastHours(lastCheck) > 1;
}