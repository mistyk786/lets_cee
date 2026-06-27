"""Tests for CORS origin parsing."""

from __future__ import annotations

from app.config import Settings, reset_settings_cache


def test_cors_origin_list_defaults_without_env():
    reset_settings_cache()
    settings = Settings(cors_origins=None, environment="test")
    origins = settings.cors_origin_list()
    assert "http://localhost:5173" in origins
    assert "http://127.0.0.1:5174" in origins


def test_cors_origin_list_merges_production_urls():
    reset_settings_cache()
    settings = Settings(
        cors_origins="https://sloth.vercel.app, https://app.example.com",
        environment="test",
    )
    origins = settings.cors_origin_list()
    assert "https://sloth.vercel.app" in origins
    assert "https://app.example.com" in origins
    assert "http://localhost:5173" in origins
