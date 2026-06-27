#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# interview-coach-frontend / setup.sh
# Run once from the project root in WSL2.
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo ""
echo "══════════════════════════════════════════════"
echo "  Interview Coach — Frontend Setup"
echo "══════════════════════════════════════════════"
echo ""

# ── 1. Node version check ─────────────────────────────────────────────────────
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js 18+ is required. Found: $(node -v)"
  exit 1
fi
echo "✅ Node.js $(node -v) detected"

# ── 2. Install dependencies ───────────────────────────────────────────────────
echo "▶ Installing npm dependencies..."
npm install
echo "✅ Dependencies installed"

# ── 3. .env.local ─────────────────────────────────────────────────────────────
if [ ! -f ".env.local" ]; then
  cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
  echo "✅ .env.local created"
else
  echo "⏭  .env.local already exists, skipping"
fi

# ── 4. Shadcn/ui init (optional — run manually if you want full component library)
echo ""
echo "══════════════════════════════════════════════"
echo "  Setup complete!"
echo ""
echo "  To start the dev server:"
echo "    npm run dev"
echo ""
echo "  App: http://localhost:3000"
echo "══════════════════════════════════════════════"
echo ""
