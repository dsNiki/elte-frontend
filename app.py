from flask import Flask, request, jsonify
from models import db, User
from config import Config
import re
import bcrypt

app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

# Email minta: csak ELTE
ELTE_EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@(student\.elte\.hu|elte\.hu)$"

@app.route("/register", methods=["POST"])
def register():
    data = request.json

    email = data.get("email")
    password = data.get("password")

    # 1. Ellenőrzés: email formátum
    if not re.match(ELTE_EMAIL_REGEX, email):
        return jsonify({"error": "Csak ELTE-s email használható!"}), 400

    # 2. Már létezik?
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Ez az email már regisztrálva van!"}), 400

    # 3. Jelszó hash-elés
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode()

    # 4. Mentés adatbázisba
    new_user = User(email=email, password_hash=password_hash)
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

    # Jelszó ellenőrzés
    if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode()):
        return jsonify({"error": "Hibás email vagy jelszó!"}), 401

    return jsonify({"message": "Sikeres bejelentkezés!", "user_id": user.id}), 200


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)
