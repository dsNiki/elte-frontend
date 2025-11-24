from flask import request, jsonify
from models import db, User
import re
import bcrypt
import jwt
from datetime import datetime, timedelta
from config import Config

# Email minta
ELTE_EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@(student\.elte\.hu|elte\.hu)$"


def create_jwt_token(user_id):
    expiration = datetime.utcnow() + timedelta(hours=1)
    payload = {
        "user_id": user_id,
        "exp": expiration
    }

    token = jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")
    return token


def verify_jwt_token(token):
    try:
        data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        return data
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def register_routes(app):

    @app.route("/register", methods=["POST"])
    def register():
        data = request.json

        email = data.get("email")
        password = data.get("password")
        major = data.get("major")  # <-- EZ LETT A NEVE
        bio = data.get("bio")      # <-- EZ LETT A NEVE
        avatar_url = data.get("avatar_url")  # opcionális

        if not re.match(ELTE_EMAIL_REGEX, email):
            return jsonify({"error": "Csak ELTE-s email használható!"}), 400

        if not major:
            return jsonify({"error": "A szak megadása kötelező!"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Ez az email már regisztrálva van!"}), 400

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode()

        new_user = User(
            email=email,
            password_hash=password_hash,
            major=major,
            bio=bio,
            avatar_url=avatar_url
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({"message": "Sikeres regisztráció!", "user_id": new_user.id}), 201

    @app.route("/login", methods=["POST"])
    def login():
        data = request.json
        email = data.get("email")
        password = data.get("password")

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({"error": "Hibás email vagy jelszó!"}), 401

        if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode()):
            return jsonify({"error": "Hibás email vagy jelszó!"}), 401

        token = create_jwt_token(user.id)

        return jsonify({"message": "Sikeres bejelentkezés!", "token": token}), 200

    @app.route("/profile", methods=["GET"])
    def profile():
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Hiányzó Authorization header"}), 401

        try:
            token = auth_header.split(" ")[1]
        except:
            return jsonify({"error": "Hibás Authorization formátum"}), 401

        decoded = verify_jwt_token(token)

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user = User.query.get(decoded["user_id"])

        return jsonify({
            "email": user.email,
            "major": user.major,
            "bio": user.bio,
            "avatar_url": user.avatar_url
        })

