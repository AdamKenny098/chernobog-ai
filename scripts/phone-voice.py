import io
import os
import threading
import wave

from flask import Flask, jsonify, request, Response
from faster_whisper import WhisperModel
from piper import PiperVoice
from werkzeug.serving import make_server

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 12 * 1024 * 1024
model_root = os.environ.get('CHERNOBOG_VOICE_MODELS', '/opt/chernobog-voice/models')
recognizer = WhisperModel(os.path.join(model_root, 'whisper'), device='cpu', compute_type='int8', cpu_threads=4)
voice = PiperVoice.load(os.path.join(model_root, 'en_US-lessac-medium.onnx'))
lock = threading.Lock()


@app.get('/health')
def health():
    return jsonify(ok=True)


@app.post('/transcribe')
def transcribe():
    audio = request.files.get('audio')
    if audio is None:
        return jsonify(error='Audio is required'), 400
    if not lock.acquire(blocking=False):
        return jsonify(error='Speech service is busy'), 429
    try:
        segments, _ = recognizer.transcribe(io.BytesIO(audio.read()), language='en', beam_size=1)
        transcript = ' '.join(segment.text.strip() for segment in segments).strip()
        return jsonify(transcript=transcript) if transcript else (jsonify(error='No speech detected'), 422)
    finally:
        lock.release()


@app.post('/speak')
def speak():
    body = request.get_json(silent=True) or {}
    text = body.get('text')
    if not isinstance(text, str) or not text.strip() or len(text) > 8000:
        return jsonify(error='Speech text must contain 1 to 8000 characters'), 400
    if not lock.acquire(blocking=False):
        return jsonify(error='Speech service is busy'), 429
    try:
        audio = io.BytesIO()
        with wave.open(audio, 'wb') as output:
            voice.synthesize_wav(text, output)
        return Response(audio.getvalue(), mimetype='audio/wav', headers={'Cache-Control': 'no-store'})
    finally:
        lock.release()


if __name__ == '__main__':
    make_server('127.0.0.1', 3194, app, threaded=True).serve_forever()
