# Downtime GA

## ตั้งค่า CORS สำหรับ Export PDF

การ Export PDF ต้องอ่านข้อมูลรูปจาก Firebase Storage ด้วย JavaScript ในเบราว์เซอร์ ซึ่งต้องตั้งค่า CORS ที่ bucket เพิ่มเติมจาก `storage.rules` (กฎ Storage อนุญาตให้อ่านแล้ว แต่ไม่ได้ตั้งค่า CORS ให้)

ติดตั้งและเข้าสู่ระบบ Google Cloud CLI ด้วยบัญชีที่มีสิทธิ์จัดการ bucket จากนั้นรันคำสั่งนี้ในโฟลเดอร์โปรเจกต์:

```powershell
gcloud storage buckets update gs://downtime-1bce5.firebasestorage.app --cors-file=storage-cors.json
```

นโยบายใน `storage-cors.json` อนุญาตให้หน้าเว็บทุก origin อ่านรูปผ่าน `GET` ได้ ซึ่งเหมาะกับแอปนี้ที่กำหนดให้รูปอ่านได้สาธารณะใน `storage.rules` อยู่แล้ว หากใช้ custom domain และต้องการจำกัด origin ให้เปลี่ยน `"*"` เป็น URL ของเว็บ เช่น `"https://example.com"` แล้วอัปเดต bucket ด้วยคำสั่งเดิม

หลังอัปเดต CORS แล้ว ให้โหลดหน้าเว็บใหม่และลอง Export PDF อีกครั้ง
