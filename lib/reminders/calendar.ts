/**
 * Helper Generator Kalender (.ics) dan Link Google Calendar
 * Menghasilkan jadwal pengingat pukul 15.00 (3 sore) untuk pengguna Gratis
 */

export function generateICalContent(): string {
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LaporMagang//Pengingat Logbook Maganghub//ID
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:lapormagang-reminder-1500@lapormagang.id
DTSTAMP:20261001T000000Z
RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
DTSTART;TZID=Asia/Jakarta:20261012T150000
DTEND;TZID=Asia/Jakarta:20261012T153000
SUMMARY:📝 Isi Logbook LaporMagang (Pukul 15.00)
DESCRIPTION:Waktunya menyusun catatan harian dan draf 3 kolom Maganghub Kemnaker sebelum batas akhir 23.59 WIB. Buka https://lapormagang.id/app/hari-ini untuk draf instan.
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT0M
ACTION:DISPLAY
DESCRIPTION:Pukul 15.00: Waktunya buat logbook harian magang!
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

export function generateGoogleCalendarUrl(): string {
  const title = encodeURIComponent('📝 Isi Logbook LaporMagang (Pukul 15.00)');
  const details = encodeURIComponent(
    'Waktunya menulis kegiatan harian dan menyalin draf 3 kolom Maganghub Kemnaker sebelum 23.59 WIB agar absensi aman.\n\nBuka aplikasi: https://lapormagang.id/app/hari-ini'
  );
  const location = encodeURIComponent('https://maganghub.kemnaker.go.id');
  // Waktu: Jam 15.00 WIB s/d 15.30 WIB, berulang hari kerja Senin-Jumat
  const dates = '20261012T150000/20261012T153000';
  const rrule = 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}&recur=${encodeURIComponent(
    rrule
  )}&ctz=Asia/Jakarta`;
}
