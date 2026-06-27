FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    SLOTH_ENV=production

WORKDIR /service

COPY pyproject.toml README.md ./
COPY app ./app

RUN pip install .

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -m app health || exit 1

ENTRYPOINT ["python", "-m", "app"]
CMD ["health"]
