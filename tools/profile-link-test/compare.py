"""Read-only, authenticated loopback comparison of two HBYS profile snapshots."""
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import threading
import time

PORT = 8876
KEY_FILE = Path(__file__).with_name('yerel-anahtar.txt')
TTL = 60


class Comparison:
    def __init__(self, key, clock=time.monotonic):
        self.key = key.encode('ascii')
        self.clock = clock
        self.samples = {}
        self.lock = threading.Lock()

    def digest(self, kind, value):
        return hmac.new(self.key, (kind + '\0' + value).encode(), hashlib.sha256).hexdigest()

    def compare(self, data):
        # No arbitrary strings, patient names, notes or HTML are accepted.
        if not isinstance(data, dict) or set(data) != {'role', 'client', 'tc', 'encounter'}:
            raise ValueError('input')
        role, client, tc, encounter = (data[k] for k in ('role', 'client', 'tc', 'encounter'))
        if (role not in ('registration', 'outpatient') or
                not isinstance(client, str) or not re.fullmatch(r'[a-zA-Z0-9_-]{16,80}', client) or
                not isinstance(tc, str) or not re.fullmatch(r'[0-9]{11}', tc) or
                not isinstance(encounter, str) or not re.fullmatch(r'[0-9]{1,20}', encounter)):
            raise ValueError('input')
        now = self.clock()
        sample = dict(role=role, client=client, at=now,
                      patient=self.digest('patient', tc), encounter=self.digest('encounter', encounter))
        with self.lock:
            self.samples = {k: v for k, v in self.samples.items() if now - v['at'] < TTL}
            self.samples[(role, client)] = sample
            grouped = {r: [s for s in self.samples.values() if s['role'] == r]
                       for r in ('registration', 'outpatient')}
            if any(len(v) > 1 for v in grouped.values()):
                status = 'ambiguous'
            elif any(not v for v in grouped.values()):
                status = 'waiting'
            else:
                first, second = grouped['registration'][0], grouped['outpatient'][0]
                if not hmac.compare_digest(first['patient'], second['patient']):
                    status = 'different_patient'
                elif not hmac.compare_digest(first['encounter'], second['encounter']):
                    status = 'different_encounter'
                else:
                    status = 'matching'
            return {'status': status, 'mode': 'snapshot_only', 'expires_seconds': TTL,
                    'registration_samples': len(grouped['registration']),
                    'outpatient_samples': len(grouped['outpatient'])}


def handler_for(state, key):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Do not log patient data, request bodies or authentication headers.

        def reply(self, code, data):
            body = json.dumps(data).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):
            if self.headers.get('Host') != '127.0.0.1:' + str(PORT):
                return self.reply(403, {'error': 'host'})
            auth = self.headers.get('Authorization', '').encode('utf-8')
            if not hmac.compare_digest(auth, ('Bearer ' + key).encode('ascii')):
                return self.reply(401, {'error': 'auth'})
            if self.path != '/compare':
                return self.reply(404, {'error': 'path'})
            if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                return self.reply(415, {'error': 'type'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 2048:
                    return self.reply(413, {'error': 'size'})
                data = json.loads(self.rfile.read(length))
                self.reply(200, state.compare(data))
            except (ValueError, TypeError, KeyError):
                self.reply(400, {'error': 'input'})
    return Handler


def local_key():
    if not KEY_FILE.exists():
        try:
            with KEY_FILE.open('x', encoding='ascii') as stream:
                stream.write(secrets.token_hex(32))
            os.chmod(KEY_FILE, 0o600)
        except FileExistsError:
            pass
    key = KEY_FILE.read_text(encoding='ascii').strip()
    if not re.fullmatch(r'[a-f0-9]{64}', key):
        raise SystemExit('Yerel anahtar dosyası geçersiz. Dosyayı paylaşmadan yerel olarak yeniden oluştur.')
    return key


def main():
    key = local_key()
    try:
        server = ThreadingHTTPServer(('127.0.0.1', PORT), handler_for(Comparison(key), key))
    except OSError:
        raise SystemExit('8876 portu açılamadı. Program zaten açık olabilir; ikinci kopyayı kapat.') from None
    print('HBYS PROFİL EŞLEŞTİRME TESTİ — kayıt yapmaz')
    print('Bu pencere açık kalsın. Durdurmak için Ctrl+C.')
    print('Yerel bağlantı anahtarı (yalnızca iki profilin Tampermonkey ayarına gir; paylaşma):')
    print(key)
    print('TC ve İşlem No diske veya internete gönderilmez. Sonuç yalnızca anlık örnek karşılaştırmasıdır.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
