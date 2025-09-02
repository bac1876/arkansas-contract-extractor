import { ListingInfoService } from './listing-info-service';
import { SellerNetSheetCalculator } from './seller-net-sheet-calculator';
import * as dotenv from 'dotenv';

dotenv.config();

async function diagnoseTaxFlow() {
  console.log('🔍 DIAGNOSING TAX DATA FLOW\n');
  console.log('=' .repeat(60));
  
  // Test property address
  const testAddress = '1615 N John Miller Rogers, AR 727258';
  console.log(`Test Property: ${testAddress}\n`);
  
  // Step 1: Initialize and check listing service
  console.log('STEP 1: Loading Google Sheets Data');
  console.log('-'.repeat(40));
  const listingService = new ListingInfoService();
  await listingService.initialize();
  
  // Step 2: Look up property data
  console.log('\nSTEP 2: Looking up Property Data');
  console.log('-'.repeat(40));
  const propertyData = listingService.getPropertyData(testAddress, {
    taxes: 2000, // Default value
    commission: 0.03
  });
  
  console.log('Property Data Retrieved:');
  console.log(`  Annual Taxes: $${propertyData.annualTaxes}`);
  console.log(`  Commission: ${(propertyData.commissionPercent * 100).toFixed(1)}%`);
  console.log(`  Source: ${propertyData.source}`);
  console.log(`  Tax Warning: ${propertyData.taxWarning}`);
  
  // Step 3: Calculate with net sheet calculator
  console.log('\nSTEP 3: Net Sheet Calculator Processing');
  console.log('-'.repeat(40));
  
  const calculator = new SellerNetSheetCalculator();
  const contractData = {
    propertyAddress: testAddress,
    salesPrice: 250000,
    closingDate: new Date('2025-10-15'),
    buyerConcessions: 5000,
    buyerAgencyFees: 5000,
    sellingAgentCommission: propertyData.commissionPercent,
    closingFee: 400,
    titleSearchFee: 300,
    titleInsuranceFee: 725,
    titleRecordingFees: 100,
    pestTransferFee: 450,
    homeWarrantyAmount: 6955,
    annualTaxes: propertyData.annualTaxes
  };
  
  console.log('Contract Data Being Passed:');
  console.log(`  Annual Taxes: $${contractData.annualTaxes}`);
  console.log(`  Commission: ${(contractData.sellingAgentCommission * 100).toFixed(1)}%`);
  
  // Calculate prorated taxes directly
  const currentDate = new Date();
  const closingDate = new Date('2025-10-15');
  const startOfYear = new Date(closingDate.getFullYear(), 0, 1);
  const endOfYear = new Date(closingDate.getFullYear(), 11, 31);
  
  const daysInYear = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysFromYearStart = Math.floor((closingDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dailyTaxRate = contractData.annualTaxes / daysInYear;
  const proratedTaxes = dailyTaxRate * daysFromYearStart;
  
  console.log('\nTax Calculation Details:');
  console.log(`  Days in Year: ${daysInYear}`);
  console.log(`  Days from Year Start to Closing: ${daysFromYearStart}`);
  console.log(`  Daily Tax Rate: $${dailyTaxRate.toFixed(2)}`);
  console.log(`  Prorated Taxes: $${proratedTaxes.toFixed(2)}`);
  
  // Generate the net sheet
  const netSheet = await calculator.calculateNetSheet(contractData);
  
  console.log('\nSTEP 4: Final Net Sheet Values');
  console.log('-'.repeat(40));
  console.log(`  Sales Price: $${netSheet.salesPrice.toLocaleString()}`);
  console.log(`  Prorated Taxes: $${netSheet.proratedTaxes.toFixed(2)}`);
  console.log(`  Commission: $${netSheet.sellerCommission.toFixed(2)}`);
  console.log(`  Total Costs: $${netSheet.totalCosts.toFixed(2)}`);
  console.log(`  Net to Seller: $${netSheet.netToSeller.toFixed(2)}`);
  
  // Check what's in the CSV output
  console.log('\nSTEP 5: CSV Output Check');
  console.log('-'.repeat(40));
  const csvLines = netSheet.csvContent.split('\n');
  const taxLine = csvLines.find(line => line.includes('Taxes Prorated'));
  console.log(`Tax line in CSV: ${taxLine}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSIS COMPLETE');
}

diagnoseTaxFlow().catch(console.error);