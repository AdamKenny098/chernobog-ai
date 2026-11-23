FROM python:3.12-slim
RUN pip install --no-cache-dir faster-whisper==1.2.1 piper-tts==1.3.0 Flask==3.1.2 av==15.1.0
WORKDIR /opt/chernobog-voice/models
RUN python -m piper.download_voices en_US-lessac-medium && python -c 'from huggingface_hub import snapshot_download; snapshot_download("Systran/faster-whisper-base.en", local_dir="whisper")'
COPY scripts/phone-voice.py /opt/chernobog-voice/phone-voice.py
ENV HF_HUB_OFFLINE=1 HOME=/tmp
USER 65534:65534
CMD ["python", "/opt/chernobog-voice/phone-voice.py"]
