#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# interview-coach-backend / setup.sh
# Run once from the project root in WSL2 to bootstrap the backend.
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo ""
echo "══════════════════════════════════════════════"
echo "  Interview Coach — Backend Setup"
echo "══════════════════════════════════════════════"
echo ""

# ── 1. Virtual environment ────────────────────────────────────────────────────
if [ ! -d ".venv" ]; then
  echo "▶ Creating virtual environment..."
  python3 -m venv .venv
fi

echo "▶ Activating virtual environment..."
source .venv/bin/activate

# ── 2. Install dependencies ───────────────────────────────────────────────────
echo "▶ Installing Python dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "✅ Dependencies installed"

# ── 3. .env file ─────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "▶ Creating .env from .env.example..."
  cp .env.example .env

  # Auto-generate a secure JWT secret
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
  sed -i "s/REPLACE_ME_WITH_A_64_CHAR_HEX_STRING/$SECRET/" .env
  echo "✅ .env created with auto-generated JWT_SECRET_KEY"
else
  echo "⏭  .env already exists, skipping"
fi

# ── 4. PostgreSQL database ────────────────────────────────────────────────────
echo ""
echo "▶ Setting up PostgreSQL database..."

# Start PostgreSQL if it's not running (Ubuntu/WSL2)
if ! pg_isready -q 2>/dev/null; then
  echo "  Starting PostgreSQL service..."
  sudo service postgresql start
fi

# Read DB URL from .env
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)
DB_NAME=$(echo "$DB_URL" | sed 's/.*\///')

echo "  Creating database '$DB_NAME' if it doesn't exist..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "  (database already exists)"

echo "✅ PostgreSQL ready"

# ── 5. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  To start the dev server:"
echo "    source .venv/bin/activate"
echo "    uvicorn main:app --reload --port 8000"
echo ""
echo "  API docs: http://localhost:8000/docs"
echo "══════════════════════════════════════════════"
echo ""
