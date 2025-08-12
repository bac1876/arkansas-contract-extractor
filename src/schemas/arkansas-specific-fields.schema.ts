/**
 * Arkansas Real Estate Contract - Specific Fields Schema
 * Based on the standard Arkansas Real Estate Commission contract form
 * These map to specific paragraph numbers and checkboxes in the contract
 */

export interface ArkansasContractFields {
  // Paragraph 1 - Parties
  paragraph1_parties: {
    raw_text: string;
    buyer_names?: string[];
    property_address?: string;
    confidence: number;
  };

  // Paragraph 3 - Purchase Price
  paragraph3_purchase_price: {
    amount: number | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 3 - Loan Type
  paragraph3_loan_type: {
    type: 'FHA' | 'VA' | 'Conventional' | 'Cash' | 'Other' | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 5 - Fill-in blanks data
  paragraph5_blanks: {
    all_filled_data: string[];
    raw_text: string;
    confidence: number;
  };

  // Paragraph 7 - Earnest Money
  paragraph7_earnest_money: {
    has_earnest_money: boolean;
    amount?: number;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 8 - Non-refundable Deposit
  paragraph8_nonrefundable: {
    is_nonrefundable: boolean;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 10 - Title Insurance
  paragraph10_title: {
    selected_option: 'A' | 'B' | 'C' | null;
    description: string;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 11 - Survey
  paragraph11_survey: {
    survey_required: boolean;
    who_pays: 'Buyer' | 'Seller' | 'Split' | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 13 - Fill-in section
  paragraph13_custom: {
    filled_text: string | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 14 - Contingency
  paragraph14_contingency: {
    has_contingency: boolean;
    type?: string;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 15 - Home Warranty
  paragraph15_warranty: {
    has_warranty: boolean;
    checkbox_b_selected: boolean;
    checkbox_b_data?: string;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 16 - Checkbox selection
  paragraph16_checkbox: {
    selected_option: 'A' | 'B' | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 18 - Checkbox selection
  paragraph18_checkbox: {
    selected_option: string | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 19 - Checkbox selection
  paragraph19_checkbox: {
    selected_option: string | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 20 - Checkbox selection
  paragraph20_checkbox: {
    selected_option: string | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 22 - Date
  paragraph22_date: {
    date: string | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 23 - Possession
  paragraph23_possession: {
    selected_option: string | null;
    details?: string;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 32 - Fill-in section
  paragraph32_custom: {
    filled_text: string | null;
    has_data: boolean;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 37 - Checkbox selection
  paragraph37_checkbox: {
    selected_option: string | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 38 - Date
  paragraph38_date: {
    date: string | null;
    raw_text: string;
    confidence: number;
  };

  // Paragraph 39 - Contract Serial Number
  paragraph39_serial: {
    serial_number: string | null;
    raw_text: string;
    confidence: number;
  };

  // Metadata
  extraction_metadata: {
    document_name: string;
    extraction_date: string;
    total_pages: number;
    extraction_method: string;
    overall_confidence: number;
    missing_fields: string[];
    warnings: string[];
  };
}

// Helper type for checkbox options
export type CheckboxOption = 'A' | 'B' | 'C' | 'D' | null;

// Validation rules for Arkansas contracts
export const FieldValidation = {
  purchase_price: {
    min: 1000,
    max: 100000000
  },
  earnest_money: {
    typical_percentage: 0.01, // 1% of purchase price
    min: 100
  },
  dates: {
    format: 'MM/DD/YYYY'
  }
};

// Field extraction hints for the AI
export const ExtractionHints = {
  paragraph1: "Look for 'PARTIES' section with buyer names and property address",
  paragraph3: "Find 'PURCHASE PRICE' section with dollar amount and loan type checkboxes",
  paragraph5: "Extract ALL filled-in blanks/data from paragraph 5",
  paragraph7: "Look for 'EARNEST MONEY' with yes/no and amount",
  paragraph8: "Check for 'NON-REFUNDABLE' deposit indication",
  paragraph10: "Find 'TITLE INSURANCE' with options A, B, or C checked",
  paragraph11: "Look for 'SURVEY' section with payment responsibility checkboxes",
  paragraph13: "Extract any handwritten or typed custom text in fill-in section",
  paragraph14: "Find 'CONTINGENCY' with yes/no indication",
  paragraph15: "Look for 'HOME WARRANTY' with yes/no and checkbox B details",
  paragraph16: "Identify which checkbox (A or B) is selected",
  paragraph18: "Identify selected checkbox option",
  paragraph19: "Identify selected checkbox option",
  paragraph20: "Identify selected checkbox option",
  paragraph22: "Extract the date entered in this paragraph",
  paragraph23: "Find 'POSSESSION' section with checkbox selection",
  paragraph32: "Extract any custom text in the fill-in section if present",
  paragraph37: "Identify selected checkbox option",
  paragraph38: "Extract the date from this paragraph",
  paragraph39: "Find the contract serial/reference number"
};