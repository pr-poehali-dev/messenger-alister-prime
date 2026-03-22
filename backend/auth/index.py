"""
Авторизация и пользователи ALISTER PRIME.
/send-code, /verify-code, /setup-profile, /me, /profile, /search, /profile/:username
"""
import json
import os
import random
import string
import secrets
import psycopg2
import urllib.request
import urllib.parse


SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p42248577_messenger_alister_pr")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Auth-Token, X-Session-Id",
    "Access-Control-Max-Age": "86400",
}


def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def json_response(data, status=200):
    return {
        "statusCode": status,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(data, ensure_ascii=False, default=str),
    }


def send_sms(phone: str, code: str) -> bool:
    login = os.environ.get("SMSC_LOGIN", "")
    password = os.environ.get("SMSC_PASSWORD", "")
    if not login or not password:
        print(f"[SMS MOCK] Phone: {phone}, Code: {code} (SMSC not configured)")
        return True
    msg = f"ALISTER PRIME: ваш код подтверждения {code}"
    params = urllib.parse.urlencode({
        "login": login,
        "psw": password,
        "phones": phone,
        "mes": msg,
        "fmt": 3,
        "charset": "utf-8",
    })
    url = f"https://smsc.ru/sys/send.php?{params}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return "id" in result
    except Exception as e:
        print(f"SMS error: {e}")
        return False


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    path = event.get("path", "/")
    method = event.get("httpMethod", "GET")
    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"])
        except Exception:
            pass

    auth_header = event.get("headers", {}).get("X-Auth-Token", "")

    db = get_db()
    cur = db.cursor()

    try:
        # POST /send-code
        if method == "POST" and path.endswith("/send-code"):
            phone = body.get("phone", "").strip()
            if not phone or len(phone) < 10:
                return json_response({"error": "Неверный номер телефона"}, 400)

            code = str(random.randint(100000, 999999))
            cur.execute(
                f"INSERT INTO {SCHEMA}.sms_codes (phone, code) VALUES (%s, %s)",
                (phone, code)
            )
            db.commit()
            send_sms(phone, code)
            return json_response({"ok": True, "message": "Код отправлен"})

        # POST /verify-code
        elif method == "POST" and path.endswith("/verify-code"):
            phone = body.get("phone", "").strip()
            code = body.get("code", "").strip()
            if not phone or not code:
                return json_response({"error": "Укажите телефон и код"}, 400)

            cur.execute(
                f"""SELECT id FROM {SCHEMA}.sms_codes
                    WHERE phone=%s AND code=%s AND used=FALSE
                    AND expires_at > NOW()
                    ORDER BY created_at DESC LIMIT 1""",
                (phone, code)
            )
            row = cur.fetchone()
            if not row:
                return json_response({"error": "Неверный или истёкший код"}, 400)

            sms_id = row[0]
            cur.execute(f"UPDATE {SCHEMA}.sms_codes SET used=TRUE WHERE id=%s", (sms_id,))

            cur.execute(f"SELECT id, username, display_name, avatar_url, bio FROM {SCHEMA}.users WHERE phone=%s", (phone,))
            user = cur.fetchone()

            session_token = secrets.token_hex(32)
            is_new = False

            if user:
                cur.execute(f"UPDATE {SCHEMA}.users SET session_token=%s, is_online=TRUE, last_seen=NOW() WHERE id=%s", (session_token, user[0]))
                user_id = user[0]
                username = user[1]
                display_name = user[2]
            else:
                cur.execute(
                    f"INSERT INTO {SCHEMA}.users (phone, session_token, is_online) VALUES (%s, %s, TRUE) RETURNING id",
                    (phone, session_token)
                )
                user_id = cur.fetchone()[0]
                username = None
                display_name = None
                is_new = True

            db.commit()
            return json_response({
                "ok": True,
                "token": session_token,
                "user_id": user_id,
                "is_new": is_new,
                "username": username,
                "display_name": display_name,
            })

        # POST /setup-profile
        elif method == "POST" and path.endswith("/setup-profile"):
            if not auth_header:
                return json_response({"error": "Нет авторизации"}, 401)

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_token=%s", (auth_header,))
            user_row = cur.fetchone()
            if not user_row:
                return json_response({"error": "Неверный токен"}, 401)
            user_id = user_row[0]

            username = body.get("username", "").strip().lower()
            display_name = body.get("display_name", "").strip()
            bio = body.get("bio", "").strip()

            if not username or len(username) < 3:
                return json_response({"error": "Юзернейм минимум 3 символа"}, 400)
            if not all(c.isalnum() or c == '_' for c in username):
                return json_response({"error": "Только буквы, цифры и _"}, 400)

            cur.execute(
                f"SELECT id FROM {SCHEMA}.users WHERE username=%s AND id!=%s",
                (username, user_id)
            )
            if cur.fetchone():
                return json_response({"error": "Юзернейм уже занят"}, 409)

            cur.execute(
                f"UPDATE {SCHEMA}.users SET username=%s, display_name=%s, bio=%s WHERE id=%s",
                (username, display_name or username, bio, user_id)
            )
            db.commit()
            return json_response({"ok": True, "username": username})

        # GET /me or GET /
        elif method == "GET" and (path.endswith("/me") or path == "/"):
            if not auth_header:
                return json_response({"error": "Нет авторизации"}, 401)
            cur.execute(
                f"SELECT id, phone, username, display_name, bio, avatar_url, is_online FROM {SCHEMA}.users WHERE session_token=%s",
                (auth_header,)
            )
            u = cur.fetchone()
            if not u:
                return json_response({"error": "Не авторизован"}, 401)
            return json_response({
                "id": u[0], "phone": u[1], "username": u[2],
                "display_name": u[3], "bio": u[4], "avatar_url": u[5], "is_online": u[6]
            })

        # PUT /profile
        elif method == "PUT" and path.endswith("/profile"):
            if not auth_header:
                return json_response({"error": "Нет авторизации"}, 401)
            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE session_token=%s", (auth_header,))
            u = cur.fetchone()
            if not u:
                return json_response({"error": "Не авторизован"}, 401)
            user_id = u[0]

            display_name = body.get("display_name", "")
            bio = body.get("bio", "")
            username = body.get("username", "").strip().lower()

            if username:
                if not all(c.isalnum() or c == '_' for c in username):
                    return json_response({"error": "Только буквы, цифры и _"}, 400)
                cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username=%s AND id!=%s", (username, user_id))
                if cur.fetchone():
                    return json_response({"error": "Юзернейм занят"}, 409)
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET username=%s, display_name=%s, bio=%s WHERE id=%s",
                    (username, display_name, bio, user_id)
                )
            else:
                cur.execute(
                    f"UPDATE {SCHEMA}.users SET display_name=%s, bio=%s WHERE id=%s",
                    (display_name, bio, user_id)
                )
            db.commit()
            return json_response({"ok": True})

        # GET /search?q=... — поиск пользователей
        elif method == "GET" and path.endswith("/search"):
            qs = event.get("queryStringParameters") or {}
            q = qs.get("q", "").strip().lstrip("@").lower()
            if not q or len(q) < 2:
                return json_response({"users": []})
            cur.execute(
                f"""SELECT id, username, display_name, bio, avatar_url, is_online
                    FROM {SCHEMA}.users
                    WHERE username ILIKE %s AND username IS NOT NULL
                    LIMIT 20""",
                (f"%{q}%",)
            )
            rows = cur.fetchall()
            users = [
                {
                    "id": r[0], "username": r[1], "display_name": r[2] or r[1],
                    "bio": r[3], "avatar_url": r[4], "is_online": r[5]
                }
                for r in rows
            ]
            return json_response({"users": users})

        # GET /profile/:username
        elif method == "GET" and "/profile/" in path:
            uname = path.split("/profile/")[-1].strip().lstrip("@").lower()
            cur.execute(
                f"""SELECT id, username, display_name, bio, avatar_url, is_online
                    FROM {SCHEMA}.users WHERE username=%s""",
                (uname,)
            )
            row = cur.fetchone()
            if not row:
                return json_response({"error": "Пользователь не найден"}, 404)
            return json_response({
                "id": row[0], "username": row[1], "display_name": row[2] or row[1],
                "bio": row[3], "avatar_url": row[4], "is_online": row[5]
            })

        else:
            return json_response({"error": "Not found"}, 404)

    finally:
        cur.close()
        db.close()