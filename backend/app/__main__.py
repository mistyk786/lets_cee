"""CLI entry point for deployment health checks and local verification.

Examples:
    python -m app health
    python -m app analyze --demo
    python -m app analyze --demo --pretty
"""

from __future__ import annotations

import argparse
import json
import logging
import sys

from app.config import get_settings
from app.engine import SlothEngine


def _configure_logging(level: str) -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


def _cmd_health(engine: SlothEngine) -> int:
    health = engine.health()
    print(json.dumps(health.model_dump(), indent=2))
    return 0  # "degraded" (no OpenAI key) is still a runnable state


def _cmd_analyze(engine: SlothEngine, args: argparse.Namespace) -> int:
    email_threads: list[dict] = []
    if args.threads_file:
        with open(args.threads_file, encoding="utf-8") as handle:
            payload = json.load(handle)
        email_threads = payload.get("email_threads", payload)

    if args.demo:
        result = engine.demo_analysis()
    else:
        result = engine.analyze(
            email_threads,
            demo_mode=args.demo_mode,
            auto_forecast=args.auto_forecast,
        )

    indent = 2 if args.pretty else None
    print(json.dumps(result.model_dump(), indent=indent))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="sloth-engine",
        description="Sloth.ai AI/scoring engine CLI",
    )
    parser.add_argument(
        "--log-level",
        default=None,
        help="Override LOG_LEVEL (default: from environment)",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("health", help="Print engine health as JSON")

    analyze_parser = subparsers.add_parser(
        "analyze",
        help="Run workflow analysis and print JSON",
    )
    analyze_parser.add_argument(
        "--demo",
        action="store_true",
        help="Return the full bundled demo analysis",
    )
    analyze_parser.add_argument(
        "--demo-mode",
        action="store_true",
        help="Skip OpenAI and use demo workflow extraction",
    )
    analyze_parser.add_argument(
        "--auto-forecast",
        action="store_true",
        help="Derive forecast metrics from detected workflow steps",
    )
    analyze_parser.add_argument(
        "--threads-file",
        help="Path to JSON file containing email_threads",
    )
    analyze_parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output",
    )

    args = parser.parse_args(argv)
    settings = get_settings()
    _configure_logging(args.log_level or settings.log_level)

    engine = SlothEngine(settings=settings)

    if args.command == "health":
        return _cmd_health(engine)
    if args.command == "analyze":
        return _cmd_analyze(engine, args)

    parser.error(f"Unknown command: {args.command}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
