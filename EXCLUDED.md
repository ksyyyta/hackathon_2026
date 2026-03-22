# Excluded from Optimized Copy (proekt-optimized-500mb)

This optimized copy excludes the following to stay under 500 MB:

## Excluded Directories

| Directory    | Reason                              | Restore Command            |
|-------------|--------------------------------------|----------------------------|
| node_modules| NPM dependencies (~440 MB)           | npm install                |
| .next       | Next.js build cache (~679 MB)        | npm run build              |
| __pycache__ | Python bytecode cache                | Recreated on Python run    |
| venv        | Python virtual environment           | python -m venv venv        |
| .git        | Git version control history          | git clone (if needed)      |

## Excluded Files

| Pattern | Reason                    |
|---------|---------------------------|
| *.pyc   | Python compiled bytecode  |

## Original vs Optimized Size

- Original total: ~1,120 MB
- .next: 679 MB
- node_modules: 440 MB
- Optimized: ~1.3 MB (source + configs only)
