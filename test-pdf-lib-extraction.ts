/**
 * Extract form fields using pdf-lib to get actual checkbox states
 * Focus on Paragraph 19 extraction
 */

import { PDFDocument, PDFCheckBox, PDFTextField, PDFDropdown, PDFRadioGroup } from 'pdf-lib';
import * as fs from 'fs/promises';

async function extractFormFieldsWithPdfLib() {
  console.log('PDF-Lib Form Field Extraction');
  console.log('==============================\n');

  try {
    // Load both PDFs to compare
    const originalPdfBytes = await fs.readFile('./sample_contract.pdf');
    const flatPdfBytes = await fs.readFile('./sample_contract_flat.pdf');

    console.log('Testing ORIGINAL PDF:');
    console.log('-'.repeat(40));
    await analyzeFormFields(originalPdfBytes, 'Original');

    console.log('\n\nTesting FLATTENED PDF:');
    console.log('-'.repeat(40));
    await analyzeFormFields(flatPdfBytes, 'Flattened');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error:', errorMessage);
  }
}

async function analyzeFormFields(pdfBytes: Uint8Array, label: string) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    
    // Get all form fields
    const fields = form.getFields();
    console.log(`\n${label} PDF: Found ${fields.length} form fields\n`);

    if (fields.length === 0) {
      console.log('No form fields found - PDF may be flattened or not contain forms');
      return;
    }

    // Categorize and display fields
    const checkboxes: string[] = [];
    const textFields: string[] = [];
    const dropdowns: string[] = [];
    const radioGroups: string[] = [];
    const otherFields: string[] = [];

    fields.forEach(field => {
      const fieldName = field.getName();
      
      if (field instanceof PDFCheckBox) {
        checkboxes.push(fieldName);
        const isChecked = field.isChecked();
        console.log(`Checkbox: "${fieldName}" = ${isChecked ? '✓ CHECKED' : '☐ unchecked'}`);
        
        // Look for paragraph 19 related fields
        if (fieldName.toLowerCase().includes('19') || 
            fieldName.toLowerCase().includes('termite') ||
            fieldName.toLowerCase().includes('para')) {
          console.log(`  ⚠️ POTENTIAL PARA 19 FIELD FOUND!`);
        }
      } else if (field instanceof PDFTextField) {
        textFields.push(fieldName);
        const text = field.getText();
        if (text) {
          console.log(`Text Field: "${fieldName}" = "${text}"`);
        }
      } else if (field instanceof PDFDropdown) {
        dropdowns.push(fieldName);
        const selected = field.getSelected();
        console.log(`Dropdown: "${fieldName}" = ${selected}`);
      } else if (field instanceof PDFRadioGroup) {
        radioGroups.push(fieldName);
        const selected = field.getSelected();
        console.log(`Radio Group: "${fieldName}" = ${selected}`);
      } else {
        otherFields.push(fieldName);
      }
    });

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('FIELD SUMMARY:');
    console.log(`- Checkboxes: ${checkboxes.length}`);
    console.log(`- Text Fields: ${textFields.length}`);
    console.log(`- Dropdowns: ${dropdowns.length}`);
    console.log(`- Radio Groups: ${radioGroups.length}`);
    console.log(`- Other: ${otherFields.length}`);

    // Search for Paragraph 19 specifically
    console.log('\n' + '='.repeat(50));
    console.log('SEARCHING FOR PARAGRAPH 19 FIELDS:');
    
    const para19Fields = fields.filter(field => {
      const name = field.getName().toLowerCase();
      return name.includes('19') || 
             name.includes('nineteen') || 
             name.includes('termite') ||
             (name.includes('para') && name.includes('19'));
    });

    if (para19Fields.length > 0) {
      console.log(`Found ${para19Fields.length} potential Para 19 fields:`);
      para19Fields.forEach(field => {
        const fieldName = field.getName();
        if (field instanceof PDFCheckBox) {
          console.log(`  - Checkbox "${fieldName}": ${field.isChecked() ? 'CHECKED' : 'unchecked'}`);
        } else if (field instanceof PDFRadioGroup) {
          console.log(`  - Radio "${fieldName}": ${field.getSelected()}`);
        } else {
          console.log(`  - ${fieldName} (${field.constructor.name})`);
        }
      });
    } else {
      console.log('No fields found with "19", "termite", or "para19" in the name');
    }

    // Try to detect patterns in field names
    console.log('\n' + '='.repeat(50));
    console.log('FIELD NAME PATTERNS:');
    
    // Group fields by common prefixes
    const prefixes = new Map<string, string[]>();
    fields.forEach(field => {
      const name = field.getName();
      const prefix = name.split(/[\._\[\]]/)[0];
      if (!prefixes.has(prefix)) {
        prefixes.set(prefix, []);
      }
      prefixes.get(prefix)!.push(name);
    });

    // Display grouped fields
    prefixes.forEach((fieldNames, prefix) => {
      if (fieldNames.length > 1) {
        console.log(`\nGroup "${prefix}":`);
        fieldNames.slice(0, 5).forEach(name => {
          console.log(`  - ${name}`);
        });
        if (fieldNames.length > 5) {
          console.log(`  ... and ${fieldNames.length - 5} more`);
        }
      }
    });

    // Save field information for analysis
    const fieldData = {
      label,
      totalFields: fields.length,
      checkboxes: checkboxes.slice(0, 20), // Limit for readability
      textFields: textFields.slice(0, 20),
      dropdowns,
      radioGroups,
      para19Fields: para19Fields.map(f => ({
        name: f.getName(),
        type: f.constructor.name,
        value: f instanceof PDFCheckBox ? f.isChecked() : 
               f instanceof PDFRadioGroup ? f.getSelected() : 
               f instanceof PDFTextField ? f.getText() : 'unknown'
      }))
    };

    const filename = `./pdf_lib_fields_${label.toLowerCase()}.json`;
    await fs.writeFile(filename, JSON.stringify(fieldData, null, 2));
    console.log(`\n✓ Field data saved to ${filename}`);

  } catch (error) {
    console.log(`Error analyzing ${label} PDF:`, error);
  }
}

// Run the extraction
console.log('Starting PDF-Lib form field extraction...\n');
extractFormFieldsWithPdfLib().catch(console.error);