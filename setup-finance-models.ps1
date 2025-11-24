# Setup Finance Models Script
# This script will:
# 1. Generate Prisma Client with new finance models
# 2. Create database migration
# 3. Provide instructions to restart API server

Write-Host "🔧 Setting up Finance Models..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Generate Prisma Client
Write-Host "Step 1: Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Prisma generation failed. Make sure the API server is stopped." -ForegroundColor Red
    Write-Host "   Please stop the API server and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Prisma Client generated successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Create Migration
Write-Host "Step 2: Creating database migration..." -ForegroundColor Yellow
Write-Host "   This will create the BudgetCategory, BudgetEntry, CashFlowEntry, and PettyCashTransaction tables" -ForegroundColor Gray
npm run prisma:migrate -- --name add_finance_models
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Migration creation had issues. Check the output above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your API server: npm run dev:api" -ForegroundColor White
Write-Host "2. The finance endpoints should now be available:" -ForegroundColor White
Write-Host "   - GET /api/portal/budget-categories" -ForegroundColor Gray
Write-Host "   - GET /api/portal/budget-entries" -ForegroundColor Gray
Write-Host "   - GET /api/portal/cash-flow" -ForegroundColor Gray
Write-Host "   - GET /api/portal/petty-cash" -ForegroundColor Gray

