/**
 * Updated JavaScript for Arkansas Contract Extractor
 * Handles 37 fields with grouped display
 */

let currentData = null;
let currentFilename = null;

// Field groupings for organized display
const fieldGroups = {
    property: [
        { key: 'buyers', label: 'Buyers' },
        { key: 'property_address', label: 'Property Address' },
        { key: 'property_type', label: 'Property Type' }
    ],
    financial: [
        { key: 'purchase_type', label: 'Purchase Type' },
        { key: 'purchase_price', label: 'Purchase Price' },
        { key: 'cash_amount', label: 'Cash Amount' },
        { key: 'loan_type', label: 'Loan Type' },
        { key: 'earnest_money', label: 'Earnest Money' },
        { key: 'earnest_money_amount', label: 'Earnest Money Amount' },
        { key: 'non_refundable', label: 'Non-refundable' },
        { key: 'non_refundable_amount', label: 'Non-refundable Amount' },
        { key: 'seller_concessions', label: 'Seller Concessions' }
    ],
    terms: [
        { key: 'title_option', label: 'Title (Para 10)' },
        { key: 'survey_option', label: 'Survey (Para 11)' },
        { key: 'survey_details', label: 'Survey Details' },
        { key: 'contingency', label: 'Contingency (Para 14)' },
        { key: 'contingency_details', label: 'Contingency Details' },
        { key: 'home_warranty', label: 'Home Warranty (Para 15)' },
        { key: 'warranty_amount', label: 'Warranty Amount' },
        { key: 'warranty_details', label: 'Warranty Details' },
        { key: 'inspection_option', label: 'Inspection (Para 16)' },
        { key: 'wood_infestation', label: 'Wood Infestation (Para 18)' },
        { key: 'termite_option', label: 'Termite (Para 19)' },
        { key: 'lead_paint_option', label: 'Lead Paint (Para 20)' },
        { key: 'para32_other_terms', label: 'Other Terms (Para 32)' }
    ],
    dates: [
        { key: 'contract_date', label: 'Contract Date' },
        { key: 'closing_date', label: 'Closing Date' },
        { key: 'acceptance_date', label: 'Acceptance Date' },
        { key: 'possession_option', label: 'Possession' },
        { key: 'possession_details', label: 'Possession Details' }
    ],
    para13: [
        { key: 'para13_items_included', label: 'Items Included (convey with property)' },
        { key: 'para13_items_excluded', label: 'Items Excluded (don\'t convey)' }
    ],
    agent: [
        { key: 'selling_agent_name', label: 'Selling Agent Name' },
        { key: 'selling_agent_license', label: 'Agent License #' },
        { key: 'selling_agent_email', label: 'Agent Email' },
        { key: 'selling_agent_phone', label: 'Agent Phone' }
    ]
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // File input
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const dropZone = document.getElementById('dropZone');
    
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
}

function handleFileSelect(e) {
    handleFiles(e.target.files);
}

