# Setup Finance Models Script
# This script will:
# 1. Generate Prisma Client with finance models
# 2. Create database migration
# 3. Provide next steps for the portal app

Write-Host "Setting up Finance Models..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Generate Prisma Client
Write-Host "Step 1: Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Prisma generation failed. Make sure no process is locking schema files and try again." -ForegroundColor Red
    exit 1
}

Write-Host "Prisma Client generated successfully." -ForegroundColor Green
Write-Host ""

# Step 2: Create Migration
Write-Host "Step 2: Creating database migration..." -ForegroundColor Yellow
Write-Host "   This creates BudgetCategory, BudgetEntry, CashFlowEntry, and PettyCashTransaction tables." -ForegroundColor Gray
npm run prisma:migrate -- --name add_finance_models
if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration creation had issues. Check the output above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your portal app: npm run dev:portal" -ForegroundColor White
Write-Host "2. Finance routes are available in portal under /api/portal/*" -ForegroundColor White
