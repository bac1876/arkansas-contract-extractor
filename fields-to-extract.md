# Arkansas Real Estate Contract - Fields to Extract

## Priority 1 - Essential Fields

### Parties Information
- **Buyer Name(s)**: Full legal names of all buyers
- **Seller Name(s)**: Full legal names of all sellers
- **Buyer Address**: Current address of buyers
- **Seller Address**: Current address of sellers

### Property Information
- **Property Address**: Complete street address including city, state, ZIP
- **Legal Description**: Legal description from contract
- **County**: County where property is located
- **Parcel Number**: Tax parcel/assessment number

### Financial Terms
- **Purchase Price**: Total purchase price in dollars
- **Earnest Money Amount**: Earnest money deposit amount
- **Earnest Money Holder**: Who holds the earnest money (broker, title company, etc.)
- **Down Payment**: Down payment amount if financing
- **Loan Amount**: Amount to be financed

### Important Dates
- **Contract Date**: Date contract was executed
- **Closing Date**: Scheduled closing/settlement date
- **Possession Date**: When buyer takes possession
- **Inspection Deadline**: Last day for inspection contingency
- **Financing Deadline**: Last day for financing contingency

### Contingencies
- **Inspection Contingency**: Yes/No and deadline
- **Financing Contingency**: Yes/No, type (FHA, VA, Conventional, Cash)
- **Appraisal Contingency**: Yes/No and minimum appraisal amount
- **Sale of Buyer's Property**: Yes/No and property address if applicable

## Priority 2 - Important Fields

### Agent/Broker Information
- **Listing Agent Name**: Name and license number
- **Listing Broker**: Brokerage name
- **Selling Agent Name**: Name and license number
- **Selling Broker**: Brokerage name

### Property Details
- **Property Type**: Single Family, Condo, Townhouse, Land, etc.
- **Year Built**: Year property was constructed
- **Square Footage**: Total heated square footage
- **Lot Size**: Size of lot (acres or sq ft)

### Included Items
- **Appliances Included**: List of appliances staying with property
- **Fixtures Included**: List of fixtures included
- **Exclusions**: Items specifically excluded from sale

### Additional Terms
- **Home Warranty**: Yes/No, provider, and who pays
- **Seller Concessions**: Amount of any seller concessions
- **HOA Information**: HOA dues amount and frequency
- **Special Stipulations**: Any special terms or conditions

## Priority 3 - Additional Fields

### Closing Details
- **Title Company**: Name of title/escrow company
- **Closing Location**: Where closing will occur
- **Prorations**: How taxes/insurance will be prorated

### Disclosures
- **Lead Paint Disclosure**: Required for homes built before 1978
- **Property Disclosure**: Seller's property disclosure provided Yes/No
- **Other Disclosures**: Any other required disclosures

## Output Format Requirements

1. **JSON Format**: All fields in structured JSON
2. **Confidence Score**: Include confidence level for each extracted field (0-100)
3. **Source Reference**: Page number where information was found
4. **Missing Fields List**: List of fields that couldn't be extracted
5. **Validation Warnings**: Any data that seems incorrect or inconsistent

## Example Output Structure

```json
{
  "extraction_metadata": {
    "document_name": "sample_contract.pdf",
    "extraction_date": "2024-01-15",
    "pages_processed": 12,
    "overall_confidence": 85
  },
  "parties": {
    "buyers": [
      {
        "name": "John Doe",
        "address": "123 Main St, Little Rock, AR 72201",
        "confidence": 95,
        "source_page": 1
      }
    ],
    "sellers": [
      {
        "name": "Jane Smith",
        "address": "456 Oak Ave, Conway, AR 72032",
        "confidence": 95,
        "source_page": 1
      }
    ]
  },
  "property": {
    "address": {
      "street": "789 Pine Street",
      "city": "Bentonville",
      "state": "AR",
      "zip": "72712",
      "confidence": 100,
      "source_page": 1
    },
    "legal_description": "Lot 5, Block 2, Oakwood Subdivision",
    "county": "Benton",
    "parcel_number": "12-34567-890"
  },
  "financial": {
    "purchase_price": {
      "value": 350000,
      "confidence": 100,
      "source_page": 2
    },
    "earnest_money": {
      "amount": 3500,
      "holder": "ABC Title Company",
      "confidence": 95,
      "source_page": 2
    }
  },
  "dates": {
    "contract_date": "2024-01-10",
    "closing_date": "2024-02-15",
    "possession_date": "2024-02-15",
    "inspection_deadline": "2024-01-20"
  },
  "validation": {
    "warnings": [],
    "missing_fields": ["HOA information"],
    "inconsistencies": []
  }
}
```