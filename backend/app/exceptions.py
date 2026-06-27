"""Domain exceptions for the Sloth.ai scoring engine."""

from __future__ import annotations


class SlothEngineError(Exception):
    """Base error for the scoring engine."""


class ConfigurationError(SlothEngineError):
    """Raised when required configuration is missing or invalid."""


class WorkflowExtractionError(SlothEngineError):
    """Raised when workflow extraction fails and fallback is disabled."""
