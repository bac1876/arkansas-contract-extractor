/**
 * Test pdf-lib to extract form field values from page 1
 */

import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';

async function extractPage1FormFields() {
  console.log('Testing pdf-lib Form Field Extraction - Page 1 Only');
  console.log('==================================================\n');

  try {
    // Load the PDF - will use page1.pdf when available
    const pdfPath = './page1.pdf';
    console.log(`Loading PDF: ${pdfPath}`);
    
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Get the form
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`Found ${fields.length} form fields in the PDF\n`);
    
    // Extract all field information
    const fieldData: any[] = [];
    
    fields.forEach((field, index) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      
      let fieldValue: any = null;
      let fieldInfo: any = {
        index,
        name: fieldName,
        type: fieldType
      };
      
      // Handle different field types
      if (fieldType === 'PDFCheckBox') {
        const checkBox = form.getCheckBox(fieldName);
        fieldInfo.isChecked = checkBox.isChecked();
        fieldValue = checkBox.isChecked() ? 'CHECKED' : 'UNCHECKED';
      } 
      else if (fieldType === 'PDFTextField') {
        const textField = form.getTextField(fieldName);
        fieldValue = textField.getText();
        fieldInfo.value = fieldValue;
      }
      else if (fieldType === 'PDFRadioGroup') {
        const radioGroup = form.getRadioGroup(fieldName);
        fieldValue = radioGroup.getSelected();
        fieldInfo.selected = fieldValue;
        fieldInfo.options = radioGroup.getOptions();
      }
      else if (fieldType === 'PDFDropdown') {
        const dropdown = form.getDropdown(fieldName);
        fieldValue = dropdown.getSelected();
        fieldInfo.selected = fieldValue;
        fieldInfo.options = dropdown.getOptions();
      }
      
      fieldData.push(fieldInfo);
      
      // Display field info
      console.log(`Field #${index + 1}:`);
      console.log(`  Name: ${fieldName || '(unnamed)'}`);
      console.log(`  Type: ${fieldType}`);
      console.log(`  Value: ${fieldValue || '(empty)'}`);
      console.log('');
    });
    
    // Look specifically for loan type fields
    console.log('\n=== SEARCHING FOR LOAN TYPE FIELDS ===\n');
    
    const loanKeywords = ['loan', 'type', 'financing', 'fha', 'va', 'conventional', 'usda'];
    const relevantFields = fieldData.filter(field => {
      const name = (field.name || '').toLowerCase();
      return loanKeywords.some(keyword => name.includes(keyword));
    });
    
    if (relevantFields.length > 0) {
      console.log('Found potential loan type fields:');
      relevantFields.forEach(field => {
        console.log(`  - ${field.name}: ${field.isChecked !== undefined ? (field.isChecked ? 'CHECKED' : 'UNCHECKED') : field.value || field.selected || '(empty)'}`);
      });
    } else {
      console.log('No fields with loan-related names found.');
      console.log('Checking for checkbox patterns in field names...\n');
      
      // Look for any checked checkboxes
      const checkedBoxes = fieldData.filter(field => 
        field.type === 'PDFCheckBox' && field.isChecked === true
      );
      
      if (checkedBoxes.length > 0) {
        console.log(`Found ${checkedBoxes.length} CHECKED checkboxes:`);
        checkedBoxes.forEach(field => {
          console.log(`  ✓ ${field.name || '(unnamed field)'}`);
        });
      } else {
        console.log('No checked checkboxes found.');
      }
    }
    
    // Save results to JSON for analysis
    const results = {
      totalFields: fields.length,
      fields: fieldData,
      checkedCheckboxes: fieldData.filter(f => f.type === 'PDFCheckBox' && f.isChecked),
      textFields: fieldData.filter(f => f.type === 'PDFTextField' && f.value),
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile('./page1_form_fields.json', JSON.stringify(results, null, 2));
    console.log('\n✓ Results saved to page1_form_fields.json');
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total fields: ${results.totalFields}`);
    console.log(`Checked checkboxes: ${results.checkedCheckboxes.length}`);
    console.log(`Text fields with values: ${results.textFields.length}`);
    
  } catch (error) {
    console.error('Error extracting form fields:', error);
    
    // If no form fields, try alternate approach
    if (error instanceof Error && error.message.includes('No form')) {
      console.log('\n⚠️  This PDF may not have interactive form fields.');
      console.log('The checkboxes might be static graphics rather than form elements.');
      console.log('Alternative approaches needed:\n');
      console.log('  1. Use OCR to detect checkbox symbols');
      console.log('  2. Use GPT-4 Vision to analyze the page image');
      console.log('  3. Look for text patterns that indicate selection');
    }
  }
}

// Run the extraction
console.log('Starting form field extraction...\n');
extractPage1FormFields().catch(console.error);