function handleFiles(files) {
    if (files.length === 0) return;
    
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    for (let file of files) {
        if (file.type !== 'application/pdf') {
            showError('Please select PDF files only');
            return;
        }
        
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-name">${file.name}</span>
            <span class="file-size">${(file.size / 1024).toFixed(1)} KB</span>
            <button onclick="extractFile('${file.name}')" class="extract-btn">Extract</button>
        `;
        fileList.appendChild(fileItem);
    }
    
    // Auto-extract if single file
    if (files.length === 1) {
        extractFile(files[0]);
    }
}

async function extractFile(file) {
    const fileInput = document.getElementById('fileInput');
    const actualFile = file instanceof File ? file : fileInput.files[0];
    
    if (!actualFile) {
        showError('No file selected');
        return;
    }
    
    showLoading();
    hideError();
    hideResults();
    
    const formData = new FormData();
    formData.append('contract', actualFile);
    
    try {
        const response = await fetch('/api/extract', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Extraction failed');
        }
        
        hideLoading();
        displayResults(result);
        
    } catch (error) {
        hideLoading();
        showError(error.message || 'Failed to extract contract data');
    }
}

function displayResults(result) {
    currentData = result.data;
    currentFilename = result.filename;
    
    // Show net sheet summary if available
    if (result.netSheet) {
        displayNetSheetSummary(result.netSheet);
    }
    
    // Show summary card
    displaySummary(result.data);
    
    // Update stats
    document.getElementById('fileName').textContent = result.filename;
    document.getElementById('extractionRate').textContent = result.extractionRate;
    document.getElementById('fieldsCount').textContent = `${result.fieldsExtracted}/${result.totalFields}`;
    document.getElementById('extractionCost').textContent = result.estimatedCost || '$0.14';
    
    // Display grouped fields
    displayGroupedFields(result.data);
    
    // Display all fields
    displayAllFields(result.data);
    
    // Display JSON
    document.getElementById('jsonContent').textContent = JSON.stringify(result.data, null, 2);
    
    // Display CSV
    document.getElementById('csvContent').textContent = result.csv || generateCSV(result.data);
    
    // Show results section
    document.getElementById('results').style.display = 'block';
}

function displayNetSheetSummary(netSheet) {
    // Create net sheet summary element if it doesn't exist
    let netSheetDiv = document.getElementById('netSheetSummary');
    if (!netSheetDiv) {
        netSheetDiv = document.createElement('div');
        netSheetDiv.id = 'netSheetSummary';
        netSheetDiv.style.cssText = 'background: #d4edda; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid #28a745;';
        
        // Insert before the summary card
        const summaryCard = document.getElementById('summaryCard');
        summaryCard.parentNode.insertBefore(netSheetDiv, summaryCard);
    }
    
    const netPercent = ((netSheet.cash_to_seller / netSheet.sales_price * 100) || 0).toFixed(2);
    
    netSheetDiv.innerHTML = `
        <h3 style="color: #155724; margin-bottom: 15px;">💰 Seller Net Sheet Summary</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div>
                <strong>Sales Price:</strong><br>
                $${netSheet.sales_price?.toLocaleString() || 0}
            </div>
            <div>
                <strong>Total Costs:</strong><br>
                $${netSheet.total_costs?.toLocaleString() || 0}
            </div>
            <div>
                <strong>Net to Seller:</strong><br>
                <span style="font-size: 1.2em; color: #155724; font-weight: bold;">
                    $${netSheet.cash_to_seller?.toLocaleString() || 0}
                </span>
            </div>
            <div>
                <strong>Net Percentage:</strong><br>
                ${netPercent}%
            </div>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #c3e6cb;">
            <details>
                <summary style="cursor: pointer; color: #155724; font-weight: bold;">View Detailed Breakdown</summary>
                <div style="margin-top: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 0.9em;">
                    <div>Seller Concessions: $${netSheet.seller_concessions?.toLocaleString() || 0}</div>
                    <div>Commission: $${netSheet.commission_seller?.toLocaleString() || 0}</div>
                    <div>Title Insurance: $${netSheet.title_insurance?.toLocaleString() || 0}</div>
                    <div>Home Warranty: $${netSheet.home_warranty?.toLocaleString() || 0}</div>
                    <div>Prorated Taxes: $${netSheet.taxes_prorated?.toLocaleString() || 0}</div>
                    <div>Other Fees: $${((netSheet.closing_fee || 0) + (netSheet.title_search || 0) + (netSheet.pest_transfer || 0))?.toLocaleString()}</div>
                </div>
            </details>
        </div>
    `;
}

function displaySummary(data) {
    const summaryCard = document.getElementById('summaryCard');
    
    // Populate summary
    document.getElementById('summaryBuyers').textContent = 
        data.buyers ? data.buyers.join(', ') : 'Not found';
    
    document.getElementById('summaryProperty').textContent = 
        data.property_address || 'Not found';
    
    document.getElementById('summaryType').textContent = 
        data.purchase_type || 'Not found';
    
    // Display price based on type
    let amount = 'Not found';
    if (data.purchase_type === 'CASH' && data.cash_amount) {
        amount = `$${data.cash_amount.toLocaleString()} (Cash)`;
    } else if (data.purchase_price) {
        amount = `$${data.purchase_price.toLocaleString()}`;
    }
    document.getElementById('summaryAmount').textContent = amount;
    
    summaryCard.style.display = 'block';
}

function displayGroupedFields(data) {
    // Property fields
    displayFieldGroup('propertyFields', fieldGroups.property, data);
    
    // Financial fields
    displayFieldGroup('financialFields', fieldGroups.financial, data);
    
    // Terms fields
    displayFieldGroup('termsFields', fieldGroups.terms, data);
    
    // Dates fields
    displayFieldGroup('datesFields', fieldGroups.dates, data);
    
    // Para 13 fields (special)
    displayFieldGroup('para13Fields', fieldGroups.para13, data);
    
    // Agent fields - show if container exists
    const agentContainer = document.getElementById('agentFields');
    if (agentContainer) {
        displayFieldGroup('agentFields', fieldGroups.agent, data);
    }
}

function displayFieldGroup(containerId, fields, data) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    fields.forEach(field => {
        const value = data[field.key];
        const displayValue = formatFieldValue(value);
        const hasValue = value !== null && value !== undefined && value !== '';
        
        const row = document.createElement('tr');
        row.className = hasValue ? '' : 'empty-field';
        row.innerHTML = `
            <td class="field-label">${field.label}</td>
            <td class="field-value">${displayValue}</td>
        `;
        container.appendChild(row);
    });
}

function displayAllFields(data) {
    const tbody = document.getElementById('allFieldsBody');
    tbody.innerHTML = '';
    
    // Combine all field groups
    const allFields = [
        ...fieldGroups.property,
        ...fieldGroups.financial,
        ...fieldGroups.terms,
        ...fieldGroups.dates,
        ...fieldGroups.para13,
        { key: 'additional_terms', label: 'Additional Terms (Para 32)' },
        { key: 'para37_option', label: 'Para 37 Option' },
        { key: 'serial_number', label: 'Serial Number' }
    ];
    
    allFields.forEach(field => {
        const value = data[field.key];
        const displayValue = formatFieldValue(value);
        const hasValue = value !== null && value !== undefined && value !== '';
        
        const row = document.createElement('tr');
        row.className = hasValue ? '' : 'empty-field';
        row.innerHTML = `
            <td>${field.label}</td>
            <td>${displayValue}</td>
            <td><span class="status-badge ${hasValue ? 'status-filled' : 'status-empty'}">
                ${hasValue ? '✓' : '-'}
            </span></td>
        `;
        tbody.appendChild(row);
    });
}

function formatFieldValue(value) {
    if (value === null || value === undefined || value === '') {
        return '<span class="empty">-</span>';
    }
    if (Array.isArray(value)) {
        return value.join(', ');
    }
    if (typeof value === 'number' && value > 1000) {
        return `$${value.toLocaleString()}`;
    }
    return value;
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const viewMap = {
        'grouped': 'groupedView',
        'all': 'allView',
        'json': 'jsonView',
        'csv': 'csvView'
    };
    
    document.getElementById(viewMap[tabName]).classList.add('active');
}

function generateCSV(data) {
    const headers = Object.keys(data);
    const values = Object.values(data).map(v => {
        if (v === null || v === undefined) return '';
        if (Array.isArray(v)) return v.join('; ');
        return String(v);
    });
    
    return headers.join(',') + '\n' + values.map(v => `"${v}"`).join(',');
}

function downloadJSON() {
    if (!currentData) return;
    
    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFilename.replace('.pdf', '')}_extraction.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function downloadCSV() {
    if (!currentData) return;
    
    const csv = document.getElementById('csvContent').textContent;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFilename.replace('.pdf', '')}_extraction.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('error').style.display = 'block';
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

function hideResults() {
    document.getElementById('results').style.display = 'none';
    document.getElementById('summaryCard').style.display = 'none';
}

function resetUpload() {
    hideError();
    hideResults();
    document.getElementById('fileInput').value = '';
    document.getElementById('fileList').innerHTML = '';
}