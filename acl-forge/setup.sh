#!/bin/bash
set -e

BOLD="\033[1m"
RED="\033[31m"
GOLD="\033[33m"
GREEN="\033[32m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}${RED}  ╔═══════════════════════════╗${RESET}"
echo -e "${BOLD}${RED}  ║   ACL FORGE — SETUP       ║${RESET}"
echo -e "${BOLD}${RED}  ╚═══════════════════════════╝${RESET}"
echo ""

# ── 1. Check prerequisites ────────────────────────────────
echo -e "${GOLD}[1/6] Checking prerequisites...${RESET}"

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org (v18+)${RESET}"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker not found. Install from https://docker.com${RESET}"
  exit 1
fi

if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null 2>&1; then
  if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose not found. Update Docker Desktop to get it.${RESET}"
    exit 1
  fi
fi

echo -e "${GREEN}✓ Node $(node --version), Docker found${RESET}"

# ── 2. Create .env if missing ─────────────────────────────
echo ""
echo -e "${GOLD}[2/6] Setting up environment...${RESET}"

if [ ! -f .env ]; then
  cp .env.local.example .env

  # Auto-generate NEXTAUTH_SECRET
  if command -v openssl &> /dev/null; then
    SECRET=$(openssl rand -base64 32)
    sed -i.bak "s|replace-with-output-of-openssl-rand-base64-32|${SECRET}|g" .env
    rm -f .env.bak
    echo -e "${GREEN}✓ .env created with auto-generated secret${RESET}"
  else
    echo -e "${GREEN}✓ .env created — set NEXTAUTH_SECRET manually${RESET}"
  fi
else
  echo -e "${GREEN}✓ .env already exists${RESET}"
fi

# ── 3. Check for Anthropic API key ───────────────────────
echo ""
echo -e "${GOLD}[3/6] Checking Anthropic API key...${RESET}"

if grep -q 'sk-ant-' .env; then
  echo -e "${GREEN}✓ Anthropic API key found${RESET}"
else
  echo ""
  echo -e "${BOLD}Your Anthropic API key is required for AI features.${RESET}"
  echo -e "Get one free at: ${GOLD}https://console.anthropic.com/settings/keys${RESET}"
  echo ""
  read -r -p "Paste your Anthropic API key (sk-ant-...): " ANTHROPIC_KEY
  if [ -n "$ANTHROPIC_KEY" ]; then
    sed -i.bak "s|sk-ant-...|${ANTHROPIC_KEY}|g" .env
    rm -f .env.bak
    echo -e "${GREEN}✓ API key saved${RESET}"
  else
    echo -e "${RED}⚠ Skipped — AI features won't work until you add ANTHROPIC_API_KEY to .env${RESET}"
  fi
fi

# ── 4. Start Docker services ──────────────────────────────
echo ""
echo -e "${GOLD}[4/6] Starting Postgres, Redis, MinIO...${RESET}"

if docker compose version &> /dev/null 2>&1; then
  docker compose up -d --quiet-pull
else
  docker-compose up -d --quiet-pull
fi

echo -e "${GREEN}✓ Services started${RESET}"
echo "  • Postgres  → localhost:5432"
echo "  • Redis     → localhost:6379"
echo "  • MinIO S3  → localhost:9000  (console: localhost:9001)"

# Wait for Postgres to be ready
echo ""
echo -e "${GOLD}Waiting for Postgres to be ready...${RESET}"
for i in {1..20}; do
  if docker exec $(docker compose ps -q postgres 2>/dev/null || docker-compose ps -q postgres) pg_isready -U forge &> /dev/null 2>&1; then
    break
  fi
  sleep 1
done
echo -e "${GREEN}✓ Postgres ready${RESET}"

# ── 5. Install dependencies & push schema ─────────────────
echo ""
echo -e "${GOLD}[5/6] Installing packages & setting up database...${RESET}"
npm install --silent
npx prisma db push --skip-generate
echo -e "${GREEN}✓ Database schema applied${RESET}"

# ── 6. Done ───────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}[6/6] All done!${RESET}"
echo ""
echo -e "${BOLD}${RED}┌─────────────────────────────────────────┐${RESET}"
echo -e "${BOLD}${RED}│  ACL FORGE is ready to run              │${RESET}"
echo -e "${BOLD}${RED}└─────────────────────────────────────────┘${RESET}"
echo ""
echo -e "Run the app:  ${BOLD}npm run dev${RESET}"
echo -e "Then open:   ${GOLD}http://localhost:3000${RESET}"
echo ""
echo -e "Run the worker (new terminal):  ${BOLD}npx ts-node src/lib/worker.ts${RESET}"
echo -e "(Worker handles video processing & exports)"
echo ""
echo -e "MinIO console (file browser):   ${GOLD}http://localhost:9001${RESET}"
echo -e "  Login: ${BOLD}minioadmin / minioadmin${RESET}"
echo ""
