from flask import Flask, send_from_directory # type: ignore
from config import Config
from models import db
from routes import register_routes
from flask_cors import CORS # type: ignore
from werkzeug.exceptions import HTTPException # type: ignore
from flask import jsonify  # type: ignore
import os


from flask import render_template



def create_app():
    app = Flask(__name__)
    # CORS MINDEN HTTP metódusra (OPTIONS, POST, GET stb.)
    CORS(app, 
         origins=["http://localhost:3000"], 
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         allow_headers=["Content-Type", "Authorization"],
         supports_credentials=True,
         expose_headers=["Content-Type"])

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        return jsonify({
            "error": e.name,
            "message": str(e.description),
            "code": e.code
        }), e.code

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "error": "Nincs ilyen endpoint",
            "code": 404
        }), 404

    app.config.from_object(Config)

    # SQLAlchemy inicializálás
    db.init_app(app)

    @app.route("/")
    def home():
        return "Welcome to the StudyBuddy API!"

    @app.route("/test-ui")
    def test_ui():
        return "<h1>Backend működik!</h1>"

    @app.route("/test")
    def test_page():
        return render_template("test.html")
    
    # Fájl letöltési endpoint
    @app.route("/uploads/<path:folder>/<path:filename>")
    def uploaded_file(folder, filename):
        uploads_dir = os.path.join(Config.UPLOAD_FOLDER, folder)
        return send_from_directory(uploads_dir, filename)
    
    # Route-ok regisztrálása külön file-ból
    register_routes(app)

    # Adatbázis létrehozása, ha nem létezik
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)