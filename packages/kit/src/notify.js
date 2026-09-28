// Yerel bildirimler (sunucu gerekmez): günlük görev hatırlatması ve seri uyarısı.
// İzin, oyuncu birkaç seviye oynadıktan sonra kendi ön-sorumuzla istenir (açılışta değil).
import { isNative, loadPlugin } from './native.js';

export async function askNotifications() {
  if (!isNative()) return false;
  try {
    const { LocalNotifications } = await loadPlugin('notifications');
    const r = await LocalNotifications.requestPermissions();
    return r && r.display === 'granted';
  } catch (e) {
    return false;
  }
}

/** texts: { dailyTitle, dailyBody, streakTitle, streakBody } — oyunun dilinde hazır metinler */
export async function scheduleReminders({ streak, doneToday, texts }) {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await loadPlugin('notifications');
    const perm = await LocalNotifications.checkPermissions();
    if (!perm || perm.display !== 'granted') return;
    await LocalNotifications.cancel({ notifications: [{ id: 1 }, { id: 2 }] });
    const list = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(19, 0, 0, 0);
    list.push({ id: 1, title: texts.dailyTitle, body: texts.dailyBody, schedule: { at: tomorrow } });
    const tonight = new Date();
    tonight.setHours(20, 30, 0, 0);
    if (streak > 0 && !doneToday && tonight > new Date()) {
      list.push({ id: 2, title: texts.streakTitle, body: texts.streakBody, schedule: { at: tonight } });
    }
    await LocalNotifications.schedule({ notifications: list });
  } catch (e) { /* bildirim yoksa sessizce devam */ }
}
