from pathlib import Path

# Watchfiles configuration
WATCH_PATHS = [
    Path(__file__).parent.resolve(),  # backend directory
]

WATCH_EXCLUDE = [
    "*.pyc",
    "*.log",
    "__pycache__",
    ".git",
    "*.tmp",
    "*.temp"
]

WATCH_INCLUDE = [
    "*.py",
    "*.json",
    "*.yaml",
    "*.yml"
]
