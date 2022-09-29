from flask import Flask
from flask import send_from_directory

app = Flask(__name__)

@app.route('/')
def response():
    return send_from_directory('', 'index.html')
