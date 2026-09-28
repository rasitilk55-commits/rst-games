#!/usr/bin/env bash
# Google Play "yükleme anahtarı" (upload key) üretir. Java (keytool) gerekir.
# Kullanım: bash tools/make-keystore.sh [klasör=imza-anahtari]
# Çıktı: upload.keystore, upload.keystore.base64.txt (GitHub gizli değişkeni), BILGILER.txt (şifreler)
# Bu klasörü ASLA GitHub'a yükleme (.gitignore'da). Güvenli bir yere (şifre yöneticisi, harici disk) yedekle.
set -euo pipefail
DIR="${1:-imza-anahtari}"
mkdir -p "$DIR"
if [ -f "$DIR/upload.keystore" ]; then echo "Zaten var: $DIR/upload.keystore (üzerine yazılmadı)"; exit 1; fi
PASS=$(set +o pipefail; LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24)
ALIAS=upload
keytool -genkeypair -v -keystore "$DIR/upload.keystore" -storetype PKCS12 -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10000 -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=RST Games, OU=Mobile, O=RST Games, C=TR" >/dev/null 2>&1
base64 -w0 "$DIR/upload.keystore" > "$DIR/upload.keystore.base64.txt" 2>/dev/null || base64 -i "$DIR/upload.keystore" | tr -d '\n' > "$DIR/upload.keystore.base64.txt"
SHA1=$(keytool -list -v -keystore "$DIR/upload.keystore" -storepass "$PASS" -alias "$ALIAS" | awk '/SHA1:/{print $2}')
SHA256=$(keytool -list -v -keystore "$DIR/upload.keystore" -storepass "$PASS" -alias "$ALIAS" | awk '/SHA256:/{print $2}')
cat > "$DIR/BILGILER.txt" <<TXT
GOOGLE PLAY YÜKLEME ANAHTARI (upload key)
=========================================
Bu dosyayı ve upload.keystore'u kimseyle paylaşma, GitHub'a yükleme. Güvenli bir yere yedekle.
Kaybedersen: Play Console > Uygulama bütünlüğü > Uygulama imzalama > "Yükleme anahtarını sıfırlama isteği" ile yenisini alabilirsin
(Play Uygulama İmzalama açık olduğu için uygulamanın asıl imza anahtarı Google'da güvende kalır).

GitHub > Settings > Secrets and variables > Actions > New repository secret:
  ANDROID_KEYSTORE_BASE64   = upload.keystore.base64.txt dosyasının TAMAMI (tek satır)
  ANDROID_KEYSTORE_PASSWORD = $PASS
  ANDROID_KEY_ALIAS         = $ALIAS
  ANDROID_KEY_PASSWORD      = $PASS

Parmak izleri (gerekirse Play Console / Firebase / API sağlayıcıları ister):
  SHA-1   : $SHA1
  SHA-256 : $SHA256
TXT
echo "Hazır: $DIR/ (upload.keystore, upload.keystore.base64.txt, BILGILER.txt)"